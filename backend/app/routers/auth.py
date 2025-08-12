# file: backend/app/routers/auth.py

from fastapi import APIRouter, HTTPException, Depends, status, Request # 👈 Request 추가
from sqlalchemy.orm import Session, joinedload
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from datetime import datetime, timedelta, timezone
import os
import secrets
import uuid
import logging

from passlib.hash import bcrypt

from .. import schemas, models, security
from ..models import PlanType
from ..database import get_db
from ..services.google_oauth import google_oauth_service
from ..services.kakao_oauth import kakao_oauth_service
from ..services.naver_oauth import naver_oauth_service
from ..services import social_auth_service
from ..services.verification_service import verification_service
from ..services.password_reset_service import password_reset_service
from ..services.auth_service import auth_service
from ..limiter import limiter


logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- 설정 (Configuration) ---
SECRET_KEY = os.getenv("SECRET_KEY", "your_super_secret_jwt_key_that_is_at_least_32_chars_long")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

router = APIRouter(prefix="/auth", tags=["auth"])



# --- 로컬 인증 엔드포인트 (Local Authentication) ---

@router.post("/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED, summary="Register a new user")
@limiter.limit("10/hour") # 👈 [추가] 시간당 10회로 가입 시도 제한
async def signup(
    request: Request, # 👈 [추가] limiter가 IP를 인식하기 위해 필요
    user_in: schemas.UserCreate, 
    db: Session = Depends(get_db)
):
    """
    새로운 사용자를 생성하고, 기본 'Basic' 플랜을 할당한 뒤 이메일 인증 링크를 발송합니다.
    (IP 기준, 시간당 10회 시도 제한)
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

    basic_plan = db.query(models.Plan).filter(models.Plan.name == PlanType.BASIC).first()
    if not basic_plan:
        db.rollback()
        logger.error("Default 'Basic Plan' not found. Cannot create user subscription.")
        raise HTTPException(status_code=500, detail="서버 오류: 기본 플랜 설정이 누락되었습니다.")

    new_subscription = models.Subscription(
        user_id=new_user.id,
        plan_id=basic_plan.id,
        status="active",
        current_period_end=datetime.max.replace(tzinfo=timezone.utc)
    )
    db.add(new_subscription)
    
    try:
        await verification_service.request_email_verification(new_user, db, FRONTEND_BASE_URL)
        db.commit()
        logger.info(f"New user signed up: {new_user.email} with Basic Plan. Verification email sent.")
        
        user_with_subscription = db.query(models.User).options(
            joinedload(models.User.subscription).joinedload(models.Subscription.plan)
        ).filter(models.User.id == new_user.id).first()
        
        return user_with_subscription

    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Unexpected error during signup for {user_in.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="회원가입 중 서버 오류가 발생했습니다.")

@router.post("/login", response_model=schemas.Token, summary="Log in user and issue tokens")
@limiter.limit("5/minute")
def login(
    request: Request, 
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """
    이메일과 비밀번호로 로그인하여 토큰을 발급받습니다.
    (IP 기준, 분당 5회 시도 제한)
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not user.is_active or not user.hashed_password or not security.verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Failed login attempt for user: {form_data.username}. Invalid credentials or inactive account.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 정확하지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user.id,
        models.RefreshToken.is_revoked == False
    ).update({"is_revoked": True})
    
    access_token, refresh_token = auth_service.create_and_set_tokens(user, db)
    db.commit()
    db.refresh(user)
    logger.info(f"User {user.email} (ID: {user.id}) logged in successfully.")
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@router.post("/refresh", response_model=schemas.Token, summary="Refresh access token using refresh token")
def refresh_access_token(
    request: Request, # 👈 [개선] 로깅을 위해 Request 객체 주입
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
        logger.warning(f"Received malformed refresh token: {plain_token_for_client[:10]}... (IP: {request.client.host})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증에 실패했습니다. 다시 로그인해주세요.",
        )

    token_record = db.query(models.RefreshToken).filter(
        models.RefreshToken.jti == jti
    ).first()

    if not token_record:
        logger.warning(f"Refresh token not found for JTI: {jti} (IP: {request.client.host})")
        raise HTTPException(status_code=401, detail="인증에 실패했습니다. 다시 로그인해주세요.")

    if token_record.is_revoked or \
       token_record.expires_at < datetime.now(timezone.utc) or \
       not auth_service.verify_refresh_token_secret(secret, token_record.hashed_token):
        
        logger.warning(f"Invalid/Expired/Revoked refresh token for JTI: {jti}. (IP: {request.client.host})")
        
        if token_record.user_id:
            db.query(models.RefreshToken).filter(
                models.RefreshToken.user_id == token_record.user_id,
                models.RefreshToken.is_revoked == False
            ).update({"is_revoked": True})
            db.commit()
            logger.info(f"All refresh tokens for user {token_record.user_id} revoked due to suspicious refresh attempt.")

        raise HTTPException(status_code=401, detail="인증에 실패했습니다. 다시 로그인해주세요.")

    token_record.is_revoked = True
    
    user = token_record.user
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="사용자 계정이 유효하지 않습니다.")

    new_access_token, new_plain_refresh_token = auth_service.create_and_set_tokens(user, db)
    
    db.commit()
    db.refresh(user)
    logger.info(f"Access token refreshed for user: {user.email} (JTI: {jti}).")
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": new_plain_refresh_token,
    }

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Log out user by revoking refresh token")
def logout(
    request: Request, # 👈 [개선] 로깅을 위해 Request 객체 주입
    refresh_token_data: schemas.RefreshTokenRequest, 
    db: Session = Depends(get_db)
):
    """사용자의 리프레시 토큰을 무효화하여 로그아웃합니다."""
    plain_token_for_client = refresh_token_data.refresh_token
    
    try:
        jti, secret = plain_token_for_client.split('.')
    except ValueError:
        logger.warning(f"Received malformed logout token: ... (IP: {request.client.host})")
        return

    token_record = db.query(models.RefreshToken).filter(
        models.RefreshToken.jti == jti
    ).first()

    if token_record and \
       not token_record.is_revoked and \
       token_record.expires_at > datetime.now(timezone.utc) and \
       auth_service.verify_refresh_token_secret(secret, token_record.hashed_token):
        
        token_record.is_revoked = True
        db.commit()
        logger.info(f"User logged out, JTI revoked: {jti} (User ID: {token_record.user_id}).")
    else:
        logger.info(f"Logout attempt for invalid/revoked token JTI: {jti}. (No action taken).")

    return

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
    request: Request = Request
):
    """
    모든 소셜 로그인 제공자의 콜백을 동적으로 처리합니다.
    """
    if provider not in PROVIDER_SERVICES:
        raise HTTPException(status_code=404, detail="지원하지 않는 소셜 로그인 제공자입니다.")

    oauth_service = PROVIDER_SERVICES[provider]
    
    try:
        user_profile = await oauth_service.get_user_info(code_body.code, code_body.state)
    except Exception as e:
        raise HTTPException(status_code=400, detail="소셜 프로필 정보를 가져오는 데 실패했습니다.")

    user = social_auth_service.get_or_create_social_user(
        provider=user_profile.provider,
        social_id=user_profile.social_id,
        email=user_profile.email,
        username=user_profile.username,
        db=db,
    )
    
    db.query(models.RefreshToken).filter(
        models.RefreshToken.user_id == user.id,
        models.RefreshToken.is_revoked == False
    ).update({"is_revoked": True})

    access_token, refresh_token = auth_service.create_and_set_tokens(user, db)
    db.commit()
    db.refresh(user)
    logger.info(f"User {user.email} (ID: {user.id}) logged in via social provider: {provider}")
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}


