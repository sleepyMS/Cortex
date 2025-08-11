# file: backend/app/routers/admin.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import logging
from typing import List, Optional
import uuid

from .. import schemas, models, security
from ..database import get_db
from ..services.admin_service import admin_service # 👈 관리자 서비스 임포트
# 필요한 경우 다른 서비스도 임포트하여 특정 리소스에 대한 관리자 작업 수행
# from ..services.user_service import user_service
# from ..services.strategy_service import strategy_service


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

# 모든 관리자 엔드포인트는 `get_current_admin_user` 의존성을 가짐
# 이는 라우터 자체에 Depends를 설정하여 중복을 피할 수 있습니다.
# router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(security.get_current_admin_user)])
# 이 경우, 각 함수에서 Depends(security.get_current_admin_user)를 제거해야 합니다.
# 명시성을 위해 각 함수에 두는 방식도 유지 가능합니다.

# --- 관리자 대시보드 및 리소스 조회 엔드포인트 ---

@router.get("/dashboard_summary", response_model=schemas.DashboardSummary, summary="Get overall dashboard summary (Admin only)")
async def get_dashboard_summary(
    current_admin_user: models.User = Depends(security.get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    관리자 대시보드에 표시될 시스템 전반의 핵심 통계 요약을 조회합니다.
    """
    try:
        summary = admin_service.get_dashboard_summary(db)
        logger.info(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) retrieved dashboard summary.")
        return summary
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching dashboard summary for admin {current_admin_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="대시보드 요약 정보를 불러오는 중 서버 오류가 발생했습니다."
        )


@router.get("/strategies", response_model=List[schemas.Strategy], summary="Get all strategies (Admin only)")
async def get_all_strategies_admin(
    current_admin_user: models.User = Depends(security.get_current_admin_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search_query: Optional[str] = Query(None, description="Search by strategy name"),
    sort_by: Optional[str] = Query(None, description="Sort order (e.g., 'created_at_desc', 'updated_at_desc')"),
    is_public: Optional[bool] = Query(None, description="Filter by public status"),
    author_id: Optional[uuid.UUID] = Query(None, description="Filter by author ID")
):
    """
    관리자가 모든 사용자의 전략 목록을 조회합니다.
    """
    strategies = admin_service.get_all_strategies_admin(
        db, skip, limit, search_query, sort_by, is_public, author_id
    )
    logger.info(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) retrieved {len(strategies)} strategies (all users).")
    return strategies


@router.get("/backtests", response_model=List[schemas.Backtest], summary="Get all backtest records (Admin only)")
async def get_all_backtests_admin(
    current_admin_user: models.User = Depends(security.get_current_admin_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by backtest status"),
    strategy_id_filter: Optional[int] = Query(None, description="Filter by strategy ID"),
    user_id_filter: Optional[int] = Query(None, description="Filter by user ID"),
    sort_by: Optional[str] = Query(None, description="Sort order (e.g., 'created_at_desc', 'completed_at_desc')")
):
    """
    관리자가 모든 사용자의 백테스트 기록 목록을 조회합니다.
    """
    backtests = admin_service.get_all_backtests_admin(
        db, skip, limit, status_filter, strategy_id_filter, user_id_filter, sort_by
    )
    logger.info(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) retrieved {len(backtests)} backtest records (all users).")
    return backtests


@router.get("/live_bots", response_model=List[schemas.LiveBot], summary="Get all live trading bots (Admin only)")
async def get_all_live_bots_admin(
    current_admin_user: models.User = Depends(security.get_current_admin_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by bot status"),
    strategy_id_filter: Optional[int] = Query(None, description="Filter by strategy ID"),
    user_id_filter: Optional[int] = Query(None, description="Filter by user ID"),
    sort_by: Optional[str] = Query(None, description="Sort order (e.g., 'started_at_desc', 'last_run_at_desc')")
):
    """
    관리자가 모든 사용자의 라이브 봇 목록을 조회합니다.
    """
    live_bots = admin_service.get_all_live_bots_admin(
        db, skip, limit, status_filter, strategy_id_filter, user_id_filter, sort_by
    )
    logger.info(f"Admin {current_admin_user.email} (ID: {current_admin_user.id}) retrieved {len(live_bots)} live bots (all users).")
    return live_bots