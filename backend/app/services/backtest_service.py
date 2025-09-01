# file: backend/app/services/backtest_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload, selectinload
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging
from functools import reduce
import operator

from .. import models, schemas
from ..services.plan_service import plan_service
from ..services.strategy_service import strategy_service
from ..celery_app import celery_app
from ..tasks import run_backtest


logger = logging.getLogger(__name__)

def _apply_parameter_overrides(strategy_dict: Dict[str, Any], overrides: List[Any]) -> Dict[str, Any]:
    """
    전략 딕셔너리에 'overrides' 배열을 적용합니다.
    중간 경로에 값이 없거나(None) 딕셔너리가 아닌 경우에도 에러 없이 안전하게 처리합니다.
    """
    if not overrides:
        return strategy_dict

    import copy
    modified_strategy = copy.deepcopy(strategy_dict)

    for override in overrides:
        path = override.path
        value = override.value
        if not path:
            continue

        try:
            parts = path.split('.')
            current_level = modified_strategy
            
            # 마지막 부분을 제외하고 경로를 따라 탐색
            for i, part in enumerate(parts[:-1]):
                key_or_index = int(part) if part.isdigit() else part
                
                # 다음 레벨이 존재하지 않거나, 딕셔너리/리스트가 아니면 중단
                if not isinstance(current_level, (dict, list)) or \
                   (isinstance(current_level, list) and not (0 <= key_or_index < len(current_level))):
                    raise KeyError(f"Path traversal failed at '{part}'")

                current_level = current_level[key_or_index]

            # 마지막 부분에 값 할당
            last_part = parts[-1]
            key_or_index = int(last_part) if last_part.isdigit() else last_part
            current_level[key_or_index] = value

        except (KeyError, IndexError, TypeError) as e:
            logger.warning(f"Failed to apply override for path '{path}': {e}")
            continue
            
    return modified_strategy

