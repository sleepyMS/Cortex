# file: backend/app/services/strategy_service.py

import json
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional, Literal
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

    def _get_required_plan_level(self, strategy_data: schemas.StrategyCreate | schemas.StrategyUpdate) -> PlanType:
        """
        전략 데이터에 포함된 기능들을 재귀적으로 분석하여 필요한 최소 플랜 등급을 계산합니다.
        """
        required_level: PlanType = PlanType.BASIC
        
        def update_level(current, new):
            if new == PlanType.PRO: return PlanType.PRO
            if new == PlanType.TRADER and current == PlanType.BASIC: return PlanType.TRADER
            return current

        # 1. Target Coins 개수 검사
        if strategy_data.target_coins and len(strategy_data.target_coins) > 1:
            required_level = update_level(required_level, PlanType.TRADER)
        
        # 2. TP/SL 로직 검사
        if strategy_data.tpsl_logic and (strategy_data.tpsl_logic.atr_stop_loss_multiplier or strategy_data.tpsl_logic.atr_take_profit_multiplier):
            required_level = update_level(required_level, PlanType.TRADER)

        # 재귀적으로 모든 블록을 순회하는 헬퍼 함수 정의
        def get_all_blocks_recursive(blocks: List[schemas.LogicBlock]) -> List[schemas.LogicBlock]:
            all_blocks = []
            for block in blocks:
                all_blocks.append(block)
                if block.children:
                    all_blocks.extend(get_all_blocks_recursive(block.children))
            return all_blocks

        # 모든 규칙 세트에서 모든 블록(중첩 포함)을 가져옵니다.
        all_rules_blocks = []
        if strategy_data.long_entry_rules: all_rules_blocks.extend(get_all_blocks_recursive(strategy_data.long_entry_rules.blocks))
        if strategy_data.long_exit_rules: all_rules_blocks.extend(get_all_blocks_recursive(strategy_data.long_exit_rules.blocks))
        if strategy_data.short_entry_rules: all_rules_blocks.extend(get_all_blocks_recursive(strategy_data.short_entry_rules.blocks))
        if strategy_data.short_exit_rules: all_rules_blocks.extend(get_all_blocks_recursive(strategy_data.short_exit_rules.blocks))
        
        # 3. 모든 블록을 순회하며 플랜 레벨 검사
        has_divergence_feature = False
        for block in all_rules_blocks:
            # 다이버전스 기능 사용 여부 확인
            if isinstance(block, schemas.DivergenceLogic):
                has_divergence_feature = True

            # 타임프레임 레벨 확인
            indicator_value = None
            # Pydantic 모델의 필드 존재 여부를 안전하게 확인
            if hasattr(block, 'indicator') and isinstance(getattr(block, 'indicator', None), schemas.IndicatorValue):
                indicator_value = block.indicator
            elif hasattr(block, 'operand_a') and isinstance(getattr(block, 'operand_a', None), schemas.IndicatorValue):
                indicator_value = block.operand_a
            elif hasattr(block, 'main_line') and isinstance(getattr(block, 'main_line', None), schemas.IndicatorValue):
                indicator_value = block.main_line

            if indicator_value and indicator_value.timeframe:
                level_from_timeframe = self.plan_service.get_timeframe_level(indicator_value.timeframe)
                required_level = update_level(required_level, level_from_timeframe)

        # 다이버전스 기능이 하나라도 있으면 Pro 플랜으로 설정
        if has_divergence_feature:
            required_level = update_level(required_level, PlanType.PRO)

        return required_level

    def _verify_rules_against_plan(
        self, 
        user: models.User, 
        strategy_data: schemas.StrategyCreate | schemas.StrategyUpdate, 
        db: Session
    ) -> PlanType: 
        """
        전략 규칙이 사용자의 플랜에 맞는지 검증하고, 필요한 플랜 등급을 반환합니다.
        """
        # _get_required_plan_level 함수도 PlanType Enum을 반환한다고 가정합니다.
        required_level: models.PlanType = self._get_required_plan_level(strategy_data)
        
        # plan_service에서 가져온 사용자 플랜 이름(문자열)을 Enum 멤버로 변환합니다.
        user_plan_level_str = self.plan_service.get_user_plan_level(user, db)
        try:
            user_plan_level = models.PlanType(user_plan_level_str)
        except ValueError:
            # 혹시 모를 예외 상황에 대비 (예: DB에 잘못된 플랜 이름이 있는 경우)
            logger.error(f"User {user.email} has an invalid plan name: {user_plan_level_str}")
            raise HTTPException(status_code=500, detail="사용자 플랜 정보를 확인하는 중 오류가 발생했습니다.")

        # 이 맵은 플랜 간의 서열을 정의합니다 (Pro > Trader > Basic).
        plan_hierarchy = {
            PlanType.BASIC: 0,
            PlanType.TRADER: 1,
            PlanType.PRO: 2
        }
        
        user_level_value = plan_hierarchy.get(user_plan_level, 0)
        required_level_value = plan_hierarchy.get(required_level, 0)
        
        if user_level_value < required_level_value:
            logger.warning(f"User {user.email} attempted to use features requiring '{required_level.value}' plan with '{user_plan_level.value}' plan.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"선택한 기능은 '{required_level.value}' 플랜 이상에서 지원됩니다. 플랜을 업그레이드해주세요."
            )
        
        return required_level

    def create_strategy(
        self,
        db: Session,
        user: models.User,
        strategy_create: schemas.StrategyCreate
    ) -> models.Strategy:
        try:
            required_level = self._verify_rules_against_plan(user, strategy_create, db)
            
            serialized_data = strategy_create.model_dump(mode='json', exclude_unset=True)
            
            db_strategy = models.Strategy(
                author_id=user.id,
                name=serialized_data.get("name"),
                description=serialized_data.get("description"),
                is_public=serialized_data.get("is_public", False),
                long_entry_rules=serialized_data.get("long_entry_rules"),
                long_exit_rules=serialized_data.get("long_exit_rules"),
                short_entry_rules=serialized_data.get("short_entry_rules"),
                short_exit_rules=serialized_data.get("short_exit_rules"),
                tpsl_logic=serialized_data.get("tpsl_logic"),
                target_coins=serialized_data.get("target_coins"),
                paid_feature_level=required_level,
            )
            
            db.add(db_strategy)
            db.flush()
            db.refresh(db_strategy)

            if db_strategy.target_coins is None:
                db_strategy.target_coins = []
            
            logger.info(f"User {user.email} (ID: {user.id}) created new strategy: {db_strategy.name} (ID: {db_strategy.id}).")
            return db_strategy
        except HTTPException as e:
            db.rollback()
            raise e
        except Exception as e:
            db.rollback()
            logger.error(f"An unexpected error occurred while creating strategy for user {user.email}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="전략 생성 중 서버 오류가 발생했습니다.")


    def get_strategies(
        self,
        db: Session,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None,
        is_public_filter: Optional[bool] = None
    ) -> List[models.Strategy]:
        query = db.query(models.Strategy).filter(models.Strategy.author_id == user_id)

        if is_public_filter is not None:
            query = query.filter(models.Strategy.is_public == is_public_filter)
        if search_query:
            query = query.filter(models.Strategy.name.ilike(f"%{search_query}%"))
        
        if sort_by == "created_at_desc":
            query = query.order_by(models.Strategy.created_at.desc())
        elif sort_by == "updated_at_desc":
            query = query.order_by(models.Strategy.updated_at.desc().nullslast())
        else:
            query = query.order_by(models.Strategy.created_at.desc())
        
        strategies = query.offset(skip).limit(limit).all()

        for strategy in strategies:
            if strategy.target_coins is None:
                strategy.target_coins = []
        
        logger.info(f"User ID {user_id} fetched {len(strategies)} strategies.")
        return strategies

    def get_strategy_by_id(self, db: Session, strategy_id: uuid.UUID) -> models.Strategy | None:
        strategy = db.query(models.Strategy).options(
            joinedload(models.Strategy.author)
        ).filter(models.Strategy.id == strategy_id).first()
            
        return strategy

    def update_strategy(
        self,
        db: Session,
        strategy_to_update: models.Strategy,
        strategy_update_data: schemas.StrategyUpdate
    ) -> models.Strategy:
        """
        전략을 업데이트합니다.
        (다른 세션에서 온 객체를 현재 세션에 병합하여 처리합니다.)
        """
        try:
            # 플랜 검증 로직은 동일하게 유지
            required_level = self._verify_rules_against_plan(strategy_to_update.author, strategy_update_data, db)
            
            # merge는 현재 세션에 병합된 객체를 반환하므로, 이 객체를 이후에 사용.
            merged_strategy = db.merge(strategy_to_update)

            update_data = strategy_update_data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(merged_strategy, key, value)
            
            merged_strategy.paid_feature_level = required_level
            
            db.flush()
            db.refresh(merged_strategy) # 병합된 객체를 refresh 합니다.
            
            logger.info(f"Strategy {merged_strategy.id} updated by user {merged_strategy.author_id}.")
            return merged_strategy
        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating strategy {strategy_to_update.id}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="전략 업데이트 중 서버 오류가 발생했습니다.")
        
    def delete_strategy(
        self,
        db: Session,
        strategy_to_delete: models.Strategy
    ) -> None:
        """
        전략을 삭제합니다.
        (라우터의 의존성 계층에서 소유권 검증이 완료되었다고 가정합니다.)
        """
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