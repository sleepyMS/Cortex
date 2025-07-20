from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from datetime import datetime, timedelta
import os
import secrets

from .. import schemas, models, security
from ..database import get_db

from ..services.google_oauth import google_oauth_service
from ..services.kakao_oauth import kakao_oauth_service
from ..services.naver_oauth import naver_oauth_service
from ..services import social_auth_service

# --- 설정 (Configuration) ---
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

router = APIRouter(prefix="/auth", tags=["auth"])


# --- 토큰 생성 헬퍼 함수 (Token Helper Functions) ---

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """주어진 데이터로 JWT 액세스 토큰을 생성합니다."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_and_set_tokens(user: models.User, db: Session) -> tuple[str, str]:
    """새로운 액세스 토큰과 리프레시 토큰을 생성하고 DB에 저장합니다."""
    access_token = create_access_token(data={"sub": user.email})
    
    plain_refresh_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    new_token_record = models.RefreshToken(
        user_id=user.id,
        token=plain_refresh_token, # 실제 운영 시에는 이 토큰도 해싱하여 저장하는 것이 더 안전합니다.
        expires_at=expires_at
    )
    db.add(new_token_record)
    db.commit()
    
    return access_token, plain_refresh_token


# --- 로컬 인증 엔드포인트 (Local Authentication) ---

@router.post("/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """새로운 사용자를 생성합니다 (이메일/비밀번호 회원가입)."""
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 사용 중인 이메일입니다.")
    
    hashed_password = security.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email, 
        username=user_in.username, 
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """이메일과 비밀번호로 로그인하여 토큰을 발급받습니다."""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not user.hashed_password or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 정확하지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token, refresh_token = create_and_set_tokens(user, db)
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@router.post("/refresh", response_model=schemas.Token)
def refresh_access_token(
    refresh_token_data: schemas.RefreshTokenRequest, 
    db: Session = Depends(get_db)
):
    """리프레시 토큰을 사용하여 새로운 액세스 토큰과 리프레시 토큰을 발급받습니다."""
    token_str = refresh_token_data.refresh_token
    token_record = db.query(models.RefreshToken).filter(models.RefreshToken.token == token_str).first()

    if not token_record or token_record.is_revoked or token_record.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않거나 만료된 리프레시 토큰입니다. 다시 로그인해주세요.",
        )

    # 기존 토큰 무효화 (Refresh Token Rotation)
    token_record.is_revoked = True
    db.add(token_record)

    user = token_record.user
    new_access_token, new_plain_refresh_token = create_and_set_tokens(user, db)
    
    db.commit()

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": new_plain_refresh_token,
    }

# --- 소셜 로그인 콜백 엔드포인트 (Social Login Callbacks) ---

@router.post("/google/callback", response_model=schemas.Token, summary="Google OAuth2 Callback") # 👈 GET -> POST
async def google_login_callback(code_body: schemas.AuthCode, db: Session = Depends(get_db)): # 👈 쿼리 파라미터 -> 요청 본문
    """프론트엔드에서 받은 Google 인가 코드로 로그인/회원가입 처리 후 JWT를 발급합니다."""
    user_profile = await google_oauth_service.get_user_info(code_body.code)
    
    user = social_auth_service.get_or_create_social_user(
        provider=user_profile.provider,
        social_id=user_profile.social_id,
        email=user_profile.email,
        username=user_profile.username,
        db=db,
    )
    access_token, refresh_token = create_and_set_tokens(user, db)
    
    # 중요: 백엔드가 직접 리디렉션하는 대신, 프론트엔드가 토큰을 받아 처리하도록 JSON 응답을 반환합니다.
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@router.post("/kakao/callback", response_model=schemas.Token, summary="Kakao OAuth2 Callback") # 👈 GET -> POST
async def kakao_login_callback(code_body: schemas.AuthCode, db: Session = Depends(get_db)):
    user_profile = await kakao_oauth_service.get_user_info(code_body.code)
 
    user = social_auth_service.get_or_create_social_user(
        provider=user_profile.provider,
        social_id=user_profile.social_id,
        email=user_profile.email,
        username=user_profile.username,
        db=db,
    )
    access_token, refresh_token = create_and_set_tokens(user, db)
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@router.post("/naver/callback", response_model=schemas.Token, summary="Naver OAuth2 Callback") # 👈 GET -> POST
async def naver_login_callback(code_body: schemas.AuthCodeWithState, db: Session = Depends(get_db)):
    user_profile = await naver_oauth_service.get_user_info(code_body.code, code_body.state)
 
    user = social_auth_service.get_or_create_social_user(
        provider=user_profile.provider,
        social_id=user_profile.social_id,
        email=user_profile.email,
        username=user_profile.username,
        db=db,
    )
    access_token, refresh_token = create_and_set_tokens(user, db)
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}
