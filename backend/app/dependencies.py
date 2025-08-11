# file: backend/app/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from .database import get_db, SessionLocal
from . import models, schemas, security
import os
from datetime import datetime, timedelta
from typing import Annotated, Generator, Optional
from typing import Type, TypeVar
from .database import Base
import uuid

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


# 소유권 검증 의존성을 생성하는 팩토리 함수
ModelType = TypeVar("ModelType", bound=Base)

def get_verified_strategy(
    strategy_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
) -> models.Strategy:
    """ID로 전략을 조회하고, 현재 사용자가 소유주(author)인지 검증합니다."""
    strategy = db.query(models.Strategy).filter(models.Strategy.id == strategy_id).first()
    if not strategy:
        raise HTTPException(status_code=404, detail="전략을 찾을 수 없습니다.")
    if strategy.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="이 리소스에 접근할 권한이 없습니다.")
    return strategy

def get_verified_backtest(
    backtest_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
) -> models.Backtest:
    """ID로 백테스트를 조회하고, 현재 사용자가 소유주(user)인지 검증합니다."""
    backtest = db.query(models.Backtest).filter(models.Backtest.id == backtest_id).first()
    if not backtest:
        raise HTTPException(status_code=404, detail="백테스트를 찾을 수 없습니다.")
    if backtest.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="이 리소스에 접근할 권한이 없습니다.")
    return backtest

def get_verified_api_key(
    api_key_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
) -> models.ApiKey:
    """ID로 API 키를 조회하고, 현재 사용자가 소유주인지 검증합니다."""
    api_key = db.query(models.ApiKey).filter(models.ApiKey.id == api_key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API 키를 찾을 수 없습니다.")
    if api_key.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="이 리소스에 접근할 권한이 없습니다.")
    return api_key

def get_verified_live_bot(
    live_bot_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
) -> models.LiveBot:
    """ID로 자동매매 봇을 조회하고, 현재 사용자가 소유주인지 검증합니다."""
    live_bot = db.query(models.LiveBot).filter(models.LiveBot.id == live_bot_id).first()
    if not live_bot:
        raise HTTPException(status_code=404, detail="자동매매 봇을 찾을 수 없습니다.")
    if live_bot.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="이 리소스에 접근할 권한이 없습니다.")
    return live_bot

###################### 게시물 관리 권환 확인 ######################
# def get_verified_community_post(
#     community_post_id: uuid.UUID,
#     db: Session = Depends(get_db),
#     current_user: models.User = Depends(get_current_active_user)
# ) -> models.CommunityPost:
#     """ID로 커뮤니티 게시글을 조회하고, 현재 사용자가 소유주(author)인지 검증합니다."""
#     post = db.query(models.CommunityPost).filter(models.CommunityPost.id == community_post_id).first()
#     if not post:
#         raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다.")
#     if post.author_id != current_user.id:
#         raise HTTPException(status_code=403, detail="이 리소스에 접근할 권한이 없습니다.")
#     return post

def get_viewable_post(
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(security.get_current_user) # 비로그인 유저도 허용
) -> models.CommunityPost:
    """
    게시물을 조회할 권한이 있는지 (공개 게시물, 또는 비공개라도 소유주/관리자) 검증합니다.
    """
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시물을 찾을 수 없습니다.")

    # 공개 게시물이면 누구나 통과
    if post.is_public:
        return post

    # 비공개 게시물일 경우, 로그인 상태이고 소유주이거나 관리자인지 확인
    if not current_user or (post.author_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="이 게시물을 조회할 권한이 없습니다.")
    
    return post

def get_post_for_modification(
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
) -> models.CommunityPost:
    """게시물을 수정/삭제할 권한이 있는지 (소유주 또는 관리자) 검증합니다."""
    post = db.query(models.CommunityPost).filter(models.CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시물을 찾을 수 없습니다.")
    
    # 소유주가 아니고 관리자도 아니면, 403 에러 발생
    if post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="이 게시물을 수정/삭제할 권한이 없습니다.")
    
    return post

def get_comment_for_modification(
    comment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
) -> models.Comment:
    """댓글을 수정/삭제할 권한이 있는지 (소유주 또는 관리자) 검증합니다."""
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
        
    # 소유주가 아니고 관리자도 아니면, 403 에러 발생
    if comment.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="이 댓글을 수정/삭제할 권한이 없습니다.")
        
    return comment
###################### 게시물 관리 권환 확인 끝 ######################

def get_verified_comment(
    comment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
) -> models.Comment:
    """ID로 댓글을 조회하고, 현재 사용자가 소유주(author)인지 검증합니다."""
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="이 리소스에 접근할 권한이 없습니다.")
    return comment
