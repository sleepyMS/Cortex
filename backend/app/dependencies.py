# file: backend/app/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from .database import get_db
from . import models, schemas
import os
from datetime import datetime

# OAuth2PasswordBearer: 토큰이 "Bearer {token}" 형식으로 전송되는 것을 기대
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login") # 로그인 엔드포포인트를 지정

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    
    # 추가: 토큰 만료 시간 확인 (선택 사항, JWT 라이브러리에서 'exp' 클레임으로 자동 처리 가능)
    # exp = payload.get("exp")
    # if exp and datetime.fromtimestamp(exp) < datetime.utcnow():
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="토큰이 만료되었습니다.",
    #         headers={"WWW-Authenticate": "Bearer"},
    #     )

    return user

# 특정 역할(예: admin)이 필요한 경우의 의존성 함수 (선택 사항)
def get_current_active_admin_user(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")
    return current_user