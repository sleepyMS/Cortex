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
    사용자 구독 플랜과 관련된 정보 (허용 타임프레임, 백테스트 제한, 동시 봇 제한 등)를 제공하는 서비스.
    """

    async def seed_initial_plans(self, db: AsyncSession):
        """
        초기 구독 플랜을 데이터베이스에 생성합니다. (서버 시작 시 한 번만 실행)
        """
        plans_to_seed = {
            PlanType.BASIC: {
                "name": PlanType.BASIC,
                "price": 0.0,
                "features": {
                    "max_strategies": 3,
                    "max_coins_per_backtest": 1,
                    "live_bots_limit": 0,
                    "daily_backtest_count": 10,
                    "max_backtest_duration_years": 1,
                    "supported_timeframes": "1h",
                    "community_access": False,
                    "telegram_alerts": False,
                    "advanced_features_access": False,
                    "portfolio_backtest_access": False
                }
            },
            PlanType.TRADER: {
                "name": PlanType.TRADER,
                "price": 49.99,
                "features": {
                    "max_strategies": 20,
                    "max_coins_per_backtest": 5,
                    "live_bots_limit": 3,
                    "daily_backtest_count": 100,
                    "max_backtest_duration_years": 3,
                    "supported_timeframes": "1m,5m,15m,30m,1h,4h,1d,1w,1M",
                    "community_access": True,
                    "telegram_alerts": True,
                    "advanced_features_access": False,
                    "portfolio_backtest_access": False
                }
            },
            PlanType.PRO: {
                "name": PlanType.PRO,
                "price": 129.99,
                "features": {
                    "max_strategies": 100,
                    "max_coins_per_backtest": 10,
                    "live_bots_limit": 10,
                    "daily_backtest_count": 9999,
                    "max_backtest_duration_years": None,
                    "supported_timeframes": "1m,5m,15m,30m,1h,4h,1d,1w,1M",
                    "community_access": True,
                    "telegram_alerts": True,
                    "advanced_features_access": True,
                    "portfolio_backtest_access": True
                }
            }
        }

        for plan_type, data in plans_to_seed.items():
            result = await db.execute(select(models.Plan).filter(models.Plan.name == plan_type))
            if result.scalar_one_or_none() is None:
                db_plan = models.Plan(name=data['name'], price=data['price'])
                db.add(db_plan)
                await db.flush()
                
                db_features = models.PlanFeature(plan_id=db_plan.id, **data['features'])
                db.add(db_features)
                logger.info(f"Seeded '{db_plan.name}' plan.")
        
    async def get_all_plans(self, db: AsyncSession) -> List[models.Plan]:
        """서비스에서 제공하는 모든 구독 플랜 목록을 비동기로 조회합니다."""
        query = select(models.Plan).options(joinedload(models.Plan.features)).order_by(models.Plan.price)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_user_plan_level(self, user: models.User, db: AsyncSession) -> PlanType:
        """사용자의 현재 플랜 등급을 비동기로 반환합니다."""
        if not user.subscription:
             # 구독 정보가 로드되지 않았을 수 있으므로 DB에서 다시 조회
            result = await db.execute(select(models.Subscription).filter(models.Subscription.user_id == user.id))
            subscription = result.scalar_one_or_none()
            if not subscription: return PlanType.BASIC
        else:
            subscription = user.subscription
        
        # plan 정보가 lazy-loaded 될 수 있으므로 명시적으로 로드
        plan_result = await db.execute(select(models.Plan).filter(models.Plan.id == subscription.plan_id))
        plan = plan_result.scalar_one_or_none()

        return plan.name if plan else PlanType.BASIC

    def get_timeframe_level(self, timeframe: str) -> PlanType:
        """주어진 타임프레임이 요구하는 최소 플랜 등급을 결정합니다."""
        if timeframe in ["1m", "5m", "15m", "30m"]:
            return PlanType.TRADER
        return PlanType.BASIC

    async def get_plan_by_id(self, db: AsyncSession, plan_id: uuid.UUID) -> Optional[models.Plan]:
        """ID로 단일 플랜을 비동기 조회합니다."""
        query = select(models.Plan).options(joinedload(models.Plan.features)).filter(models.Plan.id == plan_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

plan_service = PlanService()