# --- 계정 활성화 (이메일 인증) 엔드포인트 ---

@router.post("/request-email-verification", status_code=status.HTTP_202_ACCEPTED, summary="Request email verification link")
@limiter.limit("3/10minutes") # 👈 [추가] 10분당 3회로 이메일 발송 요청 제한
async def request_email_verification(
    request: Request, # 👈 [추가] limiter가 IP를 인식하기 위해 필요
    request_data: schemas.EmailVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    사용자 이메일로 계정 활성화 링크를 발송합니다.
    (IP 기준, 10분당 3회 요청 제한)
    """
    user = db.query(models.User).filter(models.User.email == request_data.email).first()
    
    if not user:
        return {"message": "이메일이 전송되었습니다. 받은 편지함을 확인해주세요."}
    
    if user.is_email_verified:
        return {"message": "이메일이 이미 인증되었습니다."}

    try:
        await verification_service.request_email_verification(user, db, FRONTEND_BASE_URL)
        db.commit()
        return {"message": "이메일이 전송되었습니다. 받은 편지함을 확인해주세요."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="이메일 전송 중 서버 오류가 발생했습니다.")


@router.post("/verify-email", response_model=schemas.User, summary="Verify user's email with token")
def verify_email(
    request_data: schemas.VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """이메일 인증 토큰을 확인하고 사용자를 활성화합니다."""
    try:
        user = verification_service.verify_email(request_data.token, db)
        db.commit()
        db.refresh(user)
        return user
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="이메일 인증 중 서버 오류가 발생했습니다.")


# --- 비밀번호 재설정 엔드포인트 ---

@router.post("/request-password-reset", status_code=status.HTTP_202_ACCEPTED, summary="Request password reset link")
@limiter.limit("3/10minutes") # 👈 [추가] 10분당 3회로 비밀번호 재설정 요청 제한
async def request_password_reset(
    request: Request, # 👈 [추가] limiter가 IP를 인식하기 위해 필요
    request_data: schemas.PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    사용자 이메일로 비밀번호 재설정 링크를 발송합니다.
    (IP 기준, 10분당 3회 요청 제한)
    """
    try:
        await password_reset_service.request_password_reset(request_data.email, db, FRONTEND_BASE_URL)
        db.commit()
        return {"message": "비밀번호 재설정 이메일이 전송되었습니다. 받은 편지함을 확인해주세요."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="비밀번호 재설정 요청 중 서버 오류가 발생했습니다.")

@router.post("/reset-password", response_model=schemas.User, summary="Reset password with token")
def reset_password(
    request_data: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """비밀번호 재설정 토큰을 확인하고 비밀번호를 업데이트합니다."""
    try:
        user = password_reset_service.reset_password(request_data.token, request_data.new_password, db)
        db.commit()
        db.refresh(user)
        return user
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="비밀번호 재설정 중 서버 오류가 발생했습니다.")