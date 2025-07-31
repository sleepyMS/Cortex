# file: backend/app/routers/users.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session, joinedload
import logging
from typing import List, Optional
from datetime import datetime, timezone

from backend.app import schemas, models, security
from backend.app.database import get_db
from backend.app.services import user_service
from backend.app.services.plan_service import plan_service # 👈 plan_service 임포트
# from backend.app.config import settings # 👈 settings는 plan_service에서 처리하므로 여기서 제거

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

# --- 현재 사용자 정보 엔드포인트 ---

@router.get("/me", response_model=schemas.User, summary="Get current user profile")
async def read_users_me(
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db) # db 세션 추가
):
    """
    현재 로그인된 사용자의 프로필 정보를 반환합니다.
    """
    logger.info(f"User {current_user.email} (ID: {current_user.id}) requested their profile.")
    return current_user


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
        db.commit() # user_service에서 커밋하지 않으므로 여기서 커밋
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
        db.commit() # user_service에서 커밋하지 않으므로 여기서 커밋
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
        # 1. 구독 정보 조회 및 플랜 기능 가져오기
        subscription = db.query(models.Subscription).filter(
            models.Subscription.user_id == current_user.id,
            models.Subscription.status == "active" # 활성 구독만
        ).options(joinedload(models.Subscription.plan)).first() # 플랜 정보 조인 로드

        current_plan_name = "Basic"
        current_plan_price = 0.0
        subscription_end_date = None
        subscription_is_active = False # 기본값
        
        # plan_service에서 사용자에게 허용된 기능 가져오기 (이 방법이 더 깔끔하고 관리 용이)
        max_backtests_per_day = plan_service.get_user_max_backtests_per_day(current_user, db)
        concurrent_bots_limit = plan_service.get_user_concurrent_bots_limit(current_user, db)
        allowed_timeframes = plan_service.get_user_allowed_timeframes(current_user, db)


        if subscription and subscription.plan:
            current_plan_name = subscription.plan.name
            current_plan_price = subscription.plan.price
            subscription_end_date = subscription.current_period_end
            subscription_is_active = (subscription.status == "active" and 
                                      (subscription.current_period_end is None or subscription.current_period_end > datetime.now(timezone.utc)))
        else:
            # 구독이 없거나 활성 상태가 아니면, 기본 플랜의 기능으로 설정
            basic_plan_placeholder = db.query(models.Plan).filter(models.Plan.name == "basic").first()
            if basic_plan_placeholder:
                max_backtests_per_day = basic_plan_placeholder.features.get("max_backtests_per_day", 5)
                concurrent_bots_limit = basic_plan_placeholder.features.get("concurrent_bots_limit", 0)
                allowed_timeframes = basic_plan_placeholder.features.get("allowed_timeframes", ["1h"])
            # else: DB에 basic 플랜이 없는 경우 기본값 사용 (위 초기화 값)


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
            models.LiveBot.status.in_(["active", "paused", "initializing"]) # 활성 상태로 간주
        ).count()

        # 4. 최근 활동 (최근 3개)
        # Backtest와 LiveBot 모델에 필요한 관계가 로드되도록 joinedload 사용
        latest_backtests_models = db.query(models.Backtest).filter(
            models.Backtest.user_id == current_user.id
        ).options(joinedload(models.Backtest.strategy)).order_by(models.Backtest.created_at.desc()).limit(3).all()
        # Pydantic 스키마로 변환
        latest_backtests_schemas = [schemas.Backtest.model_validate(bt) for bt in latest_backtests_models]

        latest_live_bots_models = db.query(models.LiveBot).filter(
            models.LiveBot.user_id == current_user.id
        ).options(joinedload(models.LiveBot.strategy), joinedload(models.LiveBot.api_key)).order_by(models.LiveBot.created_at.desc()).limit(3).all()
        # Pydantic 스키마로 변환
        latest_live_bots_schemas = [schemas.LiveBot.model_validate(lb) for lb in latest_live_bots_models]


        logger.info(f"User {current_user.email} (ID: {current_user.id}) fetched dashboard summary.")
        return schemas.UserDashboardSummary(
            email=current_user.email,
            username=current_user.username,
            user_id=current_user.id,
            created_at=current_user.created_at,
            is_email_verified=current_user.is_email_verified, # 이메일 인증 여부

            current_plan_name=current_plan_name,
            current_plan_price=current_plan_price,
            subscription_end_date=subscription_end_date,
            subscription_is_active=subscription_is_active,
            max_backtests_per_day=max_backtests_per_day,
            concurrent_bots_limit=concurrent_bots_limit,
            allowed_timeframes=allowed_timeframes,

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
    current_admin_user: models.User = Depends(security.get_current_admin_user), # 관리자 권한 요구
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
    페이지네이션, 활성 상태, 이메일 인증 상태, 역할, 검색 쿼리를 지원합니다.
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
    user_id: int,
    current_admin_user: models.User = Depends(security.get_current_admin_user), # 관리자 권한 요구
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
    user_id: int,
    user_update: schemas.UserAdminUpdate,
    current_admin_user: models.User = Depends(security.get_current_admin_user), # 관리자 권한 요구
    db: Session = Depends(get_db)
):
    """
    관리자가 특정 사용자의 프로필 정보를 ID로 업데이트합니다.
    role, is_active, is_email_verified, password 등을 포함할 수 있습니다.
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
    user_id: int,
    current_admin_user: models.User = Depends(security.get_current_admin_user), # 관리자 권한 요구
    db: Session = Depends(get_db)
):
    """
    관리자가 특정 사용자 계정을 삭제합니다.
    이 작업은 연관된 모든 데이터를 CASCADE 삭제합니다.
    """
    try:
        success = user_service.delete_user(db, user_id)
        if not success:
            logger.warning(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) attempted to delete non-existent user ID: {user_id}.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
        logger.info(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) deleted user ID: {user_id}.")
        # 204 No Content는 응답 바디를 포함하지 않습니다.
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