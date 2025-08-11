# file: backend/app/routers/users.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session, joinedload
import logging
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from backend.app import schemas, models, security
from backend.app.database import get_db
from backend.app.services import user_service
from backend.app.services.plan_service import plan_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

# --- 현재 사용자 정보 엔드포인트 ---

@router.get("/me", response_model=schemas.User, summary="Get current user profile")
async def read_users_me(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    현재 로그인된 사용자의 프로필 정보와 구독 정보를 함께 반환합니다.
    """
    logger.info(f"User {current_user.email} (ID: {current_user.id}) requested their profile.")

    # SQLAlchemy의 joinedload를 사용하여 subscription 및 plan, features 관계를 명확하게 Eager Load 합니다.
    # User -> Subscription -> Plan -> PlanFeature의 관계를 한 번의 쿼리로 가져옵니다.
    user_with_subscription = db.query(models.User).options(
        joinedload(models.User.subscription).joinedload(models.Subscription.plan).joinedload(models.Plan.features)
    ).filter(models.User.id == current_user.id).first()

    if not user_with_subscription:
        logger.error(f"Failed to find user with ID: {current_user.id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자 정보를 찾을 수 없습니다."
        )

    # 구독 정보가 성공적으로 로드되었는지 최종 확인하는 로그.
    if user_with_subscription.subscription and user_with_subscription.subscription.plan:
        logger.info(f"ORM Success: Subscription for user {current_user.id} loaded with plan '{user_with_subscription.subscription.plan.name}'.")
    else:
        logger.info(f"ORM Success: User {current_user.id} does not have an active subscription.")

    # 모든 관계가 로드된 ORM 객체를 반환하면 FastAPI가 Pydantic 모델로 변환합니다.
    return user_with_subscription


@router.put("/me/profile", response_model=schemas.User, summary="Update current user's profile information")
async def update_users_me_profile(
    user_update: schemas.UserUpdateProfile,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 로그인된 사용자의 프로필 정보(예: username)를 업데이트합니다.
    """
    try:
        updated_user = user_service.update_user_profile(db, current_user, user_update)
        db.commit()
        db.refresh(updated_user)
        logger.info(f"User {current_user.email} (ID: {current_user.id}) successfully updated their profile.")
        return updated_user
    except HTTPException as e:
        db.rollback()
        logger.error(f"Failed to update profile for user {current_user.email} (ID: {current_user.id}): {e.detail}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while updating profile for user {current_user.email} (ID: {current_user.id}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="프로필 업데이트 중 서버 오류가 발생했습니다."
        )


@router.put("/me/password", response_model=schemas.User, summary="Update current user's password")
async def update_users_me_password(
    password_update: schemas.UserUpdatePassword,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 로그인된 사용자의 비밀번호를 업데이트합니다. (기존 비밀번호 확인 포함)
    """
    try:
        updated_user = user_service.update_user_password(db, current_user, password_update)
        db.commit()
        db.refresh(updated_user)
        logger.info(f"User {current_user.email} (ID: {current_user.id}) successfully updated their password.")
        return updated_user
    except HTTPException as e:
        db.rollback()
        logger.error(f"Failed to update password for user {current_user.email} (ID: {current_user.id}): {e.detail}")
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while updating password for user {current_user.email} (ID: {current_user.id}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="비밀번호 업데이트 중 서버 오류가 발생했습니다."
        )


# --- 일반 사용자 대시보드 요약 엔드포인트 ---
@router.get("/me/dashboard_summary", response_model=schemas.UserDashboardSummary, summary="Get current user's dashboard summary")
async def get_user_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_active_user)
):
    """
    현재 로그인한 사용자의 대시보드 요약 정보를 조회합니다.
    """
    try:
        # 1. PlanService를 통해 사용자의 플랜 기능 가져오기
        user_features = plan_service.get_user_plan_features(user=current_user, db=db)
        
        # 2. 백테스트 통계
        total_backtests_run_by_user = db.query(models.Backtest).filter(
            models.Backtest.user_id == current_user.id
        ).count()

        successful_backtests_by_user = db.query(models.Backtest).filter(
            models.Backtest.user_id == current_user.id,
            models.Backtest.status == "completed"
        ).count()

        # 3. 라이브 봇 통계
        total_live_bots_by_user = db.query(models.LiveBot).filter(
            models.LiveBot.user_id == current_user.id
        ).count()

        active_live_bots_by_user = db.query(models.LiveBot).filter(
            models.LiveBot.user_id == current_user.id,
            models.LiveBot.status.in_(["active", "paused", "initializing"])
        ).count()

        # 4. 최근 활동 (최근 3개)
        latest_backtests_models = db.query(models.Backtest).filter(
            models.Backtest.user_id == current_user.id
        ).options(joinedload(models.Backtest.strategy)).order_by(models.Backtest.created_at.desc()).limit(3).all()
        latest_backtests_schemas = [schemas.Backtest.model_validate(bt) for bt in latest_backtests_models]

        latest_live_bots_models = db.query(models.LiveBot).filter(
            models.LiveBot.user_id == current_user.id
        ).options(joinedload(models.LiveBot.strategy), joinedload(models.LiveBot.api_key)).order_by(models.LiveBot.created_at.desc()).limit(3).all()
        latest_live_bots_schemas = [schemas.LiveBot.model_validate(lb) for lb in latest_live_bots_models]

        logger.info(f"User {current_user.email} (ID: {current_user.id}) fetched dashboard summary.")
        
        subscription = current_user.subscription
        plan_features = subscription.plan.features if subscription and subscription.plan else None
        
        return schemas.UserDashboardSummary(
            email=current_user.email,
            username=current_user.username,
            user_id=current_user.id,
            created_at=current_user.created_at,
            is_email_verified=current_user.is_email_verified,

            current_plan_name=subscription.plan.name if subscription and subscription.plan else "Basic",
            current_plan_price=subscription.plan.price if subscription and subscription.plan else 0.0,
            subscription_end_date=subscription.current_period_end if subscription else None,
            subscription_is_active=subscription.status == "active" if subscription else False,
            max_backtests_per_day=plan_features.daily_backtest_count if plan_features else 0,
            concurrent_bots_limit=plan_features.live_bots_limit if plan_features else 0,
            allowed_timeframes=plan_features.supported_timeframes.split(",") if plan_features else [],

            total_backtests_run_by_user=total_backtests_run_by_user,
            successful_backtests_by_user=successful_backtests_by_user,
            total_live_bots_by_user=total_live_bots_by_user,
            active_live_bots_by_user=active_live_bots_by_user,
            
            latest_backtests=latest_backtests_schemas,
            latest_live_bots=latest_live_bots_schemas,
        )
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching user dashboard summary for {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 요약 정보를 불러오는 중 서버 오류가 발생했습니다."
        )


# --- 관리자 전용 사용자 관리 엔드포인트 ---

@router.get("/", response_model=List[schemas.User], summary="Get list of users (Admin only)")
async def list_users(
    # 👈 함수 이름 변경에 맞춤
    current_admin_user: models.User = Depends(security.get_current_admin_user), 
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_email_verified: Optional[bool] = Query(None, description="Filter by email verification status"),
    role: Optional[str] = Query(None, description="Filter by user role"),
    search_query: Optional[str] = Query(None, description="Search by email or username")
):
    """
    관리자가 모든 사용자 또는 특정 조건에 맞는 사용자 목록을 조회합니다.
    """
    users = user_service.list_users(
        db,
        skip=skip,
        limit=limit,
        is_active=is_active,
        is_email_verified=is_email_verified,
        role=role,
        search_query=search_query
    )
    logger.info(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) listed {len(users)} users with filters: active={is_active}, verified={is_email_verified}, role={role}, search='{search_query}'.")
    return users


@router.get("/{user_id}", response_model=schemas.User, summary="Get user profile by ID (Admin only)")
async def read_user_by_id(
    user_id: uuid.UUID,
    # 👈 함수 이름 변경에 맞춤
    current_admin_user: models.User = Depends(security.get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    관리자가 특정 사용자의 프로필 정보를 ID로 조회합니다.
    """
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        logger.warning(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) attempted to read non-existent user ID: {user_id}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    logger.info(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) queried user ID: {user_id}.")
    return user

@router.put("/{user_id}", response_model=schemas.User, summary="Update user profile by ID (Admin only)")
async def update_user_by_id(
    user_id: uuid.UUID,
    user_update: schemas.UserAdminUpdate,
    # 👈 함수 이름 변경에 맞춤
    current_admin_user: models.User = Depends(security.get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    관리자가 특정 사용자의 프로필 정보를 ID로 업데이트합니다.
    """
    try:
        updated_user = user_service.admin_update_user(db, user_id, user_update)
        logger.info(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) updated user ID: {user_id}.")
        return updated_user
    except HTTPException as e:
        logger.error(f"Admin {current_admin_user.email} failed to update user ID: {user_id}: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred while admin {current_admin_user.email} updated user ID: {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 업데이트 중 서버 오류가 발생했습니다."
        )

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete user by ID (Admin only)")
async def delete_user_by_id(
    user_id: uuid.UUID,
    # 👈 함수 이름 변경에 맞춤
    current_admin_user: models.User = Depends(security.get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    관리자가 특정 사용자 계정을 삭제합니다.
    """
    try:
        success = user_service.delete_user(db, user_id)
        if not success:
            logger.warning(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) attempted to delete non-existent user ID: {user_id}.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
        logger.info(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) deleted user ID: {user_id}.")
        return
    except HTTPException as e:
        logger.error(f"Admin {current_admin_user.email} failed to delete user ID: {user_id}: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred while admin {current_admin_user.email} deleted user ID: {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 삭제 중 서버 오류가 발생했습니다."
        )