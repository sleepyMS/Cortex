# file: backend/app/services/backtest_service.py

from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime, timezone
import uuid

from .. import models, schemas
from ..services.plan_service import plan_service
from ..services.strategy_service import strategy_service
from ..celery_app import celery_app
from ..tasks import run_backtest_task
import logging

logger = logging.getLogger(__name__)

class BacktestService:
    """
    백테스팅 작업의 생성, 조회, 상태 관리 및 취소를 담당하는 서비스.
    플랜 제한 검사 및 Celery 태스크 전송을 포함합니다.
    """
    def __init__(self):
        self.plan_service = plan_service
        self.strategy_service = strategy_service

    def create_backtest_job(
        self,
        db: Session,
        user: models.User,
        backtest_create: schemas.BacktestCreate
    ) -> models.Backtest:
        """
        새로운 백테스팅 작업을 생성하고 Celery 큐에 추가합니다.
        """
        # 1. 일일 백테스팅 횟수 제한 검사 (비즈니스 로직)
        user_features = self.plan_service.get_user_plan_features(user=user, db=db)
        max_backtests = user_features.daily_backtest_count
        today = datetime.now(timezone.utc).date()
        
        executed_today = db.query(models.Backtest).filter(
            models.Backtest.user_id == user.id,
            models.Backtest.created_at >= today
        ).count()

        if executed_today >= max_backtests:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"일일 백테스트 제한({max_backtests}회)을 초과했습니다.")

        strategy = self.strategy_service.get_strategy_by_id(db, backtest_create.strategy_id)
        if not strategy or strategy.author_id != user.id:
            logger.warning(f"User {user.email} attempted to use invalid/unowned strategy {backtest_create.strategy_id} for backtest.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 전략을 찾을 수 없거나 권한이 없습니다.")

        # 2. 백테스트 DB 레코드 생성
        db_backtest = models.Backtest(
            user_id=user.id,
            strategy_id=strategy.id,
            status='pending',
            parameters=backtest_create.model_dump(mode='json', exclude_unset=True)
        )
        db.add(db_backtest)
        db.flush()
        db.refresh(db_backtest)
        logger.info(f"Backtest record created for user {user.email}, Backtest ID: {db_backtest.id}.")

        # 3. Celery 태스크 전송
        try:
            task_result = run_backtest_task.delay(str(db_backtest.id))
            logger.info(f"Celery task dispatched for Backtest ID: {db_backtest.id}. Celery Task ID: {task_result.id}")
        except Exception as e:
            logger.error(f"Failed to dispatch Celery task for Backtest ID {db_backtest.id}: {e}", exc_info=True)
            db_backtest.status = 'failed_dispatch'
            db.add(db_backtest)
            raise HTTPException(status_code=500, detail="백테스트 작업 시작에 실패했습니다.")

        return db_backtest
    
    def get_backtests(
        self,
        db: Session,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        strategy_id_filter: Optional[int] = None,
        sort_by: Optional[str] = None
    ) -> List[models.Backtest]:
        """
        사용자 본인의 백테스팅 기록 목록을 조회합니다.
        """
        query = db.query(models.Backtest).filter(models.Backtest.user_id == user_id)

        if status_filter:
            query = query.filter(models.Backtest.status == status_filter)
        if strategy_id_filter:
            query = query.filter(models.Backtest.strategy_id == strategy_id_filter)

        query = query.options(joinedload(models.Backtest.result))

        if sort_by == "created_at_asc":
            query = query.order_by(models.Backtest.created_at.asc())
        elif sort_by == "completed_at_desc":
            query = query.order_by(models.Backtest.completed_at.desc())
        else:
            query = query.order_by(models.Backtest.created_at.desc())

        backtests = query.offset(skip).limit(limit).all()
        logger.info(f"User {user_id} fetched {len(backtests)} backtest records.")
        return backtests

    def get_backtest_by_id(self, db: Session, backtest_id: uuid.UUID) -> models.Backtest | None:
        """ID로 단일 백테스팅 기록을 조회합니다."""
        backtest = db.query(models.Backtest).options(
            joinedload(models.Backtest.result),
            joinedload(models.Backtest.user),
            joinedload(models.Backtest.strategy)
        ).filter(models.Backtest.id == backtest_id).first()
        return backtest

    def get_trade_logs_for_backtest(self, db: Session, backtest_id: uuid.UUID) -> List[models.TradeLog]:
        """
        특정 백테스트의 거래 기록 목록을 조회합니다.
        """
        trade_logs = db.query(models.TradeLog).filter(models.TradeLog.backtest_id == backtest_id).order_by(models.TradeLog.timestamp.asc()).all()
        logger.info(f"Fetched {len(trade_logs)} trade logs for Backtest ID: {backtest_id}.")
        return trade_logs

    def cancel_backtest_job(
        self,
        db: Session,
        backtest_to_cancel: models.Backtest
    ) -> bool:
        """
        진행 중인 백테스팅 작업을 취소합니다.
        (라우터에서 백테스트 소유권 검증이 완료되었다고 가정합니다.)
        """
        if backtest_to_cancel.status in ['completed', 'failed', 'canceled']:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"백테스트가 이미 '{backtest_to_cancel.status}' 상태이므로 취소할 수 없습니다.")

        try:
            # Celery 작업 취소 (Celery Task ID가 Backtest ID와 동일하다고 가정)
            celery_app.control.revoke(str(backtest_to_cancel.id), terminate=True)

            backtest_to_cancel.status = 'canceled'
            db.add(backtest_to_cancel)
            db.flush()
            logger.info(f"Backtest ID {backtest_to_cancel.id} cancellation requested and status updated.")
            return True
        except Exception as e:
            logger.error(f"Failed to send cancellation command for backtest {backtest_to_cancel.id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="백테스트 취소 명령에 실패했습니다.")


backtest_service = BacktestService()