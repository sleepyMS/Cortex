# file: backend/app/services/plan_service.py

import logging
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from .. import models, schemas
from ..models import PlanType

logger = logging.getLogger(__name__)

class PlanService:
    """
    사용자 구독 플랜과 관련된 정보 및 기능을 제공하는 비동기 서비스.
    """

    async def seed_initial_plans(self, db: AsyncSession):
        """초기 구독 플랜을 데이터베이스에 생성합니다. (서버 시작 시 한 번만 실행)"""
        plans_to_seed = {
            PlanType.BASIC: {
                "name": PlanType.BASIC, "price": 0, "credit_surcharge_multiplier": 2.0,
                "features": {
                    "max_strategies": 3, "max_coins_per_backtest": 1, "live_bots_limit": 0,
                    "supported_timeframes": "1h,4h,1d",
                    "community_access": True, "telegram_alerts": False, 
                    "advanced_features_access": False, "portfolio_backtest_access": False
                }
            },
            PlanType.TRADER: {
                "name": PlanType.TRADER, "price": 29000, "credit_surcharge_multiplier": 1.5,
                "features": {
                    "max_strategies": 20, "max_coins_per_backtest": 5, "live_bots_limit": 3,
                    "supported_timeframes": "1m,5m,15m,30m,1h,4h,1d,1w,1M",
                    "community_access": True, "telegram_alerts": True, 
                    "advanced_features_access": True, "portfolio_backtest_access": True
                }
            },
            PlanType.PRO: {
                "name": PlanType.PRO, "price": 59000, "credit_surcharge_multiplier": 1.0,
                "features": {
                    "max_strategies": 100, "max_coins_per_backtest": 20, "live_bots_limit": 10,
                    "supported_timeframes": "1m,5m,15m,30m,1h,4h,1d,1w,1M",
                    "community_access": True, "telegram_alerts": True, 
                    "advanced_features_access": True, "portfolio_backtest_access": True
                }
            }
        }

        for plan_type, data in plans_to_seed.items():
            result = await db.execute(select(models.Plan).filter(models.Plan.name == plan_type))
            if result.scalar_one_or_none() is None:
                # Plan 모델 생성 시 credit_surcharge_multiplier를 함께 전달합니다.
                db_plan = models.Plan(
                    name=data['name'], 
                    price=data['price'],
                    credit_surcharge_multiplier=data['credit_surcharge_multiplier']
                )
                db.add(db_plan)
                await db.flush()
                
                # features 데이터에서 불필요한 키는 자동으로 무시됩니다.
                db_features = models.PlanFeature(plan_id=db_plan.id, **data['features'])
                db.add(db_features)
                logger.info(f"Seeded '{db_plan.name}' plan with multiplier {db_plan.credit_surcharge_multiplier}.")
        
    async def get_all_plans(self, db: AsyncSession) -> List[models.Plan]:
        """서비스에서 제공하는 모든 구독 플랜 목록을 비동기로 조회합니다."""
        query = select(models.Plan).options(joinedload(models.Plan.features)).order_by(models.Plan.price)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_user_plan_level(self, user: models.User, db: AsyncSession) -> PlanType:
        """사용자의 현재 플랜 등급을 비동기로 반환합니다."""
        features = await self.get_user_plan_features(user, db)
        # PlanFeature 모델에는 Plan과의 관계가 설정되어 있어야 합니다.
        # Plan 모델의 name 필드를 통해 PlanType Enum 값을 반환합니다.
        plan_result = await db.execute(select(models.Plan).filter(models.Plan.id == features.plan_id))
        plan = plan_result.scalar_one_or_none()
        return plan.name if plan else PlanType.BASIC

    async def get_user_plan_features(self, user: models.User, db: AsyncSession) -> models.PlanFeature:
        """
        사용자의 플랜에 해당하는 모든 기능 제한 정보를 비동기로 반환합니다.
        [개선] 구독 상태가 'active'인 경우에만 해당 플랜의 기능을 반환하며,
        그 외의 경우(구독 없거나 pending, canceled 등)에는 기본 'Basic' 플랜의 기능을 반환합니다.
        """
        # 1. 사용자의 구독 정보를 plan, features와 함께 Eager Loading으로 조회합니다.
        #    이렇게 하면 한 번의 쿼리로 필요한 모든 데이터를 가져와 효율적입니다.
        sub_query = (
            select(models.Subscription)
            .options(joinedload(models.Subscription.plan).joinedload(models.Plan.features))
            .filter(models.Subscription.user_id == user.id)
        )
        subscription_result = await db.execute(sub_query)
        subscription = subscription_result.scalar_one_or_none()

        # 2. [핵심] 구독이 존재하고, 상태가 'active'이며, 모든 연관 데이터가 정상일 때만 해당 플랜 기능을 반환합니다.
        if (
            subscription and
            subscription.status == "active" and  # <-- ⭐️ 가장 중요한 변경점: 상태를 명시적으로 확인
            subscription.plan and
            subscription.plan.features
        ):
            return subscription.plan.features
        else:
            # 3. 그 외 모든 경우(구독이 없거나, 'active' 상태가 아닌 경우)에는 'Basic' 플랜의 기능을 조회하여 반환합니다.
            basic_feature_query = (
                select(models.PlanFeature)
                .join(models.Plan)
                .filter(models.Plan.name == PlanType.BASIC)
            )
            basic_feature_result = await db.execute(basic_feature_query)
            basic_features = basic_feature_result.scalar_one_or_none()
            
            # 4. 만약 Basic 플랜 정보조차 없다면, 이는 시스템 설정 오류이므로 500 에러를 발생시킵니다.
            if not basic_features:
                logger.error("Default 'Basic' plan features not found in the database.")
                raise HTTPException(
                    status_code=500, 
                    detail="서버 오류: 기본 플랜 기능 설정이 누락되었습니다."
                )
            return basic_features

    def get_timeframe_level(self, timeframe: str) -> PlanType:
        """주어진 타임프레임이 요구하는 최소 플랜 등급을 결정합니다."""
        if timeframe in ["1m", "5m", "15m", "30m", "4h", "1d", "1M"]:
            return PlanType.TRADER
        return PlanType.BASIC

    async def get_plan_by_id(self, db: AsyncSession, plan_id: uuid.UUID) -> Optional[models.Plan]:
        """ID로 단일 플랜을 비동기 조회합니다."""
        query = select(models.Plan).options(joinedload(models.Plan.features)).filter(models.Plan.id == plan_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_plan_by_name(self, db: AsyncSession, plan_name: models.PlanType) -> Optional[models.Plan]:
        """[신규] 이름으로 단일 플랜 정보를 Eager Loading하여 조회합니다."""
        query = (
            select(models.Plan)
            .options(joinedload(models.Plan.features))
            .filter(models.Plan.name == plan_name)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

plan_service = PlanService()