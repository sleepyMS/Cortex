# file: backend/app/routers/admin.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid

from .. import schemas, models
from ..dependencies import get_async_db, get_current_admin_user
from ..services.admin_service import admin_service
from ..services.user_service import user_service
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin", 
    tags=["Admin"],
    dependencies=[Depends(get_current_admin_user)]
)

# --- 관리자 대시보드 및 리소스 조회 엔드포인트 ---

@router.get("/dashboard_summary", response_model=schemas.DashboardSummary, summary="Get overall dashboard summary")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_async_db)
):
    """관리자 대시보드에 표시될 시스템 전반의 핵심 통계 요약을 비동기로 조회합니다."""
    try:
        summary = await admin_service.get_dashboard_summary(db)
        return summary
    except Exception as e:
        logger.error(f"Error fetching dashboard summary for admin: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="대시보드 요약 정보를 불러오는 중 서버 오류가 발생했습니다.")

@router.get("/users", response_model=List[schemas.User], summary="Get list of all users")
async def list_all_users(
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
    return users

@router.get("/strategies", response_model=List[schemas.Strategy], summary="Get all strategies")
async def get_all_strategies(
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search_query: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    is_public: Optional[bool] = Query(None),
    author_id: Optional[uuid.UUID] = Query(None)
):
    """관리자가 모든 사용자의 전략 목록을 비동기로 조회합니다."""
    strategies = await admin_service.get_all_strategies_admin(
        db, skip, limit, search_query, sort_by, is_public, author_id
    )
    return strategies

@router.get("/backtests", response_model=List[schemas.Backtest], summary="Get all backtest records")
async def get_all_backtests(
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None),
    strategy_id_filter: Optional[uuid.UUID] = Query(None),
    user_id_filter: Optional[uuid.UUID] = Query(None),
    sort_by: Optional[str] = Query(None)
):
    """관리자가 모든 사용자의 백테스트 기록 목록을 비동기로 조회합니다."""
    backtests = await admin_service.get_all_backtests_admin(
        db, skip, limit, status_filter, strategy_id_filter, user_id_filter, sort_by
    )
    return backtests

@router.get("/live_bots", response_model=List[schemas.LiveBot], summary="Get all live trading bots")
async def get_all_live_bots(
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None),
    strategy_id_filter: Optional[uuid.UUID] = Query(None),
    user_id_filter: Optional[uuid.UUID] = Query(None),
    sort_by: Optional[str] = Query(None)
):
    """관리자가 모든 사용자의 라이브 봇 목록을 비동기로 조회합니다."""
    live_bots = await admin_service.get_all_live_bots_admin(
        db, skip, limit, status_filter, strategy_id_filter, user_id_filter, sort_by
    )
    return live_bots