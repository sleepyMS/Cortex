# file: backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
import logging
import os

from .. import schemas
# ▼▼▼ [수정] 비동기 및 서비스 의존성 임포트 정리 ▼▼▼
from ..dependencies import get_async_db
from ..services.auth_service import auth_service
from ..services.verification_service import verification_service
from ..services.password_reset_service import password_reset_service
from ..services.user_service import user_service
from ..services.social_auth_service import social_auth_service
from ..limiter import limiter
# ▲▲▲ [수정] ▲▲▲

logger = logging.getLogger(__name__)

# --- 설정 (Configuration) ---
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")

router = APIRouter(prefix="/auth", tags=["Authentication"])


# --- 로컬 인증 엔드포인트 ---

@router.post("/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED, summary="Register a new user")
@limiter.limit("10/hour")
async def signup(
    request: Request,
    user_in: schemas.UserCreate, 
    db: AsyncSession = Depends(get_async_db)
):
    """신규 사용자를 생성하고 이메일 인증 링크를 발송합니다."""
    try:
        # auth_service가 내부적으로 user_service를 호출하여 사용자 생성
        new_user = await auth_service.register_new_user(db, user_in)
        
        # 이메일 인증 요청 로직
        await verification_service.request_email_verification(new_user, db, FRONTEND_BASE_URL)
        
        await db.commit()
        await db.refresh(new_user)
        return new_user
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Unexpected error during signup for {user_in.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="회원가입 중 서버 오류가 발생했습니다.")

@router.post("/login", response_model=schemas.Token, summary="Log in user and issue tokens")
@limiter.limit("10/minute") # 로그인 시도는 조금 더 허용
async def login(
    request: Request, 
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()], 
    db: AsyncSession = Depends(get_async_db)
):
    """이메일과 비밀번호로 로그인하여 토큰을 발급받습니다."""
    user = await auth_service.authenticate_user(db, email=form_data.username, password=form_data.password)
    access_token, refresh_token = await auth_service.create_and_set_tokens(user, db)
    await db.commit()
    
    logger.info(f"User {user.email} logged in successfully.")
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@router.post("/refresh", response_model=schemas.Token, summary="Refresh access token")
async def refresh_access_token(
    refresh_token_data: schemas.RefreshTokenRequest, 
    db: AsyncSession = Depends(get_async_db)
):
    """리프레시 토큰으로 새로운 토큰 쌍을 발급받습니다."""
    user, new_access_token, new_refresh_token = await auth_service.refresh_tokens(db, refresh_token_data.refresh_token)
    await db.commit()
    
    logger.info(f"Access token refreshed for user: {user.email}.")
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token,
    }

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Log out user")
async def logout(
    refresh_token_data: schemas.RefreshTokenRequest, 
    db: AsyncSession = Depends(get_async_db)
):
    """사용자의 리프레시 토큰을 무효화하여 로그아웃합니다."""
    await auth_service.revoke_refresh_token(db, refresh_token_data.refresh_token)
    await db.commit()
    return


# --- 소셜 로그인 콜백 엔드포인트 ---

@router.post("/callback/{provider}", response_model=schemas.Token, summary="Unified OAuth2 Callback")
async def social_login_callback(
    provider: str,
    code_body: schemas.SocialCallbackRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """모든 소셜 로그인 제공자의 콜백을 동적으로 처리합니다."""
    access_token, refresh_token = await auth_service.process_social_login(
        provider, code_body.code, code_body.state, db
    )
    # process_social_login 내부에서 commit이 처리됨
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}


# --- 계정 활성화 (이메일 인증) 엔드포인트 ---

@router.post("/request-email-verification", status_code=status.HTTP_202_ACCEPTED, summary="Request email verification link")
@limiter.limit("3/10minutes")
async def request_email_verification(
    request: Request,
    request_data: schemas.EmailVerificationRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """사용자 이메일로 계정 활성화 링크를 발송합니다."""
    message = await verification_service.request_email_verification_for_email(
        request_data.email, db, FRONTEND_BASE_URL
    )
    await db.commit()
    return {"message": message}


@router.post("/verify-email", response_model=schemas.User, summary="Verify user's email with token")
async def verify_email(
    request_data: schemas.VerifyEmailRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """이메일 인증 토큰을 확인하고 사용자를 활성화합니다."""
    user = await verification_service.verify_email(request_data.token, db)
    await db.commit()
    await db.refresh(user)
    return user


# --- 비밀번호 재설정 엔드포인트 ---

@router.post("/request-password-reset", status_code=status.HTTP_202_ACCEPTED, summary="Request password reset link")
@limiter.limit("3/10minutes")
async def request_password_reset(
    request: Request,
    request_data: schemas.PasswordResetRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """사용자 이메일로 비밀번호 재설정 링크를 발송합니다."""
    await password_reset_service.request_password_reset(request_data.email, db, FRONTEND_BASE_URL)
    await db.commit()
    return {"message": "비밀번호 재설정 이메일이 전송되었습니다. 받은 편지함을 확인해주세요."}

@router.post("/reset-password", response_model=schemas.User, summary="Reset password with token")
async def reset_password(
    request_data: schemas.ResetPasswordRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """비밀번호 재설정 토큰을 확인하고 비밀번호를 업데이트합니다."""
    user = await password_reset_service.reset_password(request_data.token, request_data.new_password, db)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/callback/{provider}", response_model=schemas.Token, summary="Unified OAuth2 Callback")
async def social_login_callback(
    provider: str,
    code_body: schemas.SocialCallbackRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    모든 소셜 로그인 제공자(Google, Kakao, Naver 등)의 콜백을 동적으로 처리합니다.
    """
    try:
        # 1. social_auth_service를 호출하여 사용자 정보 가져오기 및 계정 생성/연동
        user = await social_auth_service.handle_social_callback(
            provider, code_body.code, code_body.state, db
        )
        
        # 2. 기존에 유효한 리프레시 토큰이 있다면 모두 무효화
        await user_service.revoke_all_refresh_tokens(db, user.id)
        
        # 3. 새로운 액세스 토큰과 리프레시 토큰 발급
        access_token, refresh_token = await auth_service.create_and_set_tokens(user, db)
        
        # 4. 모든 변경사항을 DB에 커밋
        await db.commit()
        
        logger.info(f"User {user.email} (ID: {user.id}) logged in via social provider: {provider}")
        
        return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}
        
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error during social login callback for provider {provider}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="소셜 로그인 처리 중 서버 오류가 발생했습니다.")