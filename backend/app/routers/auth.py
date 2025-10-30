# file: backend/app/routers/auth.py

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
import logging

from .. import schemas, models
from ..dependencies import get_async_db
from ..services.auth_service import auth_service
from ..services.verification_service import verification_service
from ..services.password_reset_service import password_reset_service
from ..services.user_service import user_service
from ..limiter import limiter
from ..config import settings
from ..event_bus import publish_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- 1. 로컬 인증 엔드포인트 ---

@router.post("/signup", response_model=schemas.UserSignupResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def signup(
    request: Request,
    user_in: schemas.UserCreate,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """신규 사용자를 생성하고 이메일 인증 링크를 발송합니다."""

    # 1. 이메일 및 사용자 이름 중복을 사전에 확인합니다.
    if await user_service.get_user_by_email(db, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 이 이메일로 가입된 계정이 존재합니다."
        )
    if await user_service.get_user_by_username(db, user_in.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 사용자 이름입니다."
        )

    token_string_for_email: str | None = None
    new_user: models.User | None = None

    try:
        new_user = await auth_service.register_new_user(db, user_in)
        token_string_for_email = await verification_service.prepare_verification_token(new_user, db)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이메일 또는 사용자 이름이 이미 사용 중입니다. 다시 시도해주세요."
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"Database error during signup for {user_in.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="회원가입 중 서버 오류가 발생했습니다.")
    
    # 이메일 발송 로직
    if new_user and token_string_for_email:
        try:
            await verification_service.send_prepared_verification_email(
                new_user, token_string_for_email, settings.APP.FRONTEND_BASE_URL
            )
        except Exception as e:
            logger.error(
                f"User {new_user.email} was created, but failed to send verification email: {e}",
                exc_info=True
            )
            
    return new_user


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
    
    # 1. 이메일로 사용자를 찾습니다.
    user = await user_service.get_user_by_email(db, request_data.email)

    # 2. 사용자가 없거나 이미 인증된 경우, 실제 작업을 수행하지 않고 성공 메시지를 반환합니다.
    # (이메일 주소의 가입 여부를 알려주지 않기 위한 보안 조치)
    if not user or user.is_email_verified:
        logger.info(f"Verification request for non-existent or already verified user: {request_data.email}")
        return {"message": "인증 이메일이 요청되었습니다. 받은 편지함을 확인해주세요."}
    
    token_string_for_email: str | None = None
    
    # 3. DB 트랜잭션 내에서 토큰을 준비합니다.
    try:
        token_string_for_email = await verification_service.prepare_verification_token(user, db)
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Error preparing verification token for {request_data.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="이메일 인증 준비 중 오류가 발생했습니다.")
        
    # 4. DB 트랜잭션이 성공한 후, 이메일을 발송합니다.
    if token_string_for_email:
        try:
            await verification_service.send_prepared_verification_email(
                user, token_string_for_email, settings.APP.FRONTEND_BASE_URL
            )
        except Exception as e:
            # 이메일 발송 실패는 로깅만 하고, 사용자에게는 성공처럼 응답합니다.
            logger.error(
                f"Failed to resend verification email for {user.email}: {e}",
                exc_info=True
            )

    return {"message": "인증 이메일이 요청되었습니다. 받은 편지함을 확인해주세요."}

@router.post("/verify-email", response_model=schemas.UserSignupResponse)
async def verify_email(
    request_data: schemas.VerifyEmailRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """이메일 인증 토큰을 확인하고 사용자를 활성화합니다."""
    
    # 1. 서비스가 'user' 객체의 상태를 메모리에서 변경 후 반환합니다.
    user = await verification_service.verify_email(request_data.token, db)
    
    # 2. 변경사항을 커밋합니다.
    await db.commit()
    
    # 3. '재조회' 없이, 필요한 최소 정보만 담긴 객체를 바로 반환합니다.
    #    UserSignupResponse 스키마가 관계 필드를 요구하지 않으므로 에러가 발생하지 않습니다.
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

@router.post("/reset-password", response_model=schemas.UserSignupResponse)
async def reset_password(
    request_data: schemas.ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_async_db)]
):
    """비밀번호 재설정 토큰을 확인하고 비밀번호를 업데이트합니다."""
    
    # 1. 서비스가 'user' 객체의 상태를 메모리에서 변경 후 반환합니다.
    user = await password_reset_service.reset_password(
        request_data.token, request_data.new_password, db
    )
    
    # 2. 변경사항을 커밋합니다.
    await db.commit()
    
    # 3. '재조회' 없이, 필요한 최소 정보만 담긴 객체를 바로 반환합니다.
    return user