class BacktestService:
    """
    백테스팅 작업의 생성, 조회, 상태 관리 및 취소를 담당하는 비동기 서비스.
    """
    def __init__(self):
        self.plan_service = plan_service
        self.strategy_service = strategy_service

    async def create_backtest_job(
        self,
        db: AsyncSession,
        user: models.User,
        backtest_create: schemas.BacktestCreate
    ) -> models.Backtest:
        """
        [최종 수정 버전] 새로운 백테스팅 작업을 생성하고 Celery 큐에 추가합니다.
        명확한 스키마를 사용하여 데이터를 안정적으로 저장합니다.
        """
        # 1. 플랜 기반 제한 검사 (기존과 동일)
        user_features = await self.plan_service.get_user_plan_features(user, db)
        max_backtests = user_features.daily_backtest_count
        
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        
        query = select(func.count(models.Backtest.id)).filter(
            models.Backtest.user_id == user.id,
            models.Backtest.created_at >= today_start
        )
        result = await db.execute(query)
        executed_today = result.scalar_one()

        if executed_today >= max_backtests:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"일일 백테스트 제한({max_backtests}회)을 초과했습니다.")

        strategy = await self.strategy_service.get_strategy_by_id_with_author(db, backtest_create.strategy_id)
        if not strategy or strategy.author_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 전략을 찾을 수 없거나 권한이 없습니다.")
        
        # 2. '전략 스냅샷' 생성 (기존과 동일)
        strategy_dict = schemas.Strategy.from_orm(strategy).model_dump(mode='json', by_alias=True)
        overrides = backtest_create.parameters.overrides or []
        strategy_snapshot_dict = _apply_parameter_overrides(strategy_dict, overrides)

        # 3-1. 저장할 파라미터 객체를 'BacktestParametersPayload' 스키마로 생성합니다.
        params_to_store = schemas.BacktestParametersPayload(
            start_date=backtest_create.start_date,
            end_date=backtest_create.end_date,
            initial_capital=backtest_create.initial_capital,
            parameters=backtest_create.parameters # leverage, fee, overrides, tpsl_logic 등
        )

        # 3-2. 백테스트 DB 레코드를 생성합니다.
        db_backtest = models.Backtest(
            user_id=user.id,
            strategy_id=backtest_create.strategy_id,
            status='pending',
            parameters=params_to_store.model_dump(mode='json'),
            strategy_snapshot=strategy_snapshot_dict
        )
        
        db.add(db_backtest)
        await db.flush()
        
        # 4. Celery 태스크 전송 및 Task ID 저장 
        try:
            # countdown=1 보다 tasks.py 내부의 재시도 로직이 더 효율적입니다.
            async_result = run_backtest.delay(backtest_id=str(db_backtest.id))
            
            db_backtest.celery_task_id = async_result.id
            logger.info(f"Celery task dispatched for Backtest ID: {db_backtest.id} with Celery Task ID: {async_result.id}.")
        except Exception as e:
            logger.error(f"Failed to dispatch Celery task for Backtest ID {db_backtest.id}: {e}", exc_info=True)
            db_backtest.status = 'failed_dispatch'
            raise HTTPException(status_code=500, detail="백테스트 작업 시작에 실패했습니다.")

        return db_backtest
    
    async def get_backtests(
        self, db: AsyncSession, user_id: uuid.UUID, skip: int, limit: int,
        status_filter: Optional[str], strategy_id_filter: Optional[uuid.UUID]
    ) -> List[models.Backtest]:
        """사용자 본인의 백테스팅 기록 목록을 비동기로 조회합니다."""
        query = select(models.Backtest).options(
            joinedload(models.Backtest.result),
            joinedload(models.Backtest.strategy).selectinload(models.Strategy.backtests)

        ).filter(models.Backtest.user_id == user_id)

        if status_filter:
            query = query.filter(models.Backtest.status == status_filter)
        if strategy_id_filter:
            query = query.filter(models.Backtest.strategy_id == strategy_id_filter)

        query = query.order_by(models.Backtest.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()

    async def get_backtest_by_id(self, db: AsyncSession, backtest_id: uuid.UUID) -> Optional[models.Backtest]:
        """ID로 단일 백테스팅 기록을 Eager Loading하여 비동기로 조회합니다."""
        query = select(models.Backtest).options(
            # 기존 joinedload 옵션들은 그대로 유지합니다.
            joinedload(models.Backtest.result),
            joinedload(models.Backtest.user),
            
            # Strategy를 로드할 때(joinedload), 그 하위의 backtests 관계도 미리 로드(selectinload)하도록
            # 옵션을 연쇄적으로 적용합니다.
            joinedload(models.Backtest.strategy).selectinload(models.Strategy.backtests)

        ).filter(models.Backtest.id == backtest_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_trade_logs_for_backtest(self, db: AsyncSession, backtest_id: uuid.UUID) -> List[models.TradeLog]:
        """특정 백테스트의 거래 기록 목록을 비동기로 조회합니다."""
        query = select(models.TradeLog).filter(models.TradeLog.backtest_id == backtest_id).order_by(models.TradeLog.timestamp.asc())
        result = await db.execute(query)
        return result.scalars().all()

    async def cancel_backtest_job(self, db: AsyncSession, backtest_to_cancel: models.Backtest):
        """진행 중인 백테스팅 작업을 취소합니다."""
        if backtest_to_cancel.status not in ['pending', 'running']:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"백테스트가 이미 '{backtest_to_cancel.status}' 상태이므로 취소할 수 없습니다.")

        # [수정] DB에 저장된 Celery Task ID로 작업을 취소
        if backtest_to_cancel.celery_task_id:
            try:
                celery_app.control.revoke(backtest_to_cancel.celery_task_id, terminate=True)
                backtest_to_cancel.status = 'canceled'
                logger.info(f"Backtest ID {backtest_to_cancel.id} (Task ID: {backtest_to_cancel.celery_task_id}) cancellation requested.")
            except Exception as e:
                logger.error(f"Failed to send cancellation command for task {backtest_to_cancel.celery_task_id}: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="백테스트 취소 명령에 실패했습니다.")
        else:
            # Task ID가 없는 경우 (예: dispatch 실패)
            backtest_to_cancel.status = 'canceled'
            logger.warning(f"Backtest ID {backtest_to_cancel.id} has no Celery Task ID but was marked as canceled.")

    async def delete_backtest(self, db: AsyncSession, backtest_to_delete: models.Backtest):
        """
        특정 백테스트 기록과 관련된 모든 자식 데이터(결과, 거래 로그 등)를 삭제합니다.
        """
        # backtest 모델에 cascade="all, delete-orphan" 설정이 되어 있으므로,
        # 부모인 Backtest 객체만 삭제하면 관련된 BacktestResult, TradeLog 등이
        # 연쇄적으로 자동 삭제됩니다.
        await db.delete(backtest_to_delete)
        await db.flush()
        logger.info(f"Backtest record ID {backtest_to_delete.id} and all associated data deleted.")

backtest_service = BacktestService()