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
        # 1. 일일 백테스팅 횟수 제한 검사
        # 👈 plan_service.get_user_plan_features를 사용하도록 수정
        user_features = self.plan_service.get_user_plan_features(user=user, db=db)
        max_backtests = user_features.daily_backtest_count
        today = datetime.now(timezone.utc).date()
        
        executed_today = db.query(models.Backtest).filter(
            models.Backtest.user_id == user.id,
            models.Backtest.created_at >= today,
            models.Backtest.status.in_(['pending', 'running', 'completed'])
        ).count()

        if executed_today >= max_backtests:
            logger.warning(f"User {user.email} (ID: {user.id}) exceeded daily backtest limit ({executed_today}/{max_backtests}).")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"일일 백테스트 제한({max_backtests}회)을 초과했습니다. 내일 다시 시도하거나 플랜을 업그레이드해주세요."
            )

        # 2. 전략 규칙 유효성 검사 (타임프레임 등)
        strategy = self.strategy_service.get_strategy_by_id(db, backtest_create.strategy_id)
        if not strategy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 전략을 찾을 수 없습니다.")
        if strategy.author_id != user.id:
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to use strategy {strategy.id} not owned by them for backtest.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 전략을 사용할 권한이 없습니다.")
            
        try:
            # 전략 규칙의 Pydantic 객체를 그대로 전달 (JSON 문자열이 아님)
            self.strategy_service.verify_strategy_rules_against_plan(user, strategy.rules, db)

        except HTTPException as e:
            raise HTTPException(status_code=e.status_code, detail=f"전략 규칙 유효성 검사 실패: {e.detail}")
        except Exception as e:
            logger.error(f"Unexpected error during strategy rule validation for user {user.email}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="전략 규칙 유효성 검사 중 오류가 발생했습니다.")


        # 3. 백테스트 DB 레코드 생성 (상태: pending)
        db_backtest = models.Backtest(
            user_id=user.id,
            strategy_id=backtest_create.strategy_id,
            status='pending',
            parameters=backtest_create.model_dump(mode='json', exclude_unset=True)
        )
        db.add(db_backtest)
        db.flush()
        db.refresh(db_backtest)
        logger.info(f"Backtest record created for user {user.email}, Strategy ID: {db_backtest.strategy_id} (Backtest ID: {db_backtest.id}).")

        # 4. Celery 태스크 전송
        try:
            task_result = run_backtest_task.delay(db_backtest.id)
            logger.info(f"Celery task dispatched for Backtest ID: {db_backtest.id}. Celery Task ID: {task_result.id}")
        except Exception as e:
            logger.error(f"Failed to dispatch Celery task for Backtest ID {db_backtest.id}: {e}", exc_info=True)
            db_backtest.status = 'failed_dispatch'
            db.add(db_backtest)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="백테스트 작업 시작에 실패했습니다.")

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

    def cancel_backtest_job(self, db: Session, backtest_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        """
        진행 중인 백테스팅 작업을 취소합니다.
        Celery에 취소 명령을 보내고 DB 상태를 업데이트합니다.
        """
        db_backtest = self.get_backtest_by_id(db, backtest_id)
        if not db_backtest:
            return False
        if db_backtest.user_id != user_id:
            logger.warning(f"User {user_id} attempted to cancel backtest {backtest_id} not owned by them.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 백테스트를 취소할 권한이 없습니다.")
        
        if db_backtest.status in ['completed', 'failed', 'canceled']:
            logger.warning(f"Attempted to cancel backtest {backtest_id} which is already in status: {db_backtest.status}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"백테스트가 이미 '{db_backtest.status}' 상태이므로 취소할 수 없습니다.")

        try:
            celery_app.control.revoke(str(db_backtest.id), terminate=True)

            db_backtest.status = 'canceled'
            db_backtest.updated_at = datetime.now(timezone.utc)
            db.add(db_backtest)
            logger.info(f"Backtest ID {backtest_id} (User ID: {user_id}) cancellation requested and status updated to 'canceled'.")
            return True
        except Exception as e:
            logger.error(f"Failed to send cancellation command for backtest {backtest_id}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="백테스트 취소 명령에 실패했습니다.")


backtest_service = BacktestService()