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
from ..security import get_password_hash

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
    """
    신규 사용자를 생성하고 이메일 인증 이벤트를 발행합니다.

    [개선된 로직]
    1. 사용자가 이미 존재하지만 '미인증' 상태인 경우:
       - 409 오류 대신, 사용자가 새로 입력한 비밀번호와 사용자 이름으로 정보를 갱신합니다.
       - 새로운 인증 토큰을 발급하고 인증 이메일 발송 '이벤트'를 다시 발행합니다.
    2. 사용자가 존재하며 '인증 완료' 상태인 경우:
       - 409 Conflict 오류를 반환합니다.
    3. 신규 사용자인 경우:
       - 사용자를 생성하고 인증 이메일 발송 '이벤트'를 발행합니다.
    """
    
    token_string_for_email: str | None = None
    new_user: models.User | None = None
    
    try:
        # --- 1. 사용자 조회 ---
        existing_user = await user_service.get_user_by_email(db, user_in.email)

        if existing_user:
            # --- 2. 시나리오: 기존 사용자 ---
            
            # [2-1. 인증 완료 사용자]
            if existing_user.is_email_verified:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="이미 이 이메일로 가입된 계정이 존재합니다."
                )
            
            # [2.2. 미인증 사용자 (유령 계정)]
            logger.info(f"미인증 사용자({user_in.email})가 재가입을 시도합니다. 정보를 갱신합니다.")
            
            # (주석 로직 반영) 새로 입력받은 비밀번호로 갱신
            existing_user.hashed_password = get_password_hash(user_in.password)
            
            # (주석 로직 반영) 사용자 이름이 다를 경우, 중복 체크 후 갱신
            if user_in.username and user_in.username != existing_user.username:
                if await user_service.get_user_by_username(db, user_in.username):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="이미 사용 중인 사용자 이름입니다."
                    )
                existing_user.username = user_in.username
            
            db.add(existing_user)
            new_user = existing_user

        else:
            # --- 3. 시나리오: 신규 사용자 ---
            
            # 사용자 이름 중복 확인
            if user_in.username and await user_service.get_user_by_username(db, user_in.username):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="이미 사용 중인 사용자 이름입니다."
                )
            
            # 신규 사용자 생성 (auth_service가 db.add 및 flush 처리)
            new_user = await auth_service.register_new_user(db, user_in)
        
        # --- 4. 공통 로직: 토큰 준비 및 DB 커밋 ---
        
        # 신규 생성이든 미인증 갱신이든, 항상 새 인증 토큰을 준비합니다.
        token_string_for_email = await verification_service.prepare_verification_token(new_user, db)
        
        # 모든 DB 변경사항(사용자 생성/수정, 토큰 생성)을 '단일 트랜잭션'으로 커밋
        await db.commit()

    except IntegrityError as e:
        # (방어 코드) 동시성 문제로 DB 레벨에서 충돌이 발생한 경우
        await db.rollback()
        logger.warning(f"Signup IntegrityError for {user_in.email}: {e}", exc_info=True)
        if "username" in str(e).lower():
                raise HTTPException(status_code=409, detail="이미 사용 중인 사용자 이름입니다.")
        raise HTTPException(status_code=409, detail="이메일 또는 사용자 이름이 이미 사용 중입니다. 다시 시도해주세요.")
    
    except HTTPException as e:
        # 코드 내에서 의도적으로 발생시킨 HTTPException (e.g., 409)
        await db.rollback()
        raise e
        
    except Exception as e:
        # 그 외 모든 예외 (e.g., DB 연결 실패)
        await db.rollback()
        logger.error(f"Database error during signup for {user_in.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="회원가입 중 서버 오류가 발생했습니다.")
    
    # --- 5. (이벤트 기반) 이메일 발송 이벤트 발행 ---
    # DB 트랜잭션이 성공적으로 완료된 후에만 실행됩니다.
    
    if new_user and token_string_for_email:
        publish_event(
            "user.needs_verification", 
            {
                "user_id": str(new_user.id), 
                "email": new_user.email,
                "username": new_user.username,
                "token_string": token_string_for_email,
                "base_url": settings.APP.FRONTEND_BASE_URL
            }
        )
        
    # 이메일 발송을 기다리지 않고, 즉시 사용자 정보 반환
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