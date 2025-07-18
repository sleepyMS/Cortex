# file: backend/app/routers/auth.py

from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session # DB 세션 임포트
from .. import schemas, utils, models # schemas, utils, models 임포트
from ..services.oauth import google_oauth # oauth 서비스 import
from fastapi.security import OAuth2PasswordRequestForm # Form 데이터 처리를 위해 import
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import secrets # 리프레시 토큰 생성을 위해 import
from ..database import get_db # get_db 함수 임포트

# --- JWT 설정 ---
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7)) # 리프레시 토큰 만료 기간 (예: 7일)

router = APIRouter(
    prefix="/auth", # 이 파일의 모든 경로는 /auth로 시작
    tags=["auth"],   # API 문서 그룹화
)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 리프레시 토큰 생성 함수
def create_refresh_token():
    return secrets.token_urlsafe(32) # 안전한 URL-safe 문자열 생성

@router.post("/login", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db) # DB 세션 의존성 주입
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    if not user or not utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 정확하지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user.email}
    )
    refresh_token = create_refresh_token()
    
    # 리프레시 토큰을 사용자 객체에 저장하고 DB에 반영
    user.refresh_token = refresh_token
    user.refresh_token_expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@router.post("/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)): # DB 세션 의존성 주입
    existing_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 사용 중인 이메일입니다.")
    
    hashed_password = utils.get_password_hash(user_in.password)
    
    new_user = models.User(
        email=user_in.email,
        hashed_password=hashed_password,
        is_active=True,
        # refresh_token, refresh_token_expires_at는 기본값 (None)으로 둠
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user) # DB에서 생성된 ID 등을 가져옴
    
    print("New user registered:", new_user.email)
    
    return schemas.User.from_orm(new_user) # SQLAlchemy 모델 객체를 Pydantic 스키마로 변환

# --- Refresh Token Endpoints ---
@router.post("/refresh", response_model=schemas.Token)
async def refresh_access_token(refresh_request: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    refresh_token_str = refresh_request.refresh_token

    # 1. 유효한 리프레시 토큰을 가진 사용자 찾기
    user = db.query(models.User).filter(models.User.refresh_token == refresh_token_str).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 리프레시 토큰입니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. 리프레시 토큰 만료 시간 확인
    if user.refresh_token_expires_at and user.refresh_token_expires_at < datetime.utcnow():
        # 만료된 토큰이면 DB에서도 제거
        user.refresh_token = None
        user.refresh_token_expires_at = None
        db.add(user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="리프레시 토큰이 만료되었습니다. 다시 로그인해주세요.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. 새 액세스 토큰 생성
    new_access_token = create_access_token(data={"sub": user.email})
    
    # 선택 사항: 리프레시 토큰 롤링 (보안 강화)
    # new_refresh_token = create_refresh_token()
    # user.refresh_token = new_refresh_token
    # user.refresh_token_expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    # db.add(user)
    # db.commit()
    # db.refresh(user)
    # return {"access_token": new_access_token, "token_type": "bearer", "refresh_token": new_refresh_token}

    return {"access_token": new_access_token, "token_type": "bearer", "refresh_token": refresh_token_str} # 기존 리프레시 토큰 반환


# --- Google OAuth Endpoints ---

@router.get("/google/login", include_in_schema=False)
async def google_login():
    """
    Google 로그인 페이지로 리디렉션합니다.
    프론트엔드에서 이 URL로 사용자를 안내합니다.
    """
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={google_oauth.client_id}&"
        f"redirect_uri={google_oauth.redirect_uri}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile"
    )
    return RedirectResponse(url=auth_url)

@router.get("/google/callback", include_in_schema=False)
async def google_callback(code: str, db: Session = Depends(get_db)): # DB 세션 의존성 주입
    """
    Google에서 인증 후 이리로 리디렉션됩니다.
    받은 코드로 사용자 정보를 가져오고 JWT를 발급합니다.
    """
    try:
        access_token_google = await google_oauth.get_access_token(code)
        user_info = await google_oauth.get_user_info(access_token_google)
        
        # --- Cortex 로그인/회원가입 로직 ---
        user_email = user_info.email

        # 1. DB에서 user_info.email로 사용자 조회
        user = db.query(models.User).filter(models.User.email == user_email).first()
        
        # 2. 사용자가 없으면 새로 생성 (소셜 회원가입)
        if not user:
            # 소셜 로그인은 비밀번호가 필요 없으므로, 임의의 안전한 비밀번호 생성
            random_password = utils.generate_random_password() # utils.py에 이 함수가 있다고 가정
            hashed_password = utils.get_password_hash(random_password)
            
            user = models.User(
                email=user_email,
                hashed_password=hashed_password, # 소셜 로그인 사용자도 일단 비밀번호 필드 가짐
                is_active=True,
                # refresh_token, refresh_token_expires_at는 기본값 (None)으로 둠
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"새로운 소셜 유저 등록: {user_email}")
        
        # 3. Cortex 자체 JWT 토큰 (액세스 + 리프레시) 생성
        cortex_access_token = create_access_token(data={"sub": user.email})
        cortex_refresh_token = create_refresh_token()

        # 4. 리프레시 토큰을 사용자 정보에 저장
        user.refresh_token = cortex_refresh_token
        user.refresh_token_expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        db.add(user)
        db.commit()
        db.refresh(user)

        # 5. JWT 토큰을 담아 프론트엔드로 리디렉션
        frontend_url = (
            f"http://localhost:3000/auth/callback?"
            f"access_token={cortex_access_token}&"
            f"refresh_token={cortex_refresh_token}"
        )
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        # 실패 시 에러 페이지로 리디렉션 또는 에러 메시지 반환
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"로그인에 실패했습니다: {str(e)}")