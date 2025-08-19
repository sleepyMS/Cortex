# file: backend/app/services/admin_service.py

from sqlalchemy.orm import joinedload
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid
import asyncio # 👈 [추가] 병렬 쿼리를 위한 asyncio 임포트

from .. import models, schemas

logger = logging.getLogger(__name__)

class AdminService:
    """
    관리자 대시보드 및 관리에 필요한 비즈니스 로직을 제공하는 비동기 서비스.
    """

    async def get_dashboard_summary(self, db: AsyncSession) -> schemas.DashboardSummary:
        """시스템 전반의 핵심 통계 지표를 병렬 쿼리로 집계하여 반환합니다."""
        
        # 각 쿼리들을 비동기 Task로 만듭니다.
        total_users_task = db.execute(select(func.count(models.User.id)))
        active_users_task = db.execute(select(func.count(models.User.id)).filter(models.User.is_active == True))
        
        total_strategies_task = db.execute(select(func.count(models.Strategy.id)))
        public_strategies_task = db.execute(select(func.count(models.Strategy.id)).filter(models.Strategy.is_public == True))

        total_backtests_task = db.execute(select(func.count(models.Backtest.id)))
        successful_backtests_task = db.execute(select(func.count(models.Backtest.id)).filter(models.Backtest.status == 'completed'))
        
        total_live_bots_task = db.execute(select(func.count(models.LiveBot.id)))
        active_live_bots_task = db.execute(select(func.count(models.LiveBot.id)).filter(models.LiveBot.status.in_(['active', 'paused'])))

        latest_signups_task = db.execute(select(models.User).order_by(models.User.created_at.desc()).limit(5))
        
        # asyncio.gather를 사용하여 모든 쿼리를 동시에 실행하고 결과를 기다립니다.
        results = await asyncio.gather(
            total_users_task, active_users_task, total_strategies_task, public_strategies_task,
            total_backtests_task, successful_backtests_task, total_live_bots_task, active_live_bots_task,
            latest_signups_task
        )
        
        summary = schemas.DashboardSummary(
            total_users=results[0].scalar_one(),
            active_users=results[1].scalar_one(),
            total_strategies=results[2].scalar_one(),
            public_strategies=results[3].scalar_one(),
            total_backtests_run=results[4].scalar_one(),
            total_successful_backtests=results[5].scalar_one(),
            total_live_bots=results[6].scalar_one(),
            active_live_bots=results[7].scalar_one(),
            overall_pnl=0.0,
            latest_signups=results[8].scalars().all()
        )
        logger.info("Generated dashboard summary for admin.")
        return summary

    async def get_all_strategies_admin(
        self, db: AsyncSession, skip: int, limit: int, search_query: Optional[str],
        sort_by: Optional[str], is_public: Optional[bool], author_id: Optional[uuid.UUID]
    ) -> List[models.Strategy]:
        """관리자가 모든 전략 목록을 비동기로 조회합니다."""
        query = select(models.Strategy).options(joinedload(models.Strategy.author))
        
        if is_public is not None: query = query.filter(models.Strategy.is_public == is_public)
        if author_id: query = query.filter(models.Strategy.author_id == author_id)
        if search_query: query = query.filter(models.Strategy.name.ilike(f"%{search_query}%"))
        
        if sort_by == "created_at_asc": query = query.order_by(models.Strategy.created_at.asc())
        elif sort_by == "updated_at_desc": query = query.order_by(models.Strategy.updated_at.desc())
        else: query = query.order_by(models.Strategy.created_at.desc())
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        strategies = result.scalars().all()
        
        logger.info(f"Admin fetched {len(strategies)} strategies (all users).")
        return strategies

    async def get_all_backtests_admin(
        self, db: AsyncSession, skip: int, limit: int, status_filter: Optional[str],
        strategy_id_filter: Optional[uuid.UUID], user_id_filter: Optional[uuid.UUID],
        sort_by: Optional[str]
    ) -> List[models.Backtest]:
        """관리자가 모든 백테스트 기록 목록을 비동기로 조회합니다."""
        query = select(models.Backtest).options(
            joinedload(models.Backtest.user),
            joinedload(models.Backtest.strategy),
            joinedload(models.Backtest.result)
        )

        if status_filter: query = query.filter(models.Backtest.status == status_filter)
        if strategy_id_filter: query = query.filter(models.Backtest.strategy_id == strategy_id_filter)
        if user_id_filter: query = query.filter(models.Backtest.user_id == user_id_filter)

        if sort_by == "created_at_asc": query = query.order_by(models.Backtest.created_at.asc())
        elif sort_by == "completed_at_desc": query = query.order_by(models.Backtest.completed_at.desc())
        else: query = query.order_by(models.Backtest.created_at.desc())
        
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        backtests = result.scalars().all()

        logger.info(f"Admin fetched {len(backtests)} backtest records (all users).")
        return backtests

    async def get_all_live_bots_admin(
        self, db: AsyncSession, skip: int, limit: int, status_filter: Optional[str],
        strategy_id_filter: Optional[uuid.UUID], user_id_filter: Optional[uuid.UUID],
        sort_by: Optional[str]
    ) -> List[models.LiveBot]:
        """관리자가 모든 라이브 봇 목록을 비동기로 조회합니다."""
        query = select(models.LiveBot).options(
            joinedload(models.LiveBot.user),
            joinedload(models.LiveBot.strategy),
            joinedload(models.LiveBot.api_key)
        )

        if status_filter: query = query.filter(models.LiveBot.status == status_filter)
        if strategy_id_filter: query = query.filter(models.LiveBot.strategy_id == strategy_id_filter)
        if user_id_filter: query = query.filter(models.LiveBot.user_id == user_id_filter)

        if sort_by == "started_at_asc": query = query.order_by(models.LiveBot.started_at.asc())
        elif sort_by == "last_run_at_desc": query = query.order_by(models.LiveBot.last_run_at.desc())
        else: query = query.order_by(models.LiveBot.started_at.desc())

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        live_bots = result.scalars().all()

        logger.info(f"Admin fetched {len(live_bots)} live bot records (all users).")
        return live_bots

# 서비스 인스턴스 생성
admin_service = AdminService()