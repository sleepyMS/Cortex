# file: backend/app/services/subscription_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from fastapi import HTTPException, status
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import os

from .. import models, schemas
from ..services.plan_service import plan_service
from ..services.payment_gateway_service import payment_gateway_service

logger = logging.getLogger(__name__)

class SubscriptionService:
    """
    사용자 구독 정보 조회 및 결제 웹훅 이벤트를 처리하는 비동기 서비스.
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
        result = await db.execute(query)
        subscription = result.scalar_one_or_none()

        if not subscription:
            # 기본 Basic 플랜 정보를 찾아서 가상의 구독 객체를 만들어 반환
            basic_plan_query = select(models.Plan).options(joinedload(models.Plan.features)).filter(models.Plan.name == models.PlanType.BASIC)
            plan_result = await db.execute(basic_plan_query)
            basic_plan = plan_result.scalar_one_or_none()
            if not basic_plan:
                raise HTTPException(status_code=500, detail="Default 'Basic' plan not found.")
            
            # Pydantic 스키마를 사용하여 가상 구독 객체 생성
            return schemas.SubscriptionSchema.model_validate({
                "id": uuid.uuid4(), # 임의의 ID
                "user_id": user.id,
                "plan_id": basic_plan.id,
                "status": "active",
                "current_period_end": None,
                "plan": basic_plan
            })
        
        return subscription

    async def create_checkout_session(self, db: AsyncSession, user: models.User, plan_id: uuid.UUID) -> str:
        """결제 세션을 생성하고 결제 페이지 URL을 반환합니다."""
        target_plan = await plan_service.get_plan_by_id(db, plan_id)

        if not target_plan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 플랜을 찾을 수 없습니다.")
        if target_plan.price == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="무료 플랜은 결제할 수 없습니다.")

        unit_amount = int(target_plan.price * 100)
        currency = "usd" # 또는 다른 통화

        success_url = os.getenv("FRONTEND_SUCCESS_PAYMENT_URL", "http://localhost:3000/payment/success")
        cancel_url = os.getenv("FRONTEND_CANCEL_PAYMENT_URL", "http://localhost:3000/payment/cancel")
        
        # payment_gateway_service를 통해 실제 결제 세션 생성 요청
        checkout_url = await payment_gateway_service.create_checkout_session(
            payment_gateway="stripe",
            plan_name=target_plan.name.value,
            unit_amount=unit_amount,
            currency=currency,
            user_email=user.email,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": str(user.id), "plan_id": str(target_plan.id)}
        )
        return checkout_url

    async def handle_payment_webhook(self, db: AsyncSession, payment_gateway: str, payload: bytes, signature: Optional[str]):
        """결제 게이트웨이 웹훅 이벤트를 검증하고 처리합니다."""
        # 1. 웹훅 서명 검증 및 이벤트 데이터 파싱
        try:
            event_data = payment_gateway_service.handle_webhook(payload, signature, payment_gateway)
            event_type = event_data.get("type")
            logger.info(f"Webhook received. Gateway: {payment_gateway}, Event type: {event_type}")
        except HTTPException as e:
            logger.error(f"Webhook signature/parsing failed for {payment_gateway}. Detail: {e.detail}", exc_info=True)
            raise e
        except Exception as e:
            logger.error(f"Unexpected error during webhook validation for {payment_gateway}: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail="웹훅 검증 중 오류가 발생했습니다.")
        
        # 2. 파싱된 이벤트 타입에 따라 구독 상태 업데이트
        try:
            if event_type == "checkout.session.completed":
                await self._process_checkout_completed(db, event_data)
            elif event_type == "customer.subscription.updated":
                await self._process_subscription_updated(db, event_data)
            elif event_type == "customer.subscription.deleted":
                await self._process_subscription_deleted(db, event_data)
            else:
                logger.info(f"Webhook: Unhandled event type: {event_type}.")
        except Exception as e:
            logger.error(f"Error processing payment event '{event_type}': {e}", exc_info=True)
            # DB 트랜잭션은 라우터 레벨에서 롤백됩니다.
            raise HTTPException(status_code=500, detail=f"웹훅 이벤트({event_type}) 처리 중 서버 오류가 발생했습니다.")

    async def _process_checkout_completed(self, db: AsyncSession, event_data: Dict[str, Any]):
        """`checkout.session.completed` 이벤트를 처리하여 구독을 생성/업데이트합니다."""
        metadata = event_data.get("metadata", {})
        user_id = metadata.get("user_id")
        plan_id = metadata.get("plan_id")
        
        if not user_id or not plan_id:
            logger.error(f"Webhook Error: Missing user_id or plan_id in metadata for event: {event_data.get('id')}")
            return
        
        query = select(models.Subscription).filter(models.Subscription.user_id == uuid.UUID(user_id))
        result = await db.execute(query)
        subscription = result.scalar_one_or_none()

        subscription_id_on_gateway = event_data.get("subscription")
        current_period_end = datetime.fromtimestamp(event_data.get("current_period_end", 0), tz=timezone.utc)

        if subscription: # 기존 구독이 있는 경우 (예: Basic -> Pro 업그레이드)
            subscription.plan_id = uuid.UUID(plan_id)
            subscription.status = "active"
            subscription.current_period_end = current_period_end
            subscription.payment_gateway_sub_id = subscription_id_on_gateway
        else: # 신규 구독
            subscription = models.Subscription(
                user_id=uuid.UUID(user_id), plan_id=uuid.UUID(plan_id), status="active",
                current_period_end=current_period_end, payment_gateway_sub_id=subscription_id_on_gateway
            )
        db.add(subscription)
        logger.info(f"Webhook processed 'checkout.session.completed' for user_id: {user_id}")
    
    async def _process_subscription_updated(self, db: AsyncSession, event_data: Dict[str, Any]):
        """`customer.subscription.updated` 이벤트를 처리하여 구독 상태를 갱신합니다."""
        subscription_id_on_gateway = event_data.get("id")
        query = select(models.Subscription).filter(models.Subscription.payment_gateway_sub_id == subscription_id_on_gateway)
        result = await db.execute(query)
        subscription = result.scalar_one_or_none()

        if not subscription:
            logger.warning(f"Webhook: Received update for unknown subscription ID: {subscription_id_on_gateway}")
            return

        subscription.status = event_data.get("status")
        subscription.current_period_end = datetime.fromtimestamp(event_data.get("current_period_end", 0), tz=timezone.utc)
        db.add(subscription)
        logger.info(f"Webhook processed 'customer.subscription.updated' for subscription_id: {subscription.id}")

    async def _process_subscription_deleted(self, db: AsyncSession, event_data: Dict[str, Any]):
        """`customer.subscription.deleted` 이벤트를 처리하여 구독을 취소 상태로 변경합니다."""
        subscription_id_on_gateway = event_data.get("id")
        query = select(models.Subscription).filter(models.Subscription.payment_gateway_sub_id == subscription_id_on_gateway)
        result = await db.execute(query)
        subscription = result.scalar_one_or_none()

        if not subscription:
            logger.warning(f"Webhook: Received delete for unknown subscription ID: {subscription_id_on_gateway}")
            return
            
        subscription.status = "canceled"
        db.add(subscription)
        logger.info(f"Webhook processed 'customer.subscription.deleted' for subscription_id: {subscription.id}")

subscription_service = SubscriptionService()