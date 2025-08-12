# file: backend/app/services/auth_service.py

from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta, timezone
import os
import secrets
import uuid
import logging

from passlib.hash import bcrypt

from .. import models, schemas, security

logger = logging.getLogger(__name__)

# --- 설정 (Configuration) ---
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

class AuthService:
    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        """주어진 데이터로 JWT 액세스 토큰을 생성합니다."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    def hash_refresh_token_secret(self, plain_secret: str) -> str:
        """리프레시 토큰의 비밀 부분을 bcrypt로 해싱합니다."""
        return bcrypt.hash(plain_secret)

    def verify_refresh_token_secret(self, plain_secret: str, hashed_secret: str) -> bool:
        """평문 비밀 부분과 해싱된 비밀 부분을 비교하여 유효성을 검증합니다."""
        try:
            return bcrypt.verify(plain_secret, hashed_secret)
        except ValueError:
            logger.warning("Attempted to verify malformed hashed refresh token secret.")
            return False

    def create_and_set_tokens(self, user: models.User, db: Session) -> tuple[str, str]:
        """
        새로운 액세스 토큰과 리프레시 토큰을 생성하고 DB에 저장합니다.
        """
        access_token = self.create_access_token(data={"sub": user.email})

        jti = str(uuid.uuid4())
        refresh_token_secret = secrets.token_urlsafe(32)
        hashed_refresh_token_secret = self.hash_refresh_token_secret(refresh_token_secret)
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

# 서비스 인스턴스 생성
auth_service = AuthService()