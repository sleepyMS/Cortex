# file: backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
import logging

from .. import schemas
from ..dependencies import get_async_db
from ..services.auth_service import auth_service
from ..services.verification_service import verification_service
from ..services.password_reset_service import password_reset_service
from ..services.user_service import user_service
from ..limiter import limiter
# --- (변경) 중앙 설정 객체 임포트 ---
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- 1. 로컬 인증 엔드포인트 ---

@router.post("/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def signup(
    request: Request,
    user_in: schemas.UserCreate,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """신규 사용자를 생성하고 이메일 인증 링크를 발송합니다."""
    try:
        new_user = await auth_service.register_new_user(db, user_in)
        # (변경) settings 객체에서 프론트엔드 URL 가져오기
        await verification_service.request_email_verification(new_user, db, settings.APP.FRONTEND_BASE_URL)
        await db.commit()
        await db.refresh(new_user)
        return new_user
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error during signup for {user_in.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="회원가입 중 서버 오류가 발생했습니다.")

@router.post("/login", response_model=schemas.Token)
@limiter.limit("20/minute")
async def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """이메일과 비밀번호로 로그인하여 토큰을 발급받습니다."""
    user = await auth_service.authenticate_user(db, email=form_data.username, password=form_data.password)
    access_token, refresh_token = await auth_service.create_and_set_tokens(user, db)
    await db.commit()
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@router.post("/refresh", response_model=schemas.Token)
async def refresh_access_token(
    refresh_token_data: schemas.RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """리프레시 토큰으로 새로운 토큰 쌍을 발급받습니다."""
    user, new_access_token, new_refresh_token = await auth_service.refresh_tokens(db, refresh_token_data.refresh_token)
    await db.commit()
    return {"access_token": new_access_token, "token_type": "bearer", "refresh_token": new_refresh_token}

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    refresh_token_data: schemas.RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """사용자의 리프레시 토큰을 무효화하여 로그아웃합니다."""
    # (변경) auth_service 대신 user_service의 메소드 호출
    await user_service.revoke_refresh_token(db, refresh_token_data.refresh_token)
    await db.commit()
    return

# --- 2. 소셜 로그인 엔드포인트 ---

@router.post("/callback/{provider}", response_model=schemas.Token)
async def social_login_callback(
    provider: str,
    code_body: schemas.SocialCallbackRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """모든 소셜 로그인 제공자의 콜백을 동적으로 처리합니다."""
    # (개선) auth_service의 process_social_login이 모든 로직을 처리하도록 위임
    access_token, refresh_token = await auth_service.process_social_login(
        provider, code_body.code, code_body.state, db
    )
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

# --- 3. 계정 관리 엔드포인트 (인증/비밀번호) ---

@router.post("/request-email-verification", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("3/10minutes")
async def request_email_verification(
    request: Request,
    request_data: schemas.EmailVerificationRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """사용자 이메일로 계정 활성화 링크를 발송합니다."""
    message = await verification_service.request_email_verification_for_email(
        request_data.email, db, settings.APP.FRONTEND_BASE_URL
    )
    await db.commit()
    return {"message": message}

@router.post("/verify-email", response_model=schemas.User)
async def verify_email(
    request_data: schemas.VerifyEmailRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """이메일 인증 토큰을 확인하고 사용자를 활성화합니다."""
    user = await verification_service.verify_email(request_data.token, db)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/request-password-reset", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("3/10minutes")
async def request_password_reset(
    request: Request,
    request_data: schemas.PasswordResetRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """사용자 이메일로 비밀번호 재설정 링크를 발송합니다."""
    await password_reset_service.request_password_reset(
        request_data.email, db, settings.APP.FRONTEND_BASE_URL
    )
    await db.commit()
    return {"message": "비밀번호 재설정 이메일이 전송되었습니다. 받은 편지함을 확인해주세요."}

@router.post("/reset-password", response_model=schemas.User)
async def reset_password(
    request_data: schemas.ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """비밀번호 재설정 토큰을 확인하고 비밀번호를 업데이트합니다."""
    user = await password_reset_service.reset_password(request_data.token, request_data.new_password, db)
    await db.commit()
    await db.refresh(user)
    return user