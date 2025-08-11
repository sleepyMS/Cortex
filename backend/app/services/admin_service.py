# file: backend/app/services/admin_service.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_ # func 임포트
import logging
from typing import List, Optional, Dict, Any
import uuid

from .. import models, schemas

logger = logging.getLogger(__name__)

class AdminService:
    """
    관리자 대시보드에 필요한 집계 데이터 및 전체 리소스 조회 기능을 제공하는 서비스.
    """

    def get_dashboard_summary(self, db: Session) -> schemas.DashboardSummary:
        """
        전체 시스템의 핵심 통계 지표를 집계하여 반환합니다.
        """
        total_users = db.query(models.User).count()
        active_users = db.query(models.User).filter(models.User.is_active == True).count()
        
        total_strategies = db.query(models.Strategy).count()
        public_strategies = db.query(models.Strategy).filter(models.Strategy.is_public == True).count()

        total_backtests_run = db.query(models.Backtest).count()
        total_successful_backtests = db.query(models.Backtest).filter(models.Backtest.status == 'completed').count()

        total_live_bots = db.query(models.LiveBot).count()
        active_live_bots = db.query(models.LiveBot).filter(
            models.LiveBot.status.in_(['active', 'paused', 'initializing'])
        ).count()

        # 최근 가입자 5명 (비밀번호 등 민감 정보 제외를 위해 schemas.User 스키마로 변환)
        latest_signups_models = db.query(models.User).order_by(models.User.created_at.desc()).limit(5).all()
        latest_signups_schemas = [schemas.User.model_validate(user_model) for user_model in latest_signups_models]


        # TODO: 전체 시스템의 총 손익 (Overall PNL) 집계는 복잡하므로 Placeholder.
        # TradeLog에서 계산하거나, 별도 집계 테이블에서 가져와야 함.
        overall_pnl = 0.0 # Placeholder

        summary = schemas.DashboardSummary(
            total_users=total_users,
            active_users=active_users,
            total_strategies=total_strategies,
            public_strategies=public_strategies,
            total_backtests_run=total_backtests_run,
            total_successful_backtests=total_successful_backtests,
            total_live_bots=total_live_bots,
            active_live_bots=active_live_bots,
            overall_pnl=overall_pnl,
            latest_signups=latest_signups_schemas
        )
        logger.info("Generated dashboard summary for admin.")
        return summary

    def get_all_strategies_admin(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None,
        is_public: Optional[bool] = None,
        author_id: Optional[uuid.UUID] = None
    ) -> List[models.Strategy]:
        """
        관리자가 모든 전략 목록을 조회합니다. (is_public 필터링 가능, 특정 저자 조회 가능)
        """
        query = db.query(models.Strategy).options(joinedload(models.Strategy.author)) # 작성자 정보도 함께 로드

        if is_public is not None:
            query = query.filter(models.Strategy.is_public == is_public)
        if author_id:
            query = query.filter(models.Strategy.author_id == author_id)
        if search_query:
            query = query.filter(models.Strategy.name.ilike(f"%{search_query}%"))
        
        # 정렬 (created_at_desc 기본)
        if sort_by == "created_at_asc":
            query = query.order_by(models.Strategy.created_at.asc())
        elif sort_by == "updated_at_desc":
            query = query.order_by(models.Strategy.updated_at.desc())
        else:
            query = query.order_by(models.Strategy.created_at.desc())
        
        strategies = query.offset(skip).limit(limit).all()
        logger.info(f"Admin fetched {len(strategies)} strategies (all users).")
        return strategies

    def get_all_backtests_admin(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        strategy_id_filter: Optional[int] = None,
        user_id_filter: Optional[int] = None, # 👈 특정 사용자 백테스트 조회용
        sort_by: Optional[str] = None
    ) -> List[models.Backtest]:
        """
        관리자가 모든 백테스트 기록 목록을 조회합니다.
        """
        query = db.query(models.Backtest).options(
            joinedload(models.Backtest.user),
            joinedload(models.Backtest.strategy),
            joinedload(models.Backtest.result)
        )

        if status_filter:
            query = query.filter(models.Backtest.status == status_filter)
        if strategy_id_filter:
            query = query.filter(models.Backtest.strategy_id == strategy_id_filter)
        if user_id_filter: # 특정 사용자의 백테스트 필터링
            query = query.filter(models.Backtest.user_id == user_id_filter)

        if sort_by == "created_at_asc":
            query = query.order_by(models.Backtest.created_at.asc())
        elif sort_by == "completed_at_desc":
            query = query.order_by(models.Backtest.completed_at.desc())
        else:
            query = query.order_by(models.Backtest.created_at.desc())
        
        backtests = query.offset(skip).limit(limit).all()
        logger.info(f"Admin fetched {len(backtests)} backtest records (all users).")
        return backtests

    def get_all_live_bots_admin(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        strategy_id_filter: Optional[int] = None,
        user_id_filter: Optional[int] = None, # 👈 특정 사용자 봇 조회용
        sort_by: Optional[str] = None
    ) -> List[models.LiveBot]:
        """
        관리자가 모든 라이브 봇 목록을 조회합니다.
        """
        query = db.query(models.LiveBot).options(
            joinedload(models.LiveBot.user),
            joinedload(models.LiveBot.strategy),
            joinedload(models.LiveBot.api_key)
        )

        if status_filter:
            query = query.filter(models.LiveBot.status == status_filter)
        if strategy_id_filter:
            query = query.filter(models.LiveBot.strategy_id == strategy_id_filter)
        if user_id_filter: # 특정 사용자의 봇 필터링
            query = query.filter(models.LiveBot.user_id == user_id_filter)

        if sort_by == "started_at_asc":
            query = query.order_by(models.LiveBot.started_at.asc())
        elif sort_by == "last_run_at_desc":
            query = query.order_by(models.LiveBot.last_run_at.desc())
        else:
            query = query.order_by(models.LiveBot.started_at.desc())

        live_bots = query.offset(skip).limit(limit).all()
        logger.info(f"Admin fetched {len(live_bots)} live bot records (all users).")
        return live_bots

# 서비스 인스턴스 생성
admin_service = AdminService()