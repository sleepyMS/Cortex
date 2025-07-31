# file: backend/app/services/strategy_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional, Literal

from .. import models, schemas
from .plan_service import plan_service # 👈 PlanService 임포트
import logging

logger = logging.getLogger(__name__)

class StrategyService:
    """
    투자 전략의 생성, 조회, 수정, 삭제 및 유효성 검증을 담당하는 서비스.
    """
    def __init__(self):
        self.plan_service = plan_service

    # _verify_strategy_rules_against_plan -> verify_strategy_rules_against_plan (Public으로 변경)
    def verify_strategy_rules_against_plan( # 👈 함수명 변경 및 public 노출
        self,
        user: models.User,
        rules: Dict[Literal["buy", "sell"], List[schemas.SignalBlockData]],
        db: Session
    ) -> None:
        """
        전략 규칙 내의 지표 타임프레임이 사용자의 구독 플랜에 허용되는지 검증합니다.
        허용되지 않는 경우 HTTPException을 발생시킵니다.
        """
        allowed_timeframes = self.plan_service.get_user_allowed_timeframes(user, db)
        
        # 재귀적으로 모든 지표 조건을 순회하며 타임프레임 검증
        def _check_conditions_recursive(signal_blocks: List[schemas.SignalBlockData]):
            for block in signal_blocks:
                for condition_key in ["conditionA", "conditionB"]:
                    condition = getattr(block, condition_key)
                    if condition and condition.type == "indicator":
                        # IndicatorValue 타입이어야 timeframe 속성에 접근 가능
                        if isinstance(condition.value, schemas.IndicatorValue):
                            indicator_timeframe = condition.value.timeframe
                            if indicator_timeframe not in allowed_timeframes:
                                logger.warning(f"User {user.email} attempted to use disallowed timeframe '{indicator_timeframe}' for strategy rules.")
                                raise HTTPException(
                                    status_code=status.HTTP_403_FORBIDDEN,
                                    detail=f"선택한 타임프레임 '{indicator_timeframe}'은 현재 플랜에서 지원되지 않습니다. 플랜을 업그레이드해주세요."
                                )
                        else:
                            # 이 경우는 Pydantic 스키마 유효성 검사에서 이미 걸러져야 하지만, 방어적 코딩
                            logger.error(f"Strategy rule has indicator type but value is not IndicatorValue schema: {condition.value}")
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="전략 규칙의 지표 형식이 올바르지 않습니다."
                            )
                _check_conditions_recursive(block.children) # 재귀 호출

        _check_conditions_recursive(rules.get("buy", []))
        _check_conditions_recursive(rules.get("sell", []))
        logger.info(f"User {user.email} strategy rules successfully verified against plan timeframes.")


    def create_strategy(
        self,
        db: Session,
        user: models.User,
        strategy_create: schemas.StrategyCreate
    ) -> models.Strategy:
        """새로운 투자 전략을 생성합니다."""
        # 1. 플랜 기반 유효성 검사: 지표 타임프레임 (public 함수 호출)
        self.verify_strategy_rules_against_plan(user, strategy_create.rules, db) # 👈 public 함수 호출

        # 2. 전략 생성
        db_strategy = models.Strategy(
            author_id=user.id,
            name=strategy_create.name,
            description=strategy_create.description,
            rules=strategy_create.rules.model_dump(mode='json'), # Pydantic 모델을 JSON 직렬화
            is_public=strategy_create.is_public
        )
        db.add(db_strategy)
        db.flush() # ID를 얻기 위해 flush
        db.refresh(db_strategy)
        logger.info(f"User {user.email} (ID: {user.id}) created new strategy: {db_strategy.name} (ID: {db_strategy.id}).")
        return db_strategy

    def get_strategies(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None, # 'created_at_desc', 'name_asc'
        is_public: Optional[bool] = None # 관리자용 또는 공개 전략 필터링
    ) -> List[models.Strategy]:
        """
        사용자 본인의 전략 목록 또는 공개 전략 목록을 조회합니다.
        """
        query = db.query(models.Strategy).filter(models.Strategy.author_id == user_id)

        if is_public is not None:
             # is_public 필터는 사용자 본인의 전략에도 적용 가능 (본인이 공개한 것만 보거나)
             # 또는 관리자가 is_public=True인 모든 전략을 볼 때도 사용 가능
            query = query.filter(models.Strategy.is_public == is_public)

        if search_query:
            query = query.filter(models.Strategy.name.ilike(f"%{search_query}%"))

        # 정렬 로직
        if sort_by == "created_at_desc":
            query = query.order_by(models.Strategy.created_at.desc())
        elif sort_by == "created_at_asc":
            query = query.order_by(models.Strategy.created_at.asc())
        elif sort_by == "name_asc":
            query = query.order_by(models.Strategy.name.asc())
        # ... 기타 정렬 옵션 ...
        else: # 기본 정렬
            query = query.order_by(models.Strategy.created_at.desc())

        strategies = query.offset(skip).limit(limit).all()
        logger.info(f"User ID {user_id} fetched {len(strategies)} strategies.")
        return strategies

    def get_strategy_by_id(self, db: Session, strategy_id: int) -> models.Strategy | None:
        """ID로 단일 전략을 조회합니다."""
        return db.query(models.Strategy).filter(models.Strategy.id == strategy_id).first()

    def update_strategy(
        self,
        db: Session,
        strategy_id: int,
        user: models.User, # 현재 로그인된 사용자 (소유권 확인용)
        strategy_update: schemas.StrategyUpdate
    ) -> models.Strategy:
        """
        기존 투자 전략을 업데이트합니다. (소유권 검증 포함)
        """
        db_strategy = self.get_strategy_by_id(db, strategy_id)
        if not db_strategy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="전략을 찾을 수 없습니다.")
        if db_strategy.author_id != user.id:
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to update strategy {strategy_id} not owned by them.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 전략을 수정할 권한이 없습니다.")

        update_data = strategy_update.model_dump(exclude_unset=True)

        if "rules" in update_data and update_data["rules"]:
            # 1. 플랜 기반 유효성 검사: 지표 타임프레임 (규칙이 변경된 경우에만)
            self.verify_strategy_rules_against_plan(user, update_data["rules"], db) # 👈 public 함수 호출
            db_strategy.rules = update_data["rules"] # Pydantic 모델을 JSON 직렬화

        if "name" in update_data and update_data["name"]:
            db_strategy.name = update_data["name"]
        if "description" in update_data and update_data["description"]:
            db_strategy.description = update_data["description"]
        if "is_public" in update_data and update_data["is_public"] is not None:
            db_strategy.is_public = update_data["is_public"]
        
        # updated_at은 모델에서 onupdate=func.now()로 자동 처리됨

        db.add(db_strategy)
        db.commit()
        db.refresh(db_strategy)
        logger.info(f"User {user.email} (ID: {user.id}) updated strategy: {db_strategy.name} (ID: {db_strategy.id}).")
        return db_strategy

    def delete_strategy(self, db: Session, strategy_id: int, user: models.User) -> bool:
        """
        투자 전략을 삭제합니다. (소유권 검증 포함)
        """
        db_strategy = self.get_strategy_by_id(db, strategy_id)
        if not db_strategy:
            return False # 삭제할 전략이 없음
        if db_strategy.author_id != user.id:
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to delete strategy {strategy_id} not owned by them.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 전략을 삭제할 권한이 없습니다.")

        # 이 전략을 사용하는 활성 LiveBot이 있는지 확인
        active_bots_using_strategy = db.query(models.LiveBot).filter(
            models.LiveBot.strategy_id == strategy_id,
            models.LiveBot.status.in_(['active', 'paused', 'initializing']) # 활성 상태 봇
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