# file: backend/app/routers/users.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid

from .. import schemas, models, security
from ..dependencies import get_current_user, get_async_db, get_current_active_user, get_current_admin_user
from ..services.user_service import user_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

# --- 현재 사용자 정보 엔드포인트 ---

@router.get("/me", response_model=schemas.User, summary="Get current user profile")
async def read_users_me(
    # get_current_user가 비동기로 변경되었으므로, Depends에서 user를 받아옴
    current_user: models.User = Depends(get_current_user)
):
    """
    현재 로그인된 사용자의 프로필 정보와 구독 정보를 함께 반환합니다.
    get_current_user 의존성에서 이미 Eager Loading 되었으므로 추가 쿼리가 필요 없습니다.
    """
    logger.info(f"User {current_user.email} requested their profile.")
    return current_user


@router.put("/me/profile", response_model=schemas.User, summary="Update current user's profile information")
async def update_users_me_profile(
    user_update: schemas.UserUpdateProfile,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """현재 로그인된 사용자의 프로필 정보를 비동기로 업데이트합니다."""
    try:
        updated_user = await user_service.update_user_profile(db, current_user, user_update)
        await db.commit()
        await db.refresh(updated_user)
        logger.info(f"User {current_user.email} successfully updated their profile.")
        return updated_user
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating profile for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="프로필 업데이트 중 서버 오류가 발생했습니다.")


@router.put("/me/password", response_model=schemas.User, summary="Update current user's password")
async def update_users_me_password(
    password_update: schemas.UserUpdatePassword,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """현재 로그인된 사용자의 비밀번호를 비동기로 업데이트합니다."""
    try:
        updated_user = await user_service.update_user_password(db, current_user, password_update)
        await db.commit()
        await db.refresh(updated_user)
        logger.info(f"User {current_user.email} successfully updated their password.")
        return updated_user
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating password for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="비밀번호 업데이트 중 서버 오류가 발생했습니다.")


@router.get("/me/dashboard_summary", response_model=schemas.UserDashboardSummary, summary="Get current user's dashboard summary")
async def get_user_dashboard_summary(
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """현재 로그인한 사용자의 대시보드 요약 정보를 비동기로 조회합니다."""
    try:
        # 복잡한 조회 로직을 user_service로 이전
        summary = await user_service.get_dashboard_summary(db, current_user)
        logger.info(f"User {current_user.email} fetched dashboard summary.")
        return summary
    except Exception as e:
        logger.error(f"Error fetching dashboard summary for {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="대시보드 요약 정보를 불러오는 중 서버 오류가 발생했습니다.")


# --- 관리자 전용 사용자 관리 엔드포인트 ---

@router.get("/", response_model=List[schemas.User], summary="Get list of users (Admin only)")
async def list_users(
    current_admin_user: models.User = Depends(get_current_admin_user), 
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None),
    is_email_verified: Optional[bool] = Query(None),
    role: Optional[str] = Query(None),
    search_query: Optional[str] = Query(None)
):
    """관리자가 모든 사용자 목록을 비동기로 조회합니다."""
    users = await user_service.list_users(
        db, skip=skip, limit=limit, is_active=is_active,
        is_email_verified=is_email_verified, role=role, search_query=search_query
    )
    logger.info(f"Admin {current_admin_user.email} listed {len(users)} users.")
    return users

@router.get("/{user_id}", response_model=schemas.User, summary="Get user profile by ID (Admin only)")
async def read_user_by_id(
    user_id: uuid.UUID,
    current_admin_user: models.User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_async_db)
):
    """관리자가 특정 사용자의 프로필 정보를 ID로 비동기 조회합니다."""
    user = await user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    logger.info(f"Admin {current_admin_user.email} queried user ID: {user_id}.")
    return user


@router.put("/{user_id}", response_model=schemas.User, summary="Update user profile by ID (Admin only)")
async def update_user_by_id(
    user_id: uuid.UUID,
    user_update: schemas.UserAdminUpdate,
    current_admin_user: models.User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_async_db)
):
    """관리자가 특정 사용자의 정보를 ID로 비동기 업데이트합니다."""
    # user_service에 관리자용 업데이트 함수가 있다고 가정 (신규 생성 필요)
    updated_user = await user_service.admin_update_user(db, user_id, user_update)
    await db.commit()
    await db.refresh(updated_user)
    logger.info(f"Admin {current_admin_user.email} updated user ID: {user_id}.")
    return updated_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete user by ID (Admin only)")
async def delete_user_by_id(
    user_id: uuid.UUID,
    current_admin_user: models.User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_async_db)
):
    """관리자가 특정 사용자 계정을 비동기로 삭제합니다."""
    success = await user_service.delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    await db.commit()
    logger.info(f"Admin {current_admin_user.email} deleted user ID: {user_id}.")
    return

# --- 현재 사용자 자산 조회 엔드포인트 ---

@router.get(
    "/me/inventory",
    response_model=List[schemas.UserInventoryItemResponse],
    summary="Get current user's inventory items"
)
async def get_my_inventory(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """현재 로그인된 사용자가 보유한 모든 아이템(쿠폰 등) 목록을 조회합니다."""
    inventory_items = await user_service.get_user_inventory(db, current_user.id)
    # Pydantic이 자동으로 SQLAlchemy 모델을 응답 스키마로 변환해줍니다.
    return inventory_items


@router.get(
    "/me/purchased-strategies",
    response_model=List[schemas.UserPurchasedStrategyResponse],
    summary="Get strategies purchased by the current user"
)
async def get_my_purchased_strategies(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """현재 로그인된 사용자가 마켓플레이스에서 구매한 모든 전략 목록을 조회합니다."""
    purchased_strategies = await user_service.get_purchased_strategies(db, current_user.id)
    return purchased_strategies