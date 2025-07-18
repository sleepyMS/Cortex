# file: backend/app/utils.py

from passlib.context import CryptContext
import secrets
import string

# 암호화 컨텍스트 생성 (bcrypt 알고리즘 사용)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def generate_random_password(length: int = 12) -> str:
    """
    임시 랜덤 비밀번호를 생성합니다.
    """
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(characters) for i in range(length))
    return password