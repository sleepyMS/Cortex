# file: backend/app/services/strategy_service.py (수정)

import json
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional, Literal

from .. import models, schemas
from .plan_service import plan_service
import logging

logger = logging.getLogger(__name__)

class StrategyService:
    """
    투자 전략의 생성, 조회, 수정, 삭제 및 유효성 검증을 담당하는 서비스.
    """
    def __init__(self):
        self.plan_service = plan_service

    # _load_rules_from_json_data 함수는 더 이상 필요하지 않습니다.
    # FastAPI의 response_model=schemas.Strategy가 자동으로 처리합니다.
    # 이 함수는 제거하거나, 필요한 경우 다른 용도로 재정의해야 합니다.
    def _load_rules_from_json_data(
        self,
        rules_json_data: Dict[str, Any]
    ) -> Dict[Literal["buy", "sell"], List[schemas.SignalBlockData]]:
        loaded_rules: Dict[Literal["buy", "sell"], List[schemas.SignalBlockData]] = {
            "buy": [],
            "sell": []
        }
        for rule_type in ["buy", "sell"]:
            if rule_type in rules_json_data and isinstance(rules_json_data[rule_type], list):
                for rule_data in rules_json_data[rule_type]:
                    try:
                        loaded_rules[rule_type].append(
                            schemas.SignalBlockData.model_validate(rule_data)
                        )
                    except Exception as e:
                        logger.error(f"Failed to validate SignalBlockData from DB JSON for type {rule_type}: {e} (Data: {rule_data})", exc_info=True)
                        pass
        return loaded_rules


    def verify_strategy_rules_against_plan(
        self,
        user: models.User,
        rules: Dict[Literal["buy", "sell"], List[schemas.SignalBlockData]],
        db: Session
    ) -> None:
        allowed_timeframes = self.plan_service.get_user_allowed_timeframes(user, db)
        
        def _check_conditions_recursive(signal_blocks: List[schemas.SignalBlockData]):
            for block in signal_blocks:
                for condition_key in ["conditionA", "conditionB"]:
                    condition = getattr(block, condition_key)
                    if condition and condition.type == "indicator":
                        if isinstance(condition.value, schemas.IndicatorValue):
                            indicator_timeframe = condition.value.timeframe
                            if indicator_timeframe not in allowed_timeframes:
                                logger.warning(f"User {user.email} attempted to use disallowed timeframe '{indicator_timeframe}' for strategy rules.")
                                raise HTTPException(
                                    status_code=status.HTTP_403_FORBIDDEN,
                                    detail=f"선택한 타임프레임 '{indicator_timeframe}'은 현재 플랜에서 지원되지 않습니다. 플랜을 업그레이드해주세요."
                                )
                        else:
                            logger.error(f"Strategy rule has indicator type but value is not IndicatorValue schema: {condition.value}")
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="전략 규칙의 지표 형식이 올바르지 않습니다."
                            )
                _check_conditions_recursive(block.children) 

        _check_conditions_recursive(rules.get("buy", []))
        _check_conditions_recursive(rules.get("sell", []))
        logger.info(f"User {user.email} strategy rules successfully verified against plan timeframes.")


    def create_strategy(
        self,
        db: Session,
        user: models.User,
        strategy_create: schemas.StrategyCreate
    ) -> models.Strategy:
        try:
            self.verify_strategy_rules_against_plan(user, strategy_create.rules, db)
        except HTTPException as e:
            logger.error(f"Strategy rule validation failed during creation for user {user.email}: {e.detail}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred during rule validation for user {user.email}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="전략 규칙 유효성 검사 중 예상치 못한 오류가 발생했습니다.")

        serialized_rules = {
            "buy": [rule.model_dump(mode='json') for rule in strategy_create.rules.get("buy", [])],
            "sell": [rule.model_dump(mode='json') for rule in strategy_create.rules.get("sell", [])]
        }
        
        db_strategy = models.Strategy(
            author_id=user.id,
            name=strategy_create.name,
            description=strategy_create.description,
            rules=serialized_rules, # 👈 json.dumps() 제거
            is_public=strategy_create.is_public
        )
        db.add(db_strategy)
        db.flush()
        # db.refresh(db_strategy) # 이 refresh는 필요 없습니다.

        # 👈 rules 필드를 Pydantic 모델로 변환하는 로직을 제거
        # 라우터의 response_model=schemas.Strategy가 이 역할을 수행합니다.
        
        logger.info(f"User {user.email} (ID: {user.id}) created new strategy: {db_strategy.name} (ID: {db_strategy.id}).")
        return db_strategy

    def get_strategies(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None,
        is_public_filter: Optional[bool] = None
    ) -> List[models.Strategy]:
        """
        사용자 본인의 전략 목록 또는 공개 전략 목록을 조회합니다.
        """
        query = db.query(models.Strategy).filter(models.Strategy.author_id == user_id)

        logger.info(f"get_strategies received is_public_filter: {is_public_filter} (type: {type(is_public_filter)})")

        if is_public_filter is not None:
            query = query.filter(models.Strategy.is_public == is_public_filter)

        if search_query:
            query = query.filter(models.Strategy.name.ilike(f"%{search_query}%"))

        # 정렬 로직
        if sort_by == "created_at_desc":
            query = query.order_by(models.Strategy.created_at.desc())
        elif sort_by == "created_at_asc":
            query = query.order_by(models.Strategy.created_at.asc())
        elif sort_by == "name_asc":
            query = query.order_by(models.Strategy.name.asc())
        elif sort_by == "updated_at_desc":
            query = query.order_by(models.Strategy.updated_at.desc().nullslast())
        else: # 기본 정렬
            query = query.order_by(models.Strategy.created_at.desc())

        strategies = query.offset(skip).limit(limit).all()
        
        # 👈 rules 필드를 Pydantic 모델로 변환하는 로직을 제거
        # 라우터의 response_model=schemas.Strategy가 이 역할을 수행합니다.

        logger.info(f"User ID {user_id} fetched {len(strategies)} strategies.")
        return strategies

    def get_strategy_by_id(self, db: Session, strategy_id: int) -> models.Strategy | None:
        strategy = db.query(models.Strategy).options(
            joinedload(models.Strategy.author)
        ).filter(models.Strategy.id == strategy_id).first()
        
        # 👈 rules 필드를 Pydantic 모델로 변환하는 로직을 제거
        # 라우터의 response_model=schemas.Strategy가 이 역할을 수행합니다.
            
        return strategy

    def update_strategy(
        self,
        db: Session,
        strategy_id: int,
        user: models.User,
        strategy_update: schemas.StrategyUpdate
    ) -> models.Strategy:
        db_strategy = self.get_strategy_by_id(db, strategy_id)
        if not db_strategy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="전략을 찾을 수 없습니다.")
        if db_strategy.author_id != user.id:
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to update strategy {strategy_id} not owned by them.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 전략을 수정할 권한이 없습니다.")

        update_data = strategy_update.model_dump(exclude_unset=True)

        if "rules" in update_data and update_data["rules"]:
            try:
                self.verify_strategy_rules_against_plan(user, update_data["rules"], db)
            except HTTPException as e:
                logger.error(f"Strategy rule validation failed during update for user {user.email}: {e.detail}")
                raise
            except Exception as e:
                logger.error(f"An unexpected error occurred during rule validation for user {user.email} on update: {e}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="전략 규칙 유효성 검사 중 예상치 못한 오류가 발생했습니다.")
            
            serialized_rules = {
                "buy": [rule.model_dump(mode='json') for rule in update_data["rules"].get("buy", [])],
                "sell": [rule.model_dump(mode='json') for rule in update_data["rules"].get("sell", [])]
            }
            db_strategy.rules = serialized_rules # 👈 json.dumps() 제거

        if "name" in update_data and update_data["name"]:
            db_strategy.name = update_data["name"]
        if "description" in update_data and update_data["description"]:
            db_strategy.description = update_data["description"]
        if "is_public" in update_data and update_data["is_public"] is not None:
            db_strategy.is_public = update_data["is_public"]
        
        db.add(db_strategy)
        db.commit()
        db.refresh(db_strategy)

        # 👈 rules 필드를 Pydantic 모델로 변환하는 로직을 제거
        # 라우터의 response_model=schemas.Strategy가 이 역할을 수행합니다.
            
        logger.info(f"User {user.email} (ID: {user.id}) updated strategy: {db_strategy.name} (ID: {db_strategy.id}).")
        return db_strategy

    def delete_strategy(self, db: Session, strategy_id: int, user: models.User) -> bool:
        db_strategy = self.get_strategy_by_id(db, strategy_id)
        if not db_strategy:
            return False
        if db_strategy.author_id != user.id:
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to delete strategy {strategy_id} not owned by them.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 전략을 삭제할 권한이 없습니다.")

        active_bots_using_strategy = db.query(models.LiveBot).filter(
            models.LiveBot.strategy_id == strategy_id,
            models.LiveBot.status.in_(['active', 'paused', 'initializing'])
        ).first()
        if active_bots_using_strategy:
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to delete strategy {strategy_id} which is used by active bot {active_bots_using_strategy.id}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이 전략을 사용하는 활성 봇이 있습니다. 먼저 봇을 중지하거나 삭제해주세요.")

        db.delete(db_strategy)
        db.commit()
        logger.info(f"User {user.email} (ID: {user.id}) deleted strategy: {db_strategy.name} (ID: {db_strategy.id}).")
        return True

# 서비스 인스턴스 생성
strategy_service = StrategyService()