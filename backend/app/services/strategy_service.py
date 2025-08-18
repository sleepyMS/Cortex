# file: backend/app/services/strategy_service.py

import json
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, asc, desc, cast, String
from fastapi import HTTPException, status
from typing import List, Optional
import uuid

from .. import models, schemas
from ..models import PlanType
from ..services.plan_service import plan_service
import logging

logger = logging.getLogger(__name__)


class StrategyService:
    """
    투자 전략의 생성, 조회, 수정, 삭제 및 유효성 검증을 담당하는 서비스.
    """
    def __init__(self):
        self.plan_service = plan_service

    # _get_required_plan_level, _verify_rules_against_plan, create_strategy 함수는 변경 사항이 없습니다.
    # 기존 코드와 동일하게 유지합니다.
    def _get_required_plan_level(self, strategy_data: schemas.StrategyCreate | schemas.StrategyUpdate) -> PlanType:
        required_level: PlanType = PlanType.BASIC
        def update_level(current, new):
            if new == PlanType.PRO: return PlanType.PRO
            if new == PlanType.TRADER and current == PlanType.BASIC: return PlanType.TRADER
            return current
        if strategy_data.target_coins and len(strategy_data.target_coins) > 1:
            required_level = update_level(required_level, PlanType.TRADER)
        if strategy_data.tpsl_logic and (strategy_data.tpsl_logic.atr_stop_loss_multiplier or strategy_data.tpsl_logic.atr_take_profit_multiplier):
            required_level = update_level(required_level, PlanType.TRADER)
        def get_all_blocks_recursive(blocks: List[schemas.LogicBlock]) -> List[schemas.LogicBlock]:
            all_blocks = []
            for block in blocks:
                all_blocks.append(block)
                if hasattr(block, 'children') and block.children:
                    all_blocks.extend(get_all_blocks_recursive(block.children))
            return all_blocks
        all_rules_blocks = []
        if strategy_data.long_entry_rules: all_rules_blocks.extend(get_all_blocks_recursive(strategy_data.long_entry_rules.blocks))
        if strategy_data.long_exit_rules: all_rules_blocks.extend(get_all_blocks_recursive(strategy_data.long_exit_rules.blocks))
        if strategy_data.short_entry_rules: all_rules_blocks.extend(get_all_blocks_recursive(strategy_data.short_entry_rules.blocks))
        if strategy_data.short_exit_rules: all_rules_blocks.extend(get_all_blocks_recursive(strategy_data.short_exit_rules.blocks))
        has_divergence_feature = False
        for block in all_rules_blocks:
            if isinstance(block, schemas.DivergenceLogic): has_divergence_feature = True
            indicator_value = None
            if hasattr(block, 'indicator') and isinstance(getattr(block, 'indicator', None), schemas.IndicatorValue): indicator_value = block.indicator
            elif hasattr(block, 'operand_a') and isinstance(getattr(block, 'operand_a', None), schemas.IndicatorValue): indicator_value = block.operand_a
            elif hasattr(block, 'main_line') and isinstance(getattr(block, 'main_line', None), schemas.IndicatorValue): indicator_value = block.main_line
            if indicator_value and indicator_value.timeframe:
                level_from_timeframe = self.plan_service.get_timeframe_level(indicator_value.timeframe)
                required_level = update_level(required_level, level_from_timeframe)
        if has_divergence_feature: required_level = update_level(required_level, PlanType.PRO)
        return required_level

    def _verify_rules_against_plan(self, user: models.User, strategy_data: schemas.StrategyCreate | schemas.StrategyUpdate, db: Session) -> PlanType:
        required_level: models.PlanType = self._get_required_plan_level(strategy_data)
        user_plan_level_str = self.plan_service.get_user_plan_level(user, db)
        try: user_plan_level = models.PlanType(user_plan_level_str)
        except ValueError:
            logger.error(f"User {user.email} has an invalid plan name: {user_plan_level_str}")
            raise HTTPException(status_code=500, detail="사용자 플랜 정보를 확인하는 중 오류가 발생했습니다.")
        plan_hierarchy = { PlanType.BASIC: 0, PlanType.TRADER: 1, PlanType.PRO: 2 }
        if plan_hierarchy.get(user_plan_level, 0) < plan_hierarchy.get(required_level, 0):
            logger.warning(f"User {user.email} attempted to use features requiring '{required_level.value}' plan with '{user_plan_level.value}' plan.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"선택한 기능은 '{required_level.value}' 플랜 이상에서 지원됩니다. 플랜을 업그레이드해주세요.")
        return required_level

    def create_strategy(self, db: Session, user: models.User, strategy_create: schemas.StrategyCreate) -> models.Strategy:
        try:
            required_level = self._verify_rules_against_plan(user, strategy_create, db)
            serialized_data = strategy_create.model_dump(mode='json', exclude_unset=True)
            db_strategy = models.Strategy(
                author_id=user.id, name=serialized_data.get("name"), description=serialized_data.get("description"),
                is_public=serialized_data.get("is_public", False), long_entry_rules=serialized_data.get("long_entry_rules"),
                long_exit_rules=serialized_data.get("long_exit_rules"), short_entry_rules=serialized_data.get("short_entry_rules"),
                short_exit_rules=serialized_data.get("short_exit_rules"), tpsl_logic=serialized_data.get("tpsl_logic"),
                target_coins=serialized_data.get("target_coins"), paid_feature_level=required_level,
            )
            db.add(db_strategy)
            db.flush()
            db.refresh(db_strategy)
            if db_strategy.target_coins is None: db_strategy.target_coins = []
            logger.info(f"User {user.email} (ID: {user.id}) created new strategy: {db_strategy.name} (ID: {db_strategy.id}).")
            return db_strategy
        except HTTPException as e:
            db.rollback(); raise e
        except Exception as e:
            db.rollback()
            logger.error(f"An unexpected error occurred while creating strategy for user {user.email}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="전략 생성 중 서버 오류가 발생했습니다.")

    # ▼▼▼ [핵심 개선 함수] ▼▼▼
    def get_strategies(
        self,
        db: Session,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None,
        is_public_filter: Optional[bool] = None,
        indicator_filter: Optional[str] = None
    ) -> List[models.Strategy]:
        """
        사용자의 전략 목록을 조회하며, 각 전략의 가장 최신 백테스트 요약 정보를 함께 반환합니다.
        N+1 쿼리 문제를 해결하기 위해 Window Function을 사용한 서브쿼리를 활용합니다.
        """
        # 1. 각 전략별로 가장 최신 백테스트를 찾는 서브쿼리(CTE) 생성
        # ROW_NUMBER() 윈도우 함수를 사용하여 strategy_id 그룹 내에서 created_at이 최신인 row에 1번을 부여
        latest_backtest_subquery = (
            db.query(
                models.Backtest.strategy_id,
                models.BacktestResult.total_return_pct,
                models.BacktestResult.win_rate_pct,
                func.row_number().over(
                    partition_by=models.Backtest.strategy_id,
                    order_by=models.Backtest.created_at.desc()
                ).label("row_num")
            )
            .join(models.BacktestResult, models.Backtest.id == models.BacktestResult.backtest_id)
            .filter(models.Backtest.status == 'completed')
            .subquery('latest_backtest')
        )

        # 2. 메인 쿼리: Strategy 모델과 위에서 만든 서브쿼리를 LEFT JOIN
        query = db.query(
            models.Strategy,
            latest_backtest_subquery.c.total_return_pct,
            latest_backtest_subquery.c.win_rate_pct
        ).outerjoin(
            latest_backtest_subquery,
            (models.Strategy.id == latest_backtest_subquery.c.strategy_id) &
            (latest_backtest_subquery.c.row_num == 1) # 각 그룹에서 1번 row(가장 최신)만 조인
        ).filter(models.Strategy.author_id == user_id)

        # 3. 기존 필터링 로직 적용
        if is_public_filter is not None:
            query = query.filter(models.Strategy.is_public == is_public_filter)
        if search_query:
            query = query.filter(models.Strategy.name.ilike(f"%{search_query}%"))
        if indicator_filter:
            like_pattern = f'%\"indicatorKey\": \"{indicator_filter}\"%'
            query = query.filter(
                (cast(models.Strategy.long_entry_rules, String).like(like_pattern)) |
                (cast(models.Strategy.long_exit_rules, String).like(like_pattern)) |
                (cast(models.Strategy.short_entry_rules, String).like(like_pattern)) |
                (cast(models.Strategy.short_exit_rules, String).like(like_pattern))
            )
            
        # 4. 정렬 로직 적용
        if sort_by == "name_asc":
            query = query.order_by(asc(models.Strategy.name))
        elif sort_by == "updated_at_desc":
            query = query.order_by(desc(models.Strategy.updated_at).nullslast())
        else: # 기본 정렬
            query = query.order_by(desc(models.Strategy.created_at))

        # 5. 페이징 처리 및 쿼리 실행
        results = query.offset(skip).limit(limit).all()

        # 6. 결과 재구성: 쿼리 결과를 Strategy 객체에 맞게 가공
        strategies_with_summary = []
        for strategy, total_return, win_rate in results:
            if strategy.target_coins is None:
                strategy.target_coins = []

            # SQLAlchemy 모델 객체에 직접 새 속성을 추가하여 Pydantic이 인식하도록 함
            strategy.latest_backtest_summary = None
            if total_return is not None:
                strategy.latest_backtest_summary = schemas.BacktestResultSummaryForCard(
                    total_return_pct=total_return,
                    win_rate_pct=win_rate
                )
            strategies_with_summary.append(strategy)
        
        logger.info(f"User ID {user_id} fetched {len(strategies_with_summary)} strategies with performance summary.")
        return strategies_with_summary

    def get_strategy_by_id(self, db: Session, strategy_id: uuid.UUID) -> models.Strategy | None:
        strategy = db.query(models.Strategy).options(
            joinedload(models.Strategy.author)
        ).filter(models.Strategy.id == strategy_id).first()
        return strategy

    def update_strategy(self, db: Session, strategy_to_update: models.Strategy, strategy_update_data: schemas.StrategyUpdate) -> models.Strategy:
        try:
            required_level = self._verify_rules_against_plan(strategy_to_update.author, strategy_update_data, db)
            merged_strategy = db.merge(strategy_to_update)
            update_data = strategy_update_data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(merged_strategy, key, value)
            merged_strategy.paid_feature_level = required_level
            db.flush()
            db.refresh(merged_strategy)
            logger.info(f"Strategy {merged_strategy.id} updated by user {merged_strategy.author_id}.")
            return merged_strategy
        except HTTPException:
            db.rollback(); raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating strategy {strategy_to_update.id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="전략 업데이트 중 서버 오류가 발생했습니다.")
        
    def delete_strategy(self, db: Session, strategy_to_delete: models.Strategy) -> None:
        active_bots_using_strategy = db.query(models.LiveBot).filter(
            models.LiveBot.strategy_id == strategy_to_delete.id,
            models.LiveBot.status.in_(['active', 'paused', 'initializing'])
        ).first()
        if active_bots_using_strategy:
            logger.warning(f"User {strategy_to_delete.author_id} attempted to delete strategy {strategy_to_delete.id} which is used by active bot {active_bots_using_strategy.id}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이 전략을 사용하는 활성 봇이 있습니다. 먼저 봇을 중지하거나 삭제해주세요.")
        db.delete(strategy_to_delete)
        db.flush()
        logger.info(f"Strategy {strategy_to_delete.id} deleted by user {strategy_to_delete.author_id}.")
        return

strategy_service = StrategyService()