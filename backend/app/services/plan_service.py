# file: backend/app/services/plan_service.py

import logging
from typing import List, Dict, Any, Literal
import uuid
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from .. import models, schemas
from ..models import PlanType

logger = logging.getLogger(__name__)

class PlanService:
    """
    사용자 구독 플랜과 관련된 정보 (허용 타임프레임, 백테스트 제한, 동시 봇 제한 등)를 제공하는 서비스.
    """

    def _seed_initial_plans(self, db: Session):
        """
        초기 구독 플랜을 데이터베이스에 생성합니다. (서버 시작 시 한 번만 실행)
        """
        plans_to_seed = {
            PlanType.BASIC: {
                "name": "Basic Plan",
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
                "name": "Trader Plan",
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
                "name": "Pro Plan",
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
            db_plan = db.query(models.Plan).filter(models.Plan.name == data['name']).first()
            if not db_plan:
                db_plan = models.Plan(
                    name=data['name'],
                    price=data['price'],
                )
                db.add(db_plan)
                db.flush()
                
                db_features = models.PlanFeature(
                    plan_id=db_plan.id,
                    max_strategies=data['features']['max_strategies'],
                    max_coins_per_backtest=data['features']['max_coins_per_backtest'],
                    live_bots_limit=data['features']['live_bots_limit'],
                    daily_backtest_count=data['features']['daily_backtest_count'],
                    max_backtest_duration_years=data['features']['max_backtest_duration_years'],
                    supported_timeframes=data['features']['supported_timeframes'],
                    community_access=data['features']['community_access'],
                    telegram_alerts=data['features']['telegram_alerts'],
                    advanced_features_access=data['features']['advanced_features_access'],
                    portfolio_backtest_access=data['features']['portfolio_backtest_access']
                )
                db.add(db_features)
                logger.info(f"Seeded '{db_plan.name}' plan.")
        
        db.commit()


    def get_user_plan_level(self, user: models.User, db: Session) -> str:
        """
        사용자의 현재 플랜 등급(예: 'basic', 'trader')을 반환합니다.
        """
        subscription = user.subscription
        if not subscription:
            return PlanType.BASIC.value
        return subscription.plan.name

    def get_user_plan_features(self, user: models.User, db: Session) -> schemas.PlanFeatureSchema:
        """
        사용자의 플랜에 해당하는 모든 기능 제한 정보를 반환합니다.
        """
        subscription = user.subscription
        if not subscription or not subscription.plan.features:
            basic_features = db.query(models.PlanFeature).join(models.Plan).filter(models.Plan.name == 'Basic Plan').options(joinedload(models.PlanFeature.plan)).first()
            if not basic_features:
                raise HTTPException(status_code=500, detail="Default 'Basic' plan features not found.")
            return schemas.PlanFeatureSchema.model_validate(basic_features)

        return schemas.PlanFeatureSchema.model_validate(subscription.plan.features)

    def get_timeframe_level(self, timeframe: str) -> Literal["basic", "trader", "pro"]:
        """
        주어진 타임프레임이 요구하는 최소 플랜 등급을 결정합니다.
        """
        if timeframe in ["1m", "5m", "15m", "30m", "4h", "1d", "1w", "1M"]:
            return "trader"
        elif timeframe == "1h":
            return "basic"
        return "basic"

    def get_plan_by_id(self, db: Session, plan_id: uuid.UUID) -> models.Plan | None:
        """ID로 단일 플랜을 조회합니다."""
        return db.query(models.Plan).filter(models.Plan.id == plan_id).options(joinedload(models.Plan.features)).first()


plan_service = PlanService()