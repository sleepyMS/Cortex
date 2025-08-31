# file: backend/app/services/subscription_service.py
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
import logging

from .. import models, schemas
from ..services.plan_service import plan_service
# payment_gateway_service와 settings는 더 이상 직접 필요하지 않습니다.

logger = logging.getLogger(__name__)

class SubscriptionService:
    """
    사용자 구독 정보 조회 및 생성/수정 등 구독 관련 비즈니스 로직을 담당하는 서비스.
    결제 처리의 직접적인 책임은 PaymentService와 이벤트 기반 시스템에 위임합니다.
    """

    async def get_user_subscription_details(self, db: AsyncSession, user: models.User) -> Optional[schemas.SubscriptionSchema]:
        """
        특정 사용자의 현재 구독 정보를 Eager Loading하여 조회합니다.
        활성 구독이 없으면 기본 'Basic' 플랜 정보를 반환합니다.
        """
        query = (
            select(models.Subscription)
            .options(joinedload(models.Subscription.plan).joinedload(models.Plan.features))
            .filter(models.Subscription.user_id == user.id)
        )
        subscription = await db.scalar(query)

        if not subscription:
            # 구독 정보가 없을 경우, 모든 사용자의 기본값인 'Basic' 플랜 정보를 생성하여 반환합니다.
            basic_plan = await plan_service.get_plan_by_name(db, models.PlanType.BASIC)
            if not basic_plan:
                logger.error("CRITICAL: Default 'Basic' plan not found in the database.")
                raise HTTPException(status_code=500, detail="기본 플랜 정보를 찾을 수 없습니다.")
            
            # DB에 저장되지 않은 가상의 구독 객체를 Pydantic 스키마로 생성
            return schemas.SubscriptionSchema.model_validate({
                "id": uuid.uuid4(),
                "user_id": user.id,
                "plan_id": basic_plan.id,
                "status": "active", # Basic 플랜은 항상 활성 상태로 간주
                "current_period_end": None,
                "plan": basic_plan
            })
        
        return subscription

    async def create_checkout_info(self, db: AsyncSession, user: models.User, plan_id: uuid.UUID) -> schemas.OrderCreateResponse:
        """
        [수정] 구독 결제를 위한 정보를 생성하여 프론트엔드에 반환합니다.
        """
        target_plan = await plan_service.get_plan_by_id(db, plan_id)

        if not target_plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 플랜을 찾을 수 없습니다.")
        if target_plan.price == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="무료 플랜은 결제할 수 없습니다.")

        # 결제 및 주문 식별을 위한 고유 ID 생성 (Toss Payments의 orderId로 사용됨)
        # SUB: 구독, U: 유저, P: 플랜, 마지막은 고유성을 위한 UUID
        order_id = f"SUB_{user.id}_P_{plan_id}_{uuid.uuid4()}"
        order_name = f"Cortex {target_plan.name.value} 플랜 구독"

        return schemas.OrderCreateResponse(
            order_id=order_id,
            order_name=order_name,
            amount=target_plan.price,
            customer_name=user.username or user.email,
            customer_email=user.email,
        )

    async def activate_or_update_subscription(
        self, db: AsyncSession, user_id: str, plan_name: str, 
        gateway_subscription_id: str, period_end_ts: int
    ):
        """
        [신규] 결제 성공 이벤트 수신 후, 실제 구독을 생성하거나 업데이트하는 함수.
        이 함수는 Celery Task에 의해 비동기적으로 호출됩니다.
        """
        user_uuid = uuid.UUID(user_id)
        target_plan = await plan_service.get_plan_by_name(db, models.PlanType(plan_name))
        if not target_plan:
             logger.error(f"Cannot activate subscription. Plan '{plan_name}' not found.")
             return

        subscription = await db.scalar(
            select(models.Subscription).filter_by(user_id=user_uuid)
        )
        
        # UTC 시간대로 기간 만료일 변환
        period_end_dt = datetime.fromtimestamp(period_end_ts, tz=timezone.utc)

        if subscription: # 기존 구독 업데이트 (플랜 변경 등)
            subscription.plan_id = target_plan.id
            subscription.status = "active"
            subscription.current_period_end = period_end_dt
            subscription.payment_gateway_sub_id = gateway_subscription_id
            logger.info(f"Subscription for user {user_id} updated to plan {target_plan.name.value}.")
        else: # 신규 구독 생성
            new_subscription = models.Subscription(
                user_id=user_uuid,
                plan_id=target_plan.id,
                status="active",
                current_period_end=period_end_dt,
                payment_gateway_sub_id=gateway_subscription_id
            )
            db.add(new_subscription)
            logger.info(f"New subscription created for user {user_id} with plan {target_plan.name.value}.")
        
        # DB에 최종 반영(commit)은 이 함수를 호출한 Celery Task에서 담당합니다.

# 서비스 인스턴스 생성
subscription_service = SubscriptionService()