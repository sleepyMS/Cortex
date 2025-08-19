# file: backend/app/services/auth_service.py

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import os
import secrets
import uuid
import logging

from .. import models, schemas, security
from ..services.user_service import user_service
from ..services.social_auth_service import social_auth_service
from ..dependencies import create_access_token

logger = logging.getLogger(__name__)

# --- 설정 (Configuration) ---
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

class AuthService:

    async def register_new_user(self, db: AsyncSession, user_create: schemas.UserCreate) -> models.User:
        """신규 사용자를 생성하고 기본 구독을 할당합니다."""
        existing_user = await user_service.get_user_by_email(db, email=user_create.email)
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 사용 중인 이메일입니다.")
        
        # user_service를 통해 사용자 생성
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
        return user

    async def create_and_set_tokens(self, user: models.User, db: AsyncSession) -> tuple[str, str]:
        """새로운 액세스 토큰과 리프레시 토큰을 생성하고 DB에 저장합니다."""
        access_token = create_access_token(data={"sub": user.email, "type": "access"})

        jti = str(uuid.uuid4())
        refresh_token_secret = secrets.token_urlsafe(32)
        hashed_refresh_token_secret = security.hash_refresh_token_secret(refresh_token_secret)
        expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

        new_token_record = models.RefreshToken(
            user_id=user.id, jti=jti, hashed_token=hashed_refresh_token_secret,
            expires_at=expires_at, is_revoked=False
        )
        db.add(new_token_record)
        await db.flush() # 비동기 환경에서는 flush도 await 필요

        plain_refresh_token_for_client = f"{jti}.{refresh_token_secret}"
        return access_token, plain_refresh_token_for_client
    
    async def refresh_tokens(self, db: AsyncSession, plain_token: str) -> tuple[models.User, str, str]:
        """리프레시 토큰을 검증하고 새로운 토큰 쌍을 발급합니다."""
        try:
            jti, secret = plain_token.split('.')
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰 형식입니다.")

        token_record = await user_service.get_refresh_token_by_jti(db, jti)

        if not token_record or token_record.is_revoked or \
           token_record.expires_at < datetime.now(timezone.utc) or \
           not security.verify_refresh_token_secret(secret, token_record.hashed_token):
            
            if token_record and token_record.user_id:
                await user_service.revoke_all_refresh_tokens(db, token_record.user_id)
            
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증에 실패했습니다. 다시 로그인해주세요.")

        token_record.is_revoked = True
        db.add(token_record)

        user = token_record.user
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자 계정이 유효하지 않습니다.")
            
        new_access_token, new_refresh_token = await self.create_and_set_tokens(user, db)
        return user, new_access_token, new_refresh_token
    
    async def process_social_login(self, provider: str, code: str, state: Optional[str], db: AsyncSession) -> tuple[str, str]:
        """소셜 로그인 과정을 처리하고 토큰을 발급합니다."""
        user = await social_auth_service.handle_social_callback(provider, code, state, db)
        
        # 기존 리프레시 토큰 무효화
        await user_service.revoke_all_refresh_tokens(db, user.id)
        
        # 새 토큰 발급
        access_token, refresh_token = await self.create_and_set_tokens(user, db)
        await db.commit()
        return access_token, refresh_token

auth_service = AuthService()