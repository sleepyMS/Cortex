# file: backend/app/services/backtest_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from sqlalchemy.orm import joinedload, selectinload
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging
from functools import reduce
import operator

from ..models import BacktestStatus
from .. import models, schemas
from ..services.plan_service import plan_service
from ..services.strategy_service import strategy_service
from ..celery_app import celery_app
from ..tasks import run_backtest
from ..services.cost_calculator import cost_calculator_service
from ..services.credit_service import credit_service
from ..services.marketplace_service import marketplace_service # check_strategy_purchase를 위해 추가


logger = logging.getLogger(__name__)

def _apply_parameter_overrides(strategy_dict: Dict[str, Any], overrides: List[Any]) -> Dict[str, Any]:
    """
    [최종 안정화 버전] 프론트엔드로부터 받은 잠재적으로 부정확한 경로를
    백엔드 데이터 구조에 맞게 '사전 정제(Sanitize)'하여 안전하게 오버라이드를 적용합니다.
    """
    if not overrides:
        return strategy_dict

    import copy
    modified_strategy = copy.deepcopy(strategy_dict)

    for override in overrides:
        # --- [핵심 수정] ---
        # override는 Pydantic 모델 객체이므로, .path와 .value로 직접 접근합니다.
        # 불필요하고 오류를 유발하는 getattr, .get()을 제거합니다.
        path_str_raw = override.path
        value = override.value
        # -------------------
        
        if not path_str_raw:
            continue

        try:
            # --- [핵심 해결 로직] ---
            # 경로 탐색을 시작하기 전에, 프론트엔드의 '.children.blocks.' 패턴을
            # 백엔드 데이터 구조인 '.children.'으로 미리 변환합니다.
            sanitized_path = path_str_raw.replace(".children.blocks.", ".children.")
            parts = sanitized_path.split('.')
            # -------------------------

            current_level = modified_strategy
            
            # 이제 정제된 경로를 사용하므로, 루프 내에 복잡한 조건문이 필요 없습니다.
            for part in parts[:-1]:
                key_or_index = int(part) if part.isdigit() else part
                
                if current_level is None or not isinstance(current_level, (dict, list)):
                    raise TypeError(f"Cannot traverse path at '{part}', current level is not a collection.")

                current_level = current_level[key_or_index]

            # 마지막 부분에 값 할당
            last_part = parts[-1]
            key_or_index = int(last_part) if last_part.isdigit() else last_part
            
            if current_level is not None and key_or_index in current_level:
                current_level[key_or_index] = value

        except (KeyError, IndexError, TypeError) as e:
            logger.warning(f"Failed to apply override for path '{path_str_raw}': {e}")
            continue
            
    return modified_strategy

class BacktestService:
    """
    백테스팅 작업의 생성, 조회, 상태 관리 및 취소를 담당하는 비동기 서비스.
    """
    def __init__(self):
        self.plan_service = plan_service
        self.strategy_service = strategy_service

    async def _create_backtest_db_entry(
        self, db: AsyncSession, user: models.User, backtest_create: schemas.BacktestCreate
    ) -> models.Backtest:
        """
        [최종 수정 버전] DB에 Backtest 객체를 생성하고, 실행에 필요한 모든 파라미터를
        'BacktestParametersPayload' 스키마에 맞춰 일관된 구조로 저장합니다.
        """
        # 1. 전략 조회 및 실행 권한 확인 
        strategy = await strategy_service.get_strategy_by_id(db, backtest_create.strategy_id)
        
        is_author = strategy and strategy.author_id == user.id
        is_purchased = not is_author and await marketplace_service.check_strategy_purchase(db, user.id, strategy.id)

        if not (is_author or is_purchased):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="선택한 전략을 찾을 수 없거나 권한이 없습니다.")

        # 2. 파라미터 오버라이드가 적용된 '전략 스냅샷' 생성 
        strategy_dict = schemas.StrategyForSnapshot.model_validate(strategy, from_attributes=True).model_dump(
            mode='json', 
            by_alias=True 
        )

        # [핵심] 이제 _apply_parameter_overrides 함수가 모든 오버라이드를 처리합니다.
        overrides = backtest_create.parameters.overrides or []
        strategy_snapshot_dict = _apply_parameter_overrides(strategy_dict, overrides)
        
        # --- [제거] 아래의 중복된 tpslLogic 처리 로직을 완전히 삭제합니다. ---
        # if backtest_create.parameters.tpsl_logic:
        #     tpsl_override_dict = backtest_create.parameters.tpsl_logic.model_dump(
        #         mode='json', by_alias=True, exclude_unset=True
        #     )
        #     if strategy_snapshot_dict.get('tpslLogic') is None:
        #         strategy_snapshot_dict['tpslLogic'] = {}
        #     strategy_snapshot_dict['tpslLogic'].update(tpsl_override_dict)
        # -----------------------------------------------------------------
        
        params_to_store = schemas.BacktestParametersPayload(
            start_date=backtest_create.start_date,
            end_date=backtest_create.end_date,
            initial_capital=backtest_create.initial_capital,
            # [수정] payload의 parameters에서 tpslLogic이 제거되었으므로,
            # 백엔드 스키마도 이에 맞춰 업데이트하거나, 아래처럼 필요한 부분만 전달합니다.
            parameters=schemas.BacktestExecutionParameters(
                leverage=backtest_create.parameters.leverage,
                fee=backtest_create.parameters.fee,
                slippage=backtest_create.parameters.slippage,
                overrides=overrides
            )
        )
        
        db_backtest = models.Backtest(
            user_id=user.id,
            strategy_id=backtest_create.strategy_id,
            status=BacktestStatus.PENDING,
            parameters=params_to_store.model_dump(mode='json'),
            strategy_snapshot=strategy_snapshot_dict
        )

        db_backtest.strategy = strategy
        
        db.add(db_backtest)
        await db.flush()
        return db_backtest

    async def request_backtest_transactional(
        self, db: AsyncSession, user: models.User, backtest_create: schemas.BacktestCreate
    ) -> models.Backtest:
        """
        백테스트 요청의 모든 과정을 처리합니다.
        트랜잭션 관리와 비용 계산은 각각의 책임있는 서비스에 위임합니다.
        """
        # --- 1. 비용 계산 (매우 간소화됨) ---
        cost_estimation = await cost_calculator_service.calculate_cost_from_api_request(
            db, user, backtest_create
        )

        # --- 2. 크레딧 차감 및 백테스트 생성 ---
        credit_transaction = await credit_service.deduct_credits(
            db=db, user_id=user.id, amount_to_deduct=cost_estimation.final_cost,
            discount_pct=cost_estimation.discount_pct, related_entity_type="BACKTEST"
        )

        new_backtest = await self._create_backtest_db_entry(db, user, backtest_create)

        credit_transaction.related_entity_id = new_backtest.id
        db.add(credit_transaction)

        # flush를 통해 new_backtest.id를 확정합니다.
        await db.flush() 

        # celery_task_id는 라우터에서 업데이트 후 채워질 것이므로 여기서는 다루지 않습니다.
        # final_backtest_obj 조회 및 반환 로직도 라우터에서 필요 시 수행하도록 단순화할 수 있습니다.
        # 우선은 생성된 new_backtest 객체를 바로 반환합니다.
        return new_backtest
            
    async def get_backtest_by_id_for_user(
        self, db: AsyncSession, backtest_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[models.Backtest]:
        """ID와 사용자 ID로 단일 백테스팅 기록을 조회하며 소유권을 검증합니다."""
        query = select(models.Backtest).options(
            joinedload(models.Backtest.result),
            joinedload(models.Backtest.user),
            joinedload(models.Backtest.strategy).selectinload(models.Strategy.backtests)
        ).filter(models.Backtest.id == backtest_id)
        
        backtest = await db.scalar(query)

        if not backtest:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="백테스트를 찾을 수 없습니다.")
        if backtest.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 백테스트에 접근할 권한이 없습니다.")
            
        return backtest
    
    async def get_backtests(
        self, db: AsyncSession, user_id: uuid.UUID, skip: int, limit: int,
        status_filter: Optional[str], strategy_id_filter: Optional[uuid.UUID]
    ) -> List[models.Backtest]:
        """
        사용자 본인의 백테스팅 기록 '목록'을 위한 데이터를 조회합니다.
        무거운 중첩 관계(strategy.backtests)는 로드하지 않습니다.
        """
        query = select(models.Backtest).options(
            # 목록 표시에 필요한 result와 strategy의 기본 정보만 Eager Loading합니다.
            joinedload(models.Backtest.result),
            joinedload(models.Backtest.strategy)
        # [수정] 불필요하고 성능을 저하시키는 중첩 Eager Loading을 제거합니다.
        # .selectinload(models.Strategy.backtests) <-- 이 부분을 삭제
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
        if backtest_to_cancel.status not in [BacktestStatus.PENDING, BacktestStatus.RUNNING]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"백테스트가 이미 '{backtest_to_cancel.status}' 상태이므로 취소할 수 없습니다.")

        # [수정] DB에 저장된 Celery Task ID로 작업을 취소
        if backtest_to_cancel.celery_task_id:
            try:
                celery_app.control.revoke(backtest_to_cancel.celery_task_id, terminate=True)
                backtest_to_cancel.status = BacktestStatus.CANCELED
                logger.info(f"Backtest ID {backtest_to_cancel.id} (Task ID: {backtest_to_cancel.celery_task_id}) cancellation requested.")
            except Exception as e:
                logger.error(f"Failed to send cancellation command for task {backtest_to_cancel.celery_task_id}: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="백테스트 취소 명령에 실패했습니다.")
        else:
            # Task ID가 없는 경우 (예: dispatch 실패)
            backtest_to_cancel.status = BacktestStatus.CANCELED
            logger.warning(f"Backtest ID {backtest_to_cancel.id} has no Celery Task ID but was marked as canceled.")

    async def delete_backtest(self, db: AsyncSession, backtest_to_delete: models.Backtest):
        """
        특정 백테스트 기록과 관련된 모든 자식 데이터(결과, 거래 로그 등)를 삭제합니다.
        """
        # --- [핵심 수정] ---
        # 1. 삭제하려는 백테스트를 '대표 백테스트'로 사용하는 모든 상품을 찾습니다.
        # 2. 해당 상품들의 representative_backtest_id를 NULL로 업데이트하여 연결을 끊습니다.
        stmt = (
            update(models.MarketplaceProduct)
            .where(models.MarketplaceProduct.representative_backtest_id == backtest_to_delete.id)
            .values(representative_backtest_id=None)
        )
        await db.execute(stmt)
        # -------------------
        
        # 연결이 모두 해제되었으므로, 이제 안전하게 백테스트를 삭제할 수 있습니다.
        await db.delete(backtest_to_delete)
        await db.flush()
        logger.info(f"Backtest record ID {backtest_to_delete.id} and all associated data deleted.")

backtest_service = BacktestService()