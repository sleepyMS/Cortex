# file: backend/app/security.py

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import os
import logging
from typing import Annotated
import secrets
import string

from . import models, schemas
from .database import get_db
from passlib.context import CryptContext
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

logger = logging.getLogger(__name__)

# --- 비밀번호 해싱 설정 (Passlib Bcrypt) ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """평문 비밀번호와 해싱된 비밀번호를 비교하여 유효성을 검증합니다."""
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (ValueError, TypeError):
        logger.error("Attempted to verify password with malformed hash.", exc_info=False)
        return False

def get_password_hash(password: str) -> str:
    """주어진 비밀번호를 해싱합니다."""
    return pwd_context.hash(password)

def generate_random_password(length: int = 16) -> str:
    """소셜 로그인 사용자를 위한 안전한 랜덤 비밀번호를 생성합니다."""
    characters = string.ascii_letters + string.digits + "!@#$%^&*()"
    password = ''.join(secrets.choice(characters) for i in range(length))
    return password

# [개선] Refresh Token 관련 해싱도 pwd_context를 사용하도록 통합
def hash_refresh_token_secret(plain_secret: str) -> str:
    """리프레시 토큰의 비밀 부분을 해싱합니다."""
    return pwd_context.hash(plain_secret)

def verify_refresh_token_secret(plain_secret: str, hashed_secret: str) -> bool:
    """평문 비밀 부분과 해싱된 비밀 부분을 비교합니다."""
    try:
        return pwd_context.verify(plain_secret, hashed_secret)
    except (ValueError, TypeError):
        logger.warning("Attempted to verify malformed hashed refresh token secret.")
        return False

# --- JWT 설정 ---
SECRET_KEY = os.getenv("SECRET_KEY", "your_super_secret_jwt_key_that_is_at_least_32_chars_long")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# --- 암호화 키 설정 (Fernet) ---
_ENCRYPTION_MASTER_KEY_ENV = os.getenv("ENCRYPTION_MASTER_KEY")
# [개선] Salt 값을 환경 변수에서 불러옵니다.
_ENCRYPTION_SALT_ENV = os.getenv("ENCRYPTION_SALT")

fernet = None
if not _ENCRYPTION_MASTER_KEY_ENV or not _ENCRYPTION_SALT_ENV:
    logger.critical("ENCRYPTION_MASTER_KEY or ENCRYPTION_SALT environment variable not set. API key encryption will fail.")
else:
    try:
        def _derive_key(password: str, salt: bytes) -> bytes:
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=480000,
            )
            return base64.urlsafe_b64encode(kdf.derive(password.encode()))

        _FERNET_KEY = _derive_key(_ENCRYPTION_MASTER_KEY_ENV, _ENCRYPTION_SALT_ENV.encode())
        fernet = Fernet(_FERNET_KEY)
        logger.info("Encryption key loaded successfully.")
    except Exception as e:
        logger.critical(f"Failed to load or derive encryption key: {e}. API key encryption will fail.", exc_info=True)

def encrypt_data(plain_data: str) -> str:
    """주어진 문자열 데이터를 암호화합니다."""
    if not fernet:
        raise RuntimeError("Encryption service is not initialized. Check encryption keys.")
    return fernet.encrypt(plain_data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    """암호화된 문자열 데이터를 복호화합니다."""
    if not fernet:
        raise RuntimeError("Encryption service is not initialized. Check encryption keys.")
    try:
        return fernet.decrypt(encrypted_data.encode()).decode()
    except Exception:
        logger.error(f"Failed to decrypt data: {encrypted_data[:20]}...", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터 처리 중 오류가 발생했습니다."
        )

# --- 현재 사용자 가져오기 의존성 함수 ---
async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> models.User:
    """
    JWT 토큰을 검증하고 현재 사용자를 반환합니다.
    사용자 기반 속도 제한을 위해 request.state에 user를 저장합니다.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")

        if email is None or token_type != "access":
            raise credentials_exception
        
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    
    # [개선] request.state에 user 객체를 저장하여 사용자 기반 속도 제한 기능이 작동하도록 합니다.
    request.state.user = user
    
    return user

def get_current_active_user(
    current_user: Annotated[models.User, Depends(get_current_user)]
) -> models.User:
    """현재 사용자가 활성 상태인지 확인합니다."""
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비활성화된 계정입니다.")
    return current_user

def get_current_admin_user(
    current_user: Annotated[models.User, Depends(get_current_active_user)]
) -> models.User:
    """현재 사용자가 관리자 권한을 가졌는지 확인합니다."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")
    return current_user