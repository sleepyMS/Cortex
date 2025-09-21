# file: backend/app/dependencies.py

import uuid
from datetime import datetime, timedelta
from typing import Annotated, Optional, Type, TypeVar, AsyncGenerator

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from .gateways.toss_payments_client import TossPaymentsClient
from .services.plan_service import plan_service

# --- 1. 중앙 설정 및 모듈 임포트 ---
from . import models
from .config import settings  
from .database import AsyncSessionLocal, Base

# OAuth2 스킴 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


# ==============================================================================
# 섹션 1: 데이터베이스 의존성
# ==============================================================================

async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    API 요청 단위의 트랜잭션을 관리하는 DB 세션을 제공합니다.
    - 블록 진입 시 트랜잭션이 시작됩니다.
    - 요청 처리가 성공적으로 완료되면 자동으로 커밋됩니다.
    - 처리 중 예외가 발생하면 자동으로 롤백됩니다.
    - 세션은 블록을 벗어날 때 자동으로 닫힙니다.
    """
    async with AsyncSessionLocal() as session:
        async with session.begin(): # 이 컨텍스트 매니저가 트랜잭션을 전담합니다.
            yield session

# ==============================================================================
# 섹션 2: 인증 및 권한 부여 의존성
# ==============================================================================

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_async_db)]
) -> models.User:
    """JWT 토큰을 검증하고 DB에서 사용자 정보를 조회합니다. (비활성 사용자 포함)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 설정값을 settings 객체에서 가져옵니다.
        payload = jwt.decode(token, settings.AUTH.SECRET_KEY, algorithms=[settings.AUTH.ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    query = (
        select(models.User)
        .options(joinedload(models.User.subscription).joinedload(models.Subscription.plan).joinedload(models.Plan.features))
        .filter(models.User.email == email)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    
    if not user.subscription or not user.subscription.plan:
        basic_plan = await plan_service.get_plan_by_name(db, models.PlanType.BASIC)
        if not basic_plan:
            # Basic 플랜이 DB에 없는 것은 심각한 서버 설정 오류입니다.
            raise HTTPException(status_code=500, detail="서버 기본 설정 오류입니다.")
        
        # 임시 Subscription 객체를 만들어 user 객체에 할당
        user.subscription = models.Subscription(plan=basic_plan, status="active")
    
    return user


def get_current_active_user(
    current_user: Annotated[models.User, Depends(get_current_user)]
) -> models.User:
    """현재 로그인된 사용자가 활성 상태인지 확인합니다."""
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비활성 사용자입니다.")
    return current_user


def get_current_admin_user(
    current_user: Annotated[models.User, Depends(get_current_active_user)]
) -> models.User:
    """현재 사용자가 관리자 권한을 가졌는지 확인합니다."""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다.")
    return current_user

def get_billing_toss_client() -> TossPaymentsClient:
    """자동 결제(빌링)용 Toss Payments 클라이언트 의존성"""
    return TossPaymentsClient(secret_key=settings.PAYMENT.TOSS_BILLING_SECRET_KEY)

def get_widget_toss_client() -> TossPaymentsClient:
    """일반 결제(위젯)용 Toss Payments 클라이언트 의존성"""
    return TossPaymentsClient(secret_key=settings.PAYMENT.TOSS_WIDGET_SECRET_KEY)


# ==============================================================================
# 섹션 3: 소유권 검증 의존성 (Owner Verification)
# ==============================================================================

ModelType = TypeVar("ModelType", bound=Base)

def create_owner_verifier(
    model: Type[ModelType],
    owner_field: str = "user_id"
):
    """
    지정된 모델의 소유권을 검증하는 FastAPI 의존성을 동적으로 생성하는 팩토리 함수.
    경로 파라미터 이름은 '{model_name}_id' 형식으로 가정합니다. (예: strategy_id)
    """
    async def verifier(
        request: Request,
        db: Annotated[AsyncSession, Depends(get_async_db)],
        current_user: Annotated[models.User, Depends(get_current_active_user)],
    ) -> ModelType:
        model_name = model.__name__.lower()
        id_field_name = f"{model_name}_id"
        model_id_str = request.path_params.get(id_field_name)

        if not model_id_str:
            raise HTTPException(status_code=500, detail=f"Path parameter '{id_field_name}' not found.")
        try:
            model_id = uuid.UUID(model_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid UUID format for {id_field_name}.")

        query = select(model).filter(getattr(model, "id") == model_id)
        result = await db.execute(query)
        instance = result.scalar_one_or_none()

        if not instance:
            raise HTTPException(status_code=404, detail=f"{model_name.capitalize()} not found.")
        
        instance_owner_id = getattr(instance, owner_field, None)
        if instance_owner_id != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="이 리소스에 접근할 권한이 없습니다.")
            
        return instance
    return verifier

async def get_current_user_or_none(
    token: Annotated[Optional[str], Depends(oauth2_scheme)], # token을 Optional로 변경
    db: Annotated[AsyncSession, Depends(get_async_db)]
) -> Optional[models.User]:
    """
    JWT 토큰이 제공된 경우에만 사용자를 조회하고, 없거나 유효하지 않으면 None을 반환합니다.
    절대로 HTTPException을 발생시키지 않습니다.
    """
    if not token:
        return None # 토큰이 없으면 즉시 None 반환

    try:
        payload = jwt.decode(token, settings.AUTH.SECRET_KEY, algorithms=[settings.AUTH.ALGORITHM])
        email: Optional[str] = payload.get("sub")
        if not email:
            return None # 페이로드에 이메일이 없으면 None 반환
    except JWTError:
        return None # 토큰이 유효하지 않으면 None 반환

    # Eager Loading을 사용하여 필요한 관계를 한 번에 로드 (성능 최적화)
    query = (
        select(models.User)
        .options(joinedload(models.User.subscription).joinedload(models.Subscription.plan).joinedload(models.Plan.features))
        .filter(models.User.email == email)
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    # 사용자가 DB에 없거나 비활성 상태여도 그냥 None 반환
    if not user or not user.is_active:
        return None
        
    return user

# --- 커뮤니티 관련 소유권 검증 (비동기 전환) ---

async def get_viewable_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: Optional[models.User] = Depends(get_current_user)
) -> models.CommunityPost:
    """게시물을 조회할 권한이 있는지 검증합니다."""
    result = await db.execute(select(models.CommunityPost).filter(models.CommunityPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="게시물을 찾을 수 없습니다.")
    if post.is_public:
        return post
    if not current_user or (post.author_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status_code=403, detail="이 게시물을 조회할 권한이 없습니다.")
    return post

async def get_post_for_modification(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
) -> models.CommunityPost:
    """게시물을 수정/삭제할 권한이 있는지 (소유주 또는 관리자) 검증합니다."""
    # 비동기 쿼리 실행
    result = await db.execute(
        select(models.CommunityPost).filter(models.CommunityPost.id == post_id)
    )
    post = result.scalar_one_or_none()

    if not post:
        raise HTTPException(status_code=404, detail="게시물을 찾을 수 없습니다.")
    
    # 소유주가 아니고 관리자도 아니면, 403 에러 발생
    if post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="이 게시물을 수정/삭제할 권한이 없습니다.")
    
    return post

async def get_comment_for_modification(
    comment_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
) -> models.Comment:
    """댓글을 수정/삭제할 권한이 있는지 (소유주 또는 관리자) 검증합니다."""
    # 비동기 쿼리 실행
    result = await db.execute(
        select(models.Comment).filter(models.Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
        
    # 소유주가 아니고 관리자도 아니면, 403 에러 발생
    if comment.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="이 댓글을 수정/삭제할 권한이 없습니다.")
        
    return comment

async def get_existing_post(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
) -> models.CommunityPost:
    """ID로 게시물을 조회하고, 없으면 404 에러를 발생시킵니다."""
    # 비동기 쿼리 실행
    result = await db.execute(
        select(models.CommunityPost).filter(models.CommunityPost.id == post_id)
    )
    post = result.scalar_one_or_none()
    
    if not post:
        raise HTTPException(status_code=404, detail="댓글을 작성할 게시물을 찾을 수 없습니다.")
    return post

