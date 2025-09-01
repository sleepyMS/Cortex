# file: backend/app/services/strategy_service.py

import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import func, select, cast, String, or_
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional, Union
import uuid
import asyncio

from .. import models, schemas
from ..models import PlanType
from ..services.plan_service import plan_service
import logging

logger = logging.getLogger(__name__)

class StrategyService:
    """
    투자 전략의 생성, 조회, 수정, 삭제 및 유효성 검증을 담당하는 비동기 서비스.
    """
    def __init__(self):
        self.plan_service = plan_service

    async def _get_required_plan_level(self, strategy_data: Union[schemas.StrategyCreate, schemas.StrategyUpdate]) -> PlanType:
        """전략 데이터에 포함된 기능들을 분석하여 필요한 최소 플랜 등급을 계산합니다."""
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
            if block.type == "divergence":
                has_divergence_feature = True

            indicator_value = None
            if hasattr(block, 'indicator') and isinstance(getattr(block, 'indicator', None), schemas.IndicatorValue): indicator_value = block.indicator
            elif hasattr(block, 'operand_a') and isinstance(getattr(block, 'operand_a', None), schemas.IndicatorValue): indicator_value = block.operand_a
            elif hasattr(block, 'main_line') and isinstance(getattr(block, 'main_line', None), schemas.IndicatorValue): indicator_value = block.main_line

            if indicator_value and indicator_value.timeframe:
                level_from_timeframe = self.plan_service.get_timeframe_level(indicator_value.timeframe)
                required_level = update_level(required_level, level_from_timeframe)

        if has_divergence_feature:
            required_level = update_level(required_level, PlanType.PRO)

        return required_level

    async def _verify_rules_against_plan(self, user: models.User, strategy_data: Union[schemas.StrategyCreate, schemas.StrategyUpdate], db: AsyncSession) -> PlanType:
        """전략 규칙이 사용자의 플랜에 맞는지 검증합니다."""
        required_level = await self._get_required_plan_level(strategy_data)
        user_plan_level_str = await self.plan_service.get_user_plan_level(user, db)
        
        try:
            user_plan_level = models.PlanType(user_plan_level_str)
        except ValueError:
            logger.error(f"User {user.email} has an invalid plan name: {user_plan_level_str}")
            raise HTTPException(status_code=500, detail="사용자 플랜 정보를 확인하는 중 오류가 발생했습니다.")

        plan_hierarchy = { PlanType.BASIC: 0, PlanType.TRADER: 1, PlanType.PRO: 2 }
        
        if plan_hierarchy.get(user_plan_level, 0) < plan_hierarchy.get(required_level, 0):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"선택한 기능은 '{required_level.value}' 플랜 이상에서 지원됩니다.")
        
        return required_level

    async def create_strategy(self, db: AsyncSession, user: models.User, strategy_create: schemas.StrategyCreate) -> models.Strategy:
        """새로운 투자 전략을 생성합니다."""
        required_level = await self._verify_rules_against_plan(user, strategy_create, db)
        
        serialized_data = strategy_create.model_dump(mode='json', exclude_unset=True)
        db_strategy = models.Strategy(**serialized_data, author_id=user.id, paid_feature_level=required_level)
        
        db.add(db_strategy)
        await db.flush()
        return db_strategy

    async def get_strategy_by_id(self, db: AsyncSession, strategy_id: uuid.UUID) -> Optional[models.Strategy]:
        """ID로 단일 전략을 조회합니다."""
        result = await db.execute(select(models.Strategy).filter(models.Strategy.id == strategy_id))
        return result.scalar_one_or_none()

    async def get_strategy_by_id_with_author(self, db: AsyncSession, strategy_id: uuid.UUID) -> Optional[models.Strategy]:
        """ID로 단일 전략을 조회하며, 작성자(author) 정보도 함께 로드합니다."""
        query = select(models.Strategy).options(joinedload(models.Strategy.author)).filter(models.Strategy.id == strategy_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_strategies(
        self, db: AsyncSession, user_id: uuid.UUID, skip: int, limit: int,
        search_query: Optional[str], sort_by: Optional[str], is_public_filter: Optional[bool],
        indicator_filter: Optional[str]
    ) -> List[models.Strategy]:
        """사용자의 전략 목록을 조회하며, 최신 백테스트 요약 정보도 함께 반환합니다."""
        latest_backtest_subquery = (
            select(
                models.Backtest.strategy_id,
                models.BacktestResult.total_return_pct,
                models.BacktestResult.win_rate_pct,
                models.BacktestResult.mdd_pct,
                models.BacktestResult.sharpe_ratio,
                models.BacktestResult.profit_factor,
                models.BacktestResult.sortino_ratio, 
                func.row_number().over(
                    partition_by=models.Backtest.strategy_id,
                    order_by=models.Backtest.created_at.desc()
                ).label("row_num")
            )
            .join(models.BacktestResult, models.Backtest.id == models.BacktestResult.backtest_id)
            .filter(models.Backtest.status == 'completed')
            .subquery('latest_backtest')
        )

        purchased_strategy_ids_subquery = (
            select(models.UserPurchasedStrategy.strategy_id)
            .filter(models.UserPurchasedStrategy.user_id == user_id)
        )

        query = select(
            models.Strategy,
            latest_backtest_subquery.c.total_return_pct,
            latest_backtest_subquery.c.win_rate_pct,
            latest_backtest_subquery.c.mdd_pct,
            latest_backtest_subquery.c.sharpe_ratio,
            latest_backtest_subquery.c.profit_factor,
            latest_backtest_subquery.c.sortino_ratio,
        ).outerjoin(
            latest_backtest_subquery,
            (models.Strategy.id == latest_backtest_subquery.c.strategy_id) & (latest_backtest_subquery.c.row_num == 1)
        ).filter(
            or_(
                models.Strategy.author_id == user_id,
                models.Strategy.id.in_(purchased_strategy_ids_subquery)
            )
        )
        if is_public_filter is not None: query = query.filter(models.Strategy.is_public == is_public_filter)
        if search_query: query = query.filter(models.Strategy.name.ilike(f"%{search_query}%"))
        if indicator_filter:
            like_pattern = f'%\"indicatorKey\": \"{indicator_filter}\"%'
            query = query.filter(
                (cast(models.Strategy.long_entry_rules, String).like(like_pattern)) | (cast(models.Strategy.long_exit_rules, String).like(like_pattern)) |
                (cast(models.Strategy.short_entry_rules, String).like(like_pattern)) | (cast(models.Strategy.short_exit_rules, String).like(like_pattern))
            )
            
        if sort_by == "updated_at_desc": query = query.order_by(models.Strategy.updated_at.desc().nullslast())
        else: query = query.order_by(models.Strategy.created_at.desc())

        results = await db.execute(query.offset(skip).limit(limit))
        
        strategies_with_summary = []
        for strategy, total_return, win_rate, mdd, sharpe, profit, sortino in results:
            strategy.latest_backtest_summary = None
            if total_return is not None:
                # API 응답 시에는 camelCase를 사용합니다.
                strategy.latest_backtest_summary = schemas.BacktestResultSummaryForCard(
                    total_return_pct=total_return, 
                    win_rate_pct=win_rate,
                    mdd_pct=mdd,
                    sharpe_ratio=sharpe,
                    profit_factor=profit,
                    sortino_ratio=sortino
                )
            strategies_with_summary.append(strategy)
        
        return strategies_with_summary

    async def update_strategy(
        self, db: AsyncSession, strategy_to_update: models.Strategy, strategy_update_data: schemas.StrategyUpdate
    ) -> models.Strategy:
        """전략을 업데이트합니다."""
        required_level = await self._verify_rules_against_plan(strategy_to_update.author, strategy_update_data, db)
        update_data = strategy_update_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(strategy_to_update, key, value)
        strategy_to_update.paid_feature_level = required_level
        await db.flush(); await db.refresh(strategy_to_update)
        return strategy_to_update

    async def delete_strategy(self, db: AsyncSession, strategy_to_delete: models.Strategy):
        """전략을 삭제합니다."""
        result = await db.execute(
            select(models.LiveBot).filter(
                models.LiveBot.strategy_id == strategy_to_delete.id,
                models.LiveBot.status.in_(['active', 'paused', 'initializing'])
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이 전략을 사용하는 활성 봇이 있습니다.")
        await db.delete(strategy_to_delete)
        await db.flush()

strategy_service = StrategyService()