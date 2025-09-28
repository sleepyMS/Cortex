# file: backend/app/routers/users.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid

from .. import schemas, models, security
from ..dependencies import get_current_user, get_async_db, get_current_active_user, get_current_admin_user
from ..services.user_service import user_service
from ..services.attendance_service import attendance_service
from ..services.credit_service import credit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])

# --- 현재 사용자 정보 엔드포인트 ---

@router.get("/me", response_model=schemas.User, summary="Get current user profile with credits")
async def read_users_me(
    current_user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    현재 로그인된 사용자의 프로필, 구독 정보, 그리고 최신 크레딧 잔액을 함께 반환합니다.
    이 엔드포인트 호출 시, 하루에 한 번 출석 체크가 자동으로 처리됩니다.
    """
    try:
        user_profile = await user_service.get_user_profile_with_checkin(db, current_user)
        logger.info(f"Successfully synced credits for user {user_profile.email}.")
        return user_profile

    except Exception as e:
        logger.error(f"Error during credit sync for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="프로필 정보를 가져오는 중 오류가 발생했습니다."
        )

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, summary="Delete current user's account")
async def delete_me(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    현재 로그인된 사용자의 계정을 영구적으로 삭제합니다.
    DB cascade 설정에 따라 모든 관련 데이터가 함께 삭제됩니다.
    """
    # user_service에 이미 admin용으로 만들어 둔 delete_user 함수를 재사용합니다.
    success = await user_service.delete_user(db, current_user.id)
    if not success:
        # 이 경우는 거의 발생하지 않지만, 방어적으로 코드를 작성합니다.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="삭제할 사용자를 찾을 수 없습니다.")
    
    # commit은 get_async_db 의존성이 처리해줍니다.
    logger.info(f"User account for {current_user.email} (ID: {current_user.id}) has been permanently deleted.")
    return

@router.put("/me/profile", response_model=schemas.User, summary="Update current user's profile information")
async def update_users_me_profile(
    user_update: schemas.UserProfileUpdate,
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

@router.get("/me/profile", response_model=schemas.UserProfileResponse, summary="Get current user's editable profile")
async def get_my_profile(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    현재 로그인된 사용자의 '프로필 관리'에 필요한 데이터를 조회합니다.
    """
    return await user_service.get_user_profile(db, current_user)

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

@router.get(
    "/me/credit-balance",
    response_model=schemas.CreditBalanceSummary,
    summary="Get current user's credit balance summary"
)
async def get_my_credit_balance(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    현재 로그인된 사용자의 상세 크레딧 잔액 정보를 조회합니다.
    credit_service의 get_balance_summary 함수를 호출합니다.
    """
    balance_summary = await credit_service.get_balance_summary(db, current_user.id)
    return balance_summary


# @router.get(
#     "/me/credit-transactions",
#     response_model=schemas.PaginatedCreditTransactions,
#     summary="Get current user's credit transaction history"
# )
# async def get_my_credit_transactions(
#     current_user: models.User = Depends(get_current_active_user),
#     db: AsyncSession = Depends(get_async_db),
#     page: int = Query(1, ge=1),
#     limit: int = Query(10, ge=1, le=100),
# ):
#     """
#     현재 로그인된 사용자의 크레딧 거래 내역을 페이지네이션하여 조회합니다.
#     credit_service의 list_transactions_paginated 함수를 호출합니다.
#     """
#     paginated_result = await credit_service.list_transactions_paginated(
#         db, current_user.id, page, limit
#     )
#     return paginated_result

@router.get(
    "/me/credit-history", # 새로운 API 경로
    # response_model은 새로운 통합 스키마를 정의해야 합니다.
    summary="Get unified credit history (gains and usages)"
)
async def get_my_credit_history(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
):
    """현재 사용자의 모든 크레딧 획득 및 사용 내역을 시간순으로 조회합니다."""
    unified_history = await credit_service.get_unified_history_paginated(
        db, current_user.id, page, limit
    )
    return unified_history

