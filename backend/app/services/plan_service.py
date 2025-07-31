# file: backend/app/services/plan_service.py (UPDATED)

from sqlalchemy.orm import Session
import logging
from typing import List, Dict, Any

from .. import models, schemas

logger = logging.getLogger(__name__)

# 기본 플랜의 허용 타임프레임 (하드코딩 또는 DB에서 관리 가능)
DEFAULT_ALLOWED_TIMEFRAMES = ["1h"]

class PlanService:
    """
    사용자 구독 플랜과 관련된 정보 (허용 타임프레임, 백테스트 제한, 동시 봇 제한 등)를 제공하는 서비스.
    """
    def get_user_allowed_timeframes(self, user: models.User, db: Session) -> List[str]:
        """
        주어진 사용자의 현재 구독 플랜에 따라 허용되는 타임프레임 목록을 반환합니다.
        """
        subscription = user.subscription
        
        if not subscription or subscription.plan.name == "basic":
            return DEFAULT_ALLOWED_TIMEFRAMES

        plan_features: Dict[str, Any] = subscription.plan.features
        allowed_timeframes = plan_features.get("allowed_timeframes", DEFAULT_ALLOWED_TIMEFRAMES)
        
        logger.info(f"User {user.email} (Plan: {subscription.plan.name}) allowed timeframes: {allowed_timeframes}")
        return allowed_timeframes

    def get_user_max_backtests_per_day(self, user: models.User, db: Session) -> int:
        """
        주어진 사용자의 현재 구독 플랜에 따라 허용되는 일일 백테스팅 횟수를 반환합니다.
        """
        subscription = user.subscription
        
        if not subscription:
            # 기본 플랜의 max_backtests_per_day를 반환 (models.Plan의 features를 바로 참조)
            # 이 값은 실제 DB에 Plan이 없을 경우를 대비한 안전 장치.
            # 실제 플랜 데이터는 DB 마이그레이션 시 초기값으로 삽입될 것임.
            return models.Plan(name="basic", price=0.0, features={"max_backtests_per_day": 5}).features.get("max_backtests_per_day", 5)
        
        plan_features: Dict[str, Any] = subscription.plan.features
        max_backtests = plan_features.get("max_backtests_per_day", 5)

        logger.info(f"User {user.email} (Plan: {subscription.plan.name}) max backtests per day: {max_backtests}")
        return max_backtests

    def get_user_concurrent_bots_limit(self, user: models.User, db: Session) -> int: # 👈 새로운 함수 추가
        """
        주어진 사용자의 현재 구독 플랜에 따라 허용되는 동시 실행 봇의 최대 개수를 반환합니다.
        """
        subscription = user.subscription

        if not subscription:
            # 기본 플랜의 concurrent_bots_limit을 반환
            return models.Plan(name="basic", price=0.0, features={"concurrent_bots_limit": 0}).features.get("concurrent_bots_limit", 0) # 기본 플랜은 0개로 가정
        
        plan_features: Dict[str, Any] = subscription.plan.features
        concurrent_limit = plan_features.get("concurrent_bots_limit", 0) # 기본값 0개

        logger.info(f"User {user.email} (Plan: {subscription.plan.name}) concurrent bots limit: {concurrent_limit}")
        return concurrent_limit


    def get_all_plans(self, db: Session) -> List[models.Plan]:
        """
        데이터베이스에 저장된 모든 구독 플랜 목록을 조회합니다.
        """
        plans = db.query(models.Plan).order_by(models.Plan.price.asc()).all()
        logger.info(f"Fetched {len(plans)} subscription plans.")
        return plans

# 서비스 인스턴스 생성
plan_service = PlanService()