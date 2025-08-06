# file: backend/app/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from .database import get_db, SessionLocal
from . import models, schemas
import os
from datetime import datetime, timedelta
from typing import Annotated, Generator, Optional

# OAuth2PasswordBearer: 토큰이 "Bearer {token}" 형식으로 전송되는 것을 기대
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# 환경 변수에서 민감 정보 로드 (프로덕션 환경에서는 필수)
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# 데이터베이스 세션 생성
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# JWT 토큰 생성
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithms=[ALGORITHM])
    return encoded_jwt

# 현재 사용자 가져오기 (비활성 사용자도 포함)
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
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
    
    # 사용자와 구독 정보를 함께 로드하여 N+1 쿼리 방지
    user = (
        db.query(models.User)
        .options(joinedload(models.User.subscription).joinedload(models.Subscription.plan).joinedload(models.Plan.features))
        .filter(models.User.email == token_data.email)
        .first()
    )
    if user is None:
        raise credentials_exception
    
    return user

# 활성 사용자 가져오기 (is_active=True)
def get_current_active_user(current_user: Annotated[models.User, Depends(get_current_user)]) -> models.User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비활성 사용자입니다.")
    return current_user

# 구독 정보를 조회하거나, 없으면 Basic 플랜을 반환하는 의존성
def get_user_subscription(current_user: Annotated[models.User, Depends(get_current_user)], db: Session = Depends(get_db)):
    # 1. 활성 구독 조회
    active_subscription = (
        db.query(models.Subscription)
        .filter(
            models.Subscription.user_id == current_user.id,
            or_(
                models.Subscription.status == 'active',
                models.Subscription.current_period_end > datetime.utcnow(),
            )
        )
        .options(joinedload(models.Subscription.plan).joinedload(models.Plan.features))
        .order_by(models.Subscription.current_period_end.desc())
        .first()
    )

    # 2. 활성 구독이 없으면, 'Basic' 플랜을 반환
    if not active_subscription:
        basic_plan = db.query(models.Plan).filter(models.Plan.plan_type == 'basic').options(joinedload(models.Plan.features)).first()
        if not basic_plan:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Default 'basic' plan not found. System misconfiguration."
            )
        
        # 실제 DB에 없는 가상의 Subscription 객체를 생성하여 반환
        return schemas.SubscriptionSchema(
            id=0,
            user_id=current_user.id,
            plan_id=basic_plan.id,
            status="active",
            current_period_end=None,
            plan=schemas.PlanSchema.model_validate(basic_plan),
        )

    return schemas.SubscriptionSchema.model_validate(active_subscription)

# 특정 역할(예: admin)이 필요한 경우의 의존성 함수
def get_current_active_admin_user(current_user: models.User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")
    return current_user