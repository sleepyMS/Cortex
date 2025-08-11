# file: backend/app/routers/auth.py

from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.orm import Session, joinedload
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from datetime import datetime, timedelta, timezone
import os
import secrets
import uuid # JTI (JWT ID) 생성을 위한 uuid 임포트
import logging

# bcrypt 해싱을 위해 passlib.hash 임포트
from passlib.hash import bcrypt

from .. import schemas, models, security
from ..database import get_db
from ..services.google_oauth import google_oauth_service
from ..services.kakao_oauth import kakao_oauth_service
from ..services.naver_oauth import naver_oauth_service
from ..services import social_auth_service
# 👈 새로 생성된 서비스 임포트
from ..services.verification_service import verification_service
from ..services.password_reset_service import password_reset_service


# --- 로깅 설정 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- 설정 (Configuration) ---
# 실제 운영 시에는 .env 파일 또는 환경 변수 주입 시스템을 통해 안전하게 관리해야 합니다.
# 기본값은 개발용이며, 절대 외부에 노출되어서는 안 됩니다.
SECRET_KEY = os.getenv("SECRET_KEY", "your_super_secret_jwt_key_that_is_at_least_32_chars_long")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
# 👈 프론트엔드 URL (이메일 링크 생성에 필요) - 환경 변수에서 가져오도록 설정
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

router = APIRouter(prefix="/auth", tags=["auth"])


# --- 토큰 생성 및 해싱 헬퍼 함수 (Token Helper Functions) ---

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """주어진 데이터로 JWT 액세스 토큰을 생성합니다."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def hash_refresh_token_secret(plain_secret: str) -> str:
    """리프레시 토큰의 비밀 부분을 bcrypt로 해싱합니다."""
    return bcrypt.hash(plain_secret)

def verify_refresh_token_secret(plain_secret: str, hashed_secret: str) -> bool:
    """평문 비밀 부분과 해싱된 비밀 부분을 비교하여 유효성을 검증합니다."""
    try:
        return bcrypt.verify(plain_secret, hashed_secret)
    except ValueError:
        logger.warning("Attempted to verify malformed hashed refresh token secret.")
        return False

def create_and_set_tokens(user: models.User, db: Session) -> tuple[str, str]:
    """
    새로운 액세스 토큰과 리프레시 토큰을 생성하고 DB에 저장합니다.
    클라이언트에 전달될 리프레시 토큰은 "jti.secret" 형태입니다.
    """
    access_token = create_access_token(data={"sub": user.email})

    jti = str(uuid.uuid4())
    refresh_token_secret = secrets.token_urlsafe(32)
    hashed_refresh_token_secret = hash_refresh_token_secret(refresh_token_secret)

    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    new_token_record = models.RefreshToken(
        user_id=user.id,
        jti=jti,
        hashed_token=hashed_refresh_token_secret,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(new_token_record)

    plain_refresh_token_for_client = f"{jti}.{refresh_token_secret}"
    return access_token, plain_refresh_token_for_client


# --- 로컬 인증 엔드포인트 (Local Authentication) ---

@router.post("/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED, summary="Register a new user")
async def signup(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    새로운 사용자를 생성하고, 기본 'Basic' 플랜을 자동으로 할당한 뒤
    이메일 인증 링크를 발송합니다.
    """
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 사용 중인 이메일입니다.")
    
    hashed_password = security.get_password_hash(user_in.password)
    new_user = models.User(
        email=user_in.email, 
        username=user_in.username, 
        hashed_password=hashed_password,
        is_email_verified=False
    )
    db.add(new_user)
    db.flush()
    db.refresh(new_user)

    # 👈 1. Basic Plan 찾기
    basic_plan = db.query(models.Plan).filter(models.Plan.name == "Basic Plan").first()
    if not basic_plan:
        db.rollback()
        logger.error("Default 'Basic Plan' not found in the database. Cannot create user subscription.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="서버 오류: 기본 플랜 설정이 누락되었습니다.")

    # 👈 2. 새로운 사용자를 위한 구독 정보 생성 및 할당
    new_subscription = models.Subscription(
        user_id=new_user.id,
        plan_id=basic_plan.id,
        status="active",
        current_period_end=datetime.max.replace(tzinfo=timezone.utc)
    )
    db.add(new_subscription)
    
    # 이메일 인증 요청 발송 (비동기)
    try:
        await verification_service.request_email_verification(new_user, db, FRONTEND_BASE_URL)
        db.commit()
        logger.info(f"New user signed up: {new_user.email} with Basic Plan. Verification email sent.")
        
        # 👈 3. 구독 정보까지 로드하여 반환
        user_with_subscription = db.query(models.User).options(
            joinedload(models.User.subscription).joinedload(models.Subscription.plan)
        ).filter(models.User.id == new_user.id).first()
        
        return user_with_subscription

    except HTTPException as e:
        db.rollback()
        logger.error(f"Signup failed for {user_in.email} due to email sending error: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during signup for {user_in.email}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="회원가입 중 서버 오류가 발생했습니다.")



@router.post("/login", response_model=schemas.Token, summary="Log in user and issue tokens")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """이메일과 비밀번호로 로그인하여 토큰을 발급받습니다."""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not user.is_active or not user.hashed_password or not security.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for user: {form_data.username}. Invalid credentials or inactive account.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 정확하지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 👈 이메일 미인증 계정 로그인 방지 (선택 사항)
    # if not user.is_email_verified:
    #     logger.warning(f"Login attempt by unverified email user: {user.email}")
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="이메일 인증이 필요합니다. 이메일을 확인해주세요."
    #     )
    
    # 로그인 성공 시, 해당 유저의 기존 리프레시 토큰들을 모두 무효화 (Refresh Token Rotation)
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user.id,
        models.RefreshToken.is_revoked == False
    ).update({"is_revoked": True})
    
    access_token, refresh_token = create_and_set_tokens(user, db)
    db.commit()
    db.refresh(user)
    logger.info(f"User {user.email} (ID: {user.id}) logged in successfully.")
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@router.post("/refresh", response_model=schemas.Token, summary="Refresh access token using refresh token")
def refresh_access_token(
    refresh_token_data: schemas.RefreshTokenRequest, 
    db: Session = Depends(get_db)
):
    """리프레시 토큰을 사용하여 새로운 액세스 토큰과 리프레시 토큰을 발급받습니다."""
    plain_token_for_client = refresh_token_data.refresh_token
    
    try:
        jti, secret = plain_token_for_client.split('.')
        if not jti or not secret:
            raise ValueError("Invalid refresh token format.")
    except ValueError:
        logger.warning(f"Received malformed refresh token: {plain_token_for_client[:10]}... (IP: {Request.client.host if 'Request' in locals() else 'N/A'})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증에 실패했습니다. 다시 로그인해주세요.",
        )

    token_record = db.query(models.RefreshToken).filter(
        models.RefreshToken.jti == jti
    ).first()

    if not token_record:
        logger.warning(f"Refresh token not found for JTI: {jti} (IP: {Request.client.host if 'Request' in locals() else 'N/A'})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증에 실패했습니다. 다시 로그인해주세요.",
        )

    if token_record.is_revoked or \
       token_record.expires_at < datetime.now(timezone.utc) or \
       not verify_refresh_token_secret(secret, token_record.hashed_token):
        
        logger.warning(f"Invalid/Expired/Revoked refresh token for JTI: {jti}. Revoked: {token_record.is_revoked}, Expired: {token_record.expires_at < datetime.now(timezone.utc)} (IP: {Request.client.host if 'Request' in locals() else 'N/A'})")
        
        if token_record.user_id:
            db.query(models.RefreshToken).filter(
                models.RefreshToken.user_id == token_record.user_id,
                models.RefreshToken.is_revoked == False
            ).update({"is_revoked": True})
            db.commit()
            logger.info(f"All refresh tokens for user {token_record.user_id} revoked due to suspicious refresh attempt.")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증에 실패했습니다. 다시 로그인해주세요.",
        )

    token_record.is_revoked = True
    
    user = token_record.user
    if not user or not user.is_active:
        logger.warning(f"Inactive or missing user for JTI: {jti} (IP: {Request.client.host if 'Request' in locals() else 'N/A'})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자 계정이 유효하지 않습니다. 다시 로그인해주세요.",
        )

    new_access_token, new_plain_refresh_token = create_and_set_tokens(user, db)
    
    db.commit()
    db.refresh(user)
    logger.info(f"Access token refreshed for user: {user.email} (JTI: {jti}).")
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": new_plain_refresh_token,
    }

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Log out user by revoking refresh token")
def logout(refresh_token_data: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    """사용자의 리프레시 토큰을 무효화하여 로그아웃합니다."""
    plain_token_for_client = refresh_token_data.refresh_token
    
    try:
        jti, secret = plain_token_for_client.split('.')
    except ValueError:
        logger.warning(f"Received malformed logout token: {plain_token_for_client[:10]}... (IP: {Request.client.host if 'Request' in locals() else 'N/A'})")
        return # Malformed token에 대해서는 조용히 처리

    token_record = db.query(models.RefreshToken).filter(
        models.RefreshToken.jti == jti
    ).first()

    if token_record and \
       not token_record.is_revoked and \
       token_record.expires_at > datetime.now(timezone.utc) and \
       verify_refresh_token_secret(secret, token_record.hashed_token):
        
        token_record.is_revoked = True
        db.commit()
        logger.info(f"User logged out, JTI revoked: {jti} (User ID: {token_record.user_id}).")
    else:
        logger.info(f"Logout attempt for invalid/revoked token JTI: {jti}. (No action taken).")

    return # 204 No Content는 응답 바디를 포함하지 않음

# --- 소셜 로그인 콜백 엔드포인트 (Social Login Callbacks) ---

PROVIDER_SERVICES = {
    "google": google_oauth_service,
    "kakao": kakao_oauth_service,
    "naver": naver_oauth_service,
}

@router.post("/callback/{provider}", response_model=schemas.Token, summary="Unified OAuth2 Callback")
async def social_login_callback(
    provider: str,
    code_body: schemas.SocialCallbackRequest,
    db: Session = Depends(get_db),
    request: Request = Request # 요청 정보를 로깅하기 위해 Request 객체 주입
):
    """
    모든 소셜 로그인 제공자의 콜백을 동적으로 처리합니다.
    Provider: 'google', 'kakao', 'naver'
    """
    if provider not in PROVIDER_SERVICES:
        logger.warning(f"Unsupported social login provider attempted: {provider} from IP: {request.client.host}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="지원하지 않는 소셜 로그인 제공자입니다.")

    oauth_service = PROVIDER_SERVICES[provider]
    
    try:
        user_profile = await oauth_service.get_user_info(code_body.code, code_body.state)
    except Exception as e:
        logger.error(f"Failed to fetch social profile for {provider} from {request.client.host}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="소셜 프로필 정보를 가져오는 데 실패했습니다.")

    user = social_auth_service.get_or_create_social_user(
        provider=user_profile.provider,
        social_id=user_profile.social_id,
        email=user_profile.email,
        username=user_profile.username,
        db=db,
    )
    
    # 소셜 로그인 시에도 기존 리프레시 토큰 무효화 (Refresh Token Rotation)
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user.id,
        models.RefreshToken.is_revoked == False
    ).update({"is_revoked": True})

    access_token, refresh_token = create_and_set_tokens(user, db)
    db.commit()
    db.refresh(user)
    logger.info(f"User {user.email} (ID: {user.id}) logged in via social provider: {provider}")
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}


# --- 계정 활성화 (이메일 인증) 엔드포인트 ---

@router.post("/request-email-verification", status_code=status.HTTP_202_ACCEPTED, summary="Request email verification link")
async def request_email_verification(
    request_data: schemas.EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    사용자 이메일로 계정 활성화(이메일 인증) 링크를 발송합니다.
    이메일이 존재하지 않더라도 동일한 응답을 반환하여 사용자 존재 여부를 노출하지 않습니다.
    """
    user = db.query(models.User).filter(models.User.email == request_data.email).first()
    
    if not user:
        logger.info(f"Email verification requested for non-existent email: {request_data.email}. Returning 202 Accepted anyway for security.")
        # 보안을 위해 이메일이 등록되지 않았더라도 사용자에게 성공적인 응답을 반환
        return {"message": "이메일이 전송되었습니다. 받은 편지함을 확인해주세요."}
    
    if user.is_email_verified:
        logger.info(f"Email {user.email} (ID: {user.id}) is already verified. Skipping sending verification email.")
        return {"message": "이메일이 이미 인증되었습니다."}

    try:
        await verification_service.request_email_verification(user, db, FRONTEND_BASE_URL)
        db.commit() # 토큰 저장 및 사용자 업데이트(is_email_verified=False) 커밋
        logger.info(f"Verification email successfully requested for user: {user.email}")
        return {"message": "이메일이 전송되었습니다. 받은 편지함을 확인해주세요."}
    except HTTPException as e: # 이메일 서비스 등에서 발생한 오류
        db.rollback()
        logger.error(f"Failed to request email verification for {request_data.email}: {e.detail}", exc_info=True)
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while requesting email verification for {request_data.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="이메일 전송 중 서버 오류가 발생했습니다."
        )


@router.post("/verify-email", response_model=schemas.User, summary="Verify user's email with token")
def verify_email(
    request_data: schemas.VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """
    이메일 인증 토큰을 확인하고, 유효한 경우 사용자의 이메일 인증 상태를 활성화합니다.
    """
    try:
        user = verification_service.verify_email(request_data.token, db)
        db.commit() # 사용자 is_email_verified 상태 업데이트 및 토큰 사용 처리 커밋
        db.refresh(user) # 최신 사용자 정보 반영
        logger.info(f"Email verified successfully for user: {user.email}")
        return user
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed email verification attempt for token: {request_data.token[:10]}... - {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred during email verification for token: {request_data.token[:10]}...: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="이메일 인증 중 서버 오류가 발생했습니다."
        )


# --- 비밀번호 재설정 엔드포인트 ---

@router.post("/request-password-reset", status_code=status.HTTP_202_ACCEPTED, summary="Request password reset link")
async def request_password_reset(
    request_data: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    사용자 이메일로 비밀번호 재설정 링크를 발송합니다.
    이메일이 존재하지 않더라도 동일한 응답을 반환하여 사용자 존재 여부를 노출하지 않습니다.
    """
    # password_reset_service에서 이메일 존재 여부를 내부적으로 처리하므로,
    # 여기서는 바로 서비스 호출
    try:
        await password_reset_service.request_password_reset(request_data.email, db, FRONTEND_BASE_URL)
        db.commit() # 토큰 저장 커밋
        logger.info(f"Password reset email successfully requested for: {request_data.email}")
        return {"message": "비밀번호 재설정 이메일이 전송되었습니다. 받은 편지함을 확인해주세요."}
    except HTTPException as e:
        db.rollback()
        logger.error(f"Failed to request password reset for {request_data.email}: {e.detail}", exc_info=True)
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while requesting password reset for {request_data.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="비밀번호 재설정 요청 중 서버 오류가 발생했습니다."
        )

@router.post("/reset-password", response_model=schemas.User, summary="Reset password with token")
def reset_password(
    request_data: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    비밀번호 재설정 토큰을 확인하고, 유효한 경우 사용자의 비밀번호를 새 비밀번호로 업데이트합니다.
    """
    try:
        user = password_reset_service.reset_password(request_data.token, request_data.new_password, db)
        db.commit() # 비밀번호 업데이트 및 토큰 사용 처리 커밋
        db.refresh(user) # 최신 사용자 정보 반영
        logger.info(f"Password successfully reset for user: {user.email}")
        return user
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed password reset attempt for token: {request_data.token[:10]}... - {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred during password reset for token: {request_data.token[:10]}...: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="비밀번호 재설정 중 서버 오류가 발생했습니다."
        )