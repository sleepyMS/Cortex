# file: backend/app/security.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import os
import logging

from . import models, schemas
from .database import get_db
from passlib.hash import bcrypt

# passlib에서 비밀번호/토큰 해싱/검증을 위한 CryptContext 임포트
from passlib.context import CryptContext
# 👈 암호화/복호화를 위한 cryptography 라이브러리 임포트
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64


logger = logging.getLogger(__name__)

# --- 비밀번호 해싱 설정 (Passlib Bcrypt) ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        logger.error("Attempted to verify password with malformed hash.", exc_info=True)
        return False

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def generate_random_password(length: int = 12) -> str:
    import secrets
    import string
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(characters) for i in range(length))
    return password

# 리프레시/인증 토큰 비밀 부분 해싱/검증 함수
def hash_refresh_token_secret(plain_secret: str) -> str:
    return bcrypt.hash(plain_secret)

def verify_refresh_token_secret(plain_secret: str, hashed_secret: str) -> bool:
    try:
        return bcrypt.verify(plain_secret, hashed_secret)
    except ValueError:
        logger.warning("Attempted to verify malformed hashed refresh token secret.")
        return False

# --- JWT 설정 ---
SECRET_KEY = os.getenv("SECRET_KEY", "your_super_secret_jwt_key_that_is_at_least_32_chars_long")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# --- 암호화 키 설정 (Fernet) ---
# 이 키는 `api_key`와 `secret_key`를 암호화하는 데 사용됩니다.
# 운영 환경에서는 이 키를 환경 변수 또는 더 안전한 키 관리 시스템(예: HashiCorp Vault)에서 로드해야 합니다.
# 절대로 소스코드에 하드코딩해서는 안 됩니다.
_ENCRYPTION_MASTER_KEY_ENV = os.getenv("ENCRYPTION_MASTER_KEY", "your_strong_32_char_encryption_key_for_prod")

# PBKDF2를 사용하여 환경 변수로부터 강력한 대칭 키 파생
# 실제 사용 시 salt는 고유한 값으로 저장되어야 하지만, 이 예제에서는 고정 (보안상 좋지 않음)
# 더 안전한 구현을 위해 각 암호화된 값마다 고유한 salt를 사용하고 DB에 함께 저장해야 함.
# 여기서는 편의를 위해 간단화.
_SALT = b"salt_for_cortex_encryption" # 실제 운영에서는 더 길고 랜덤한 salt 사용

def _derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000, # NISTS SP 800-132 권장 반복 횟수 (현재 시점 기준)
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))

# Fernet 인스턴스 생성 (애플리케이션 시작 시 한 번만 생성)
try:
    _FERNET_KEY = _derive_key(_ENCRYPTION_MASTER_KEY_ENV, _SALT)
    fernet = Fernet(_FERNET_KEY)
    logger.info("Encryption key loaded successfully.")
except Exception as e:
    logger.critical(f"Failed to load or derive encryption key: {e}. API key encryption will fail.", exc_info=True)
    fernet = None # 키 로드 실패 시 None으로 설정

def encrypt_data(plain_data: str) -> str:
    """주어진 문자열 데이터를 암호화합니다."""
    if not fernet:
        raise RuntimeError("Encryption service is not initialized. Encryption key missing.")
    return fernet.encrypt(plain_data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    """암호화된 문자열 데이터를 복호화합니다."""
    if not fernet:
        raise RuntimeError("Encryption service is not initialized. Encryption key missing.")
    try:
        return fernet.decrypt(encrypted_data.encode()).decode()
    except Exception as e:
        logger.error(f"Failed to decrypt data: {encrypted_data[:20]}... - {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="데이터 복호화에 실패했습니다. (유효하지 않은 암호화 키 또는 데이터)"
        )

# --- 현재 사용자 가져오기 의존성 함수 ---
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
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
            logger.warning(f"Invalid token payload received: email={email}, type={token_type}")
            raise credentials_exception
        
        token_data = schemas.TokenData(email=email)

    except JWTError as e:
        logger.warning(f"Invalid JWT token or signature: {e}", exc_info=True)
        raise credentials_exception
    except Exception as e:
        logger.error(f"Unexpected error during JWT decoding: {e}", exc_info=True)
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        logger.warning(f"User not found in DB for token email: {token_data.email}")
        raise credentials_exception
    
    return user

async def get_current_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_active:
        logger.warning(f"Inactive user {current_user.email} (ID: {current_user.id}) attempted to access resource.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비활성화된 계정입니다. 관리자에게 문의하세요.")
    return current_user

async def get_current_admin_user(current_user: models.User = Depends(get_current_active_user)) -> models.User:
    if current_user.role != "admin":
        logger.warning(f"Unauthorized access attempt: User {current_user.email} (ID: {current_user.id}) with role '{current_user.role}' attempted admin access.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다."
        )
    return current_user

