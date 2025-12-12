# file: backend/app/services/auth_service.py

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets
import uuid
import logging

from .. import models, schemas, security  # 'security' 모듈을 직접 임포트
from ..services.user_service import user_service
from ..services.social_auth_service import social_auth_service
# --- (변경) 중앙 설정 객체 임포트 ---
from ..config import settings

logger = logging.getLogger(__name__)

# --- (제거) 파일 상단의 os.getenv() 설정들 ---
# 모든 설정은 settings 객체를 통해 가져옵니다.

class AuthService:

    async def register_new_user(self, db: AsyncSession, user_create: schemas.UserCreate) -> models.User:
        """신규 사용자를 생성하고 기본 구독을 할당합니다."""
        existing_user = await user_service.get_user_by_email(db, email=user_create.email)
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 사용 중인 이메일입니다.")
        
        new_user = await user_service.create_user(db=db, user_create=user_create)
        return new_user

    async def authenticate_user(self, db: AsyncSession, email: str, password: str) -> models.User:
        """사용자를 인증하고, 유효하지 않으면 예외를 발생시킵니다."""
        user = await security.authenticate_user(db, email=email, password=password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 정확하지 않습니다.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비활성화된 계정입니다.")
        
        if not user.is_email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="EMAIL_NOT_VERIFIED" # 프론트에서 구분할 수 있는 에러 코드
            )
            
        return user

    async def create_and_set_tokens(self, user: models.User, db: AsyncSession) -> tuple[str, str]:
        """새로운 액세스 토큰과 리프레시 토큰을 생성하고 DB에 저장합니다."""
        # security 모듈의 함수를 직접 호출
        access_token = security.create_access_token(data={"sub": user.email, "type": "access"})

        jti = str(uuid.uuid4())
        refresh_token_secret = secrets.token_urlsafe(32)

        # hashed_refresh_token_secret = security.get_password_hash(refresh_token_secret) # 해싱 함수 재사용
        # --- 👇 [핵심 수정] 비밀번호용 해시 함수 대신 토큰용 해시 함수를 사용합니다. ---
        hashed_refresh_token_secret = security.hash_refresh_token_secret(refresh_token_secret)
        
        # settings 객체에서 만료 시간 가져오기
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.AUTH.REFRESH_TOKEN_EXPIRE_DAYS)

        new_token_record = models.RefreshToken(
            user_id=user.id, jti=jti, hashed_token=hashed_refresh_token_secret,
            expires_at=expires_at, is_revoked=False
        )
        db.add(new_token_record)
        await db.flush()

        plain_refresh_token_for_client = f"{jti}.{refresh_token_secret}"
        return access_token, plain_refresh_token_for_client
    
    async def refresh_tokens(self, db: AsyncSession, plain_token: str) -> tuple[models.User, str, str]:
        """리프레시 토큰을 검증하고 새로운 토큰 쌍을 발급합니다."""
        try:
            jti, secret = plain_token.split('.')
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰 형식입니다.")

        token_record = await user_service.get_refresh_token_by_jti(db, jti)

        # 상세 검증 및 로깅
        if not token_record:
            logger.warning(f"Refresh token failed: JTI '{jti}' not found in database.")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증에 실패했습니다. 다시 로그인해주세요.")
        
        if token_record.is_revoked:
            logger.warning(f"Refresh token failed: JTI '{jti}' is already revoked. User ID: {token_record.user_id}")
            await user_service.revoke_all_refresh_tokens(db, token_record.user_id)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증에 실패했습니다. 다시 로그인해주세요.")
        
        if token_record.expires_at < datetime.now(timezone.utc):
            logger.warning(f"Refresh token failed: JTI '{jti}' has expired. Expired at: {token_record.expires_at}. User ID: {token_record.user_id}")
            await user_service.revoke_all_refresh_tokens(db, token_record.user_id)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증에 실패했습니다. 다시 로그인해주세요.")
        
        if not security.verify_refresh_token_secret(secret, token_record.hashed_token):
            logger.warning(f"Refresh token failed: Invalid secret for JTI '{jti}'. Possible token tampering. User ID: {token_record.user_id}")
            await user_service.revoke_all_refresh_tokens(db, token_record.user_id)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증에 실패했습니다. 다시 로그인해주세요.")

        token_record.is_revoked = True
        
        user = await db.get(models.User, token_record.user_id) # 명시적으로 user 로드
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자 계정이 유효하지 않습니다.")
            
        new_access_token, new_refresh_token = await self.create_and_set_tokens(user, db)
        return user, new_access_token, new_refresh_token
    
    async def process_social_login(self, provider: str, code: str, state: Optional[str], db: AsyncSession) -> tuple[str, str]:
        """소셜 로그인 과정을 처리하고 토큰을 발급합니다."""
        user = await social_auth_service.handle_social_callback(provider, code, state, db)
        
        await user_service.revoke_all_refresh_tokens(db, user.id)
        
        access_token, refresh_token = await self.create_and_set_tokens(user, db)
        await db.commit()
        return access_token, refresh_token

auth_service = AuthService()