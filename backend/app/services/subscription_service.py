# file: backend/app/services/subscription_service.py 

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
import logging

from .. import models, schemas
from ..services.plan_service import plan_service
from ..services.payment_service import payment_service
from ..services.credit_service import credit_service
from ..gateways.toss_payments_client import TossPaymentsClient

from ..event_bus import publish_event

logger = logging.getLogger(__name__)


class SubscriptionService:
    """
    사용자 구독 정보 조회, 생성/수정 등 구독 관련 비즈니스 로직을 담당하는 서비스.
    """

    async def get_user_subscription_details(
        self, db: AsyncSession, user: models.User
    ) -> schemas.SubscriptionSchema:
        """
        특정 사용자의 현재 구독 정보를 Eager Loading하여 조회합니다.
        활성 구독이 없으면 기본 'Basic' 플랜 정보를 반환합니다.
        """
        query = (
            select(models.Subscription)
            .options(
                joinedload(models.Subscription.plan).joinedload(models.Plan.features)
            )
            .filter(models.Subscription.user_id == user.id)
        )
        subscription = await db.scalar(query)

        if not subscription:
            basic_plan = await plan_service.get_plan_by_name(db, models.PlanType.BASIC)
            if not basic_plan:
                raise HTTPException(status_code=500, detail="기본 플랜 정보를 찾을 수 없습니다.")

            # 기본 플랜 반환 시에도 스키마 구조를 맞추기 위해 plan 객체 전체를 전달합니다.
            return schemas.SubscriptionSchema.model_validate(
                {
                    "id": uuid.uuid4(),
                    "user_id": user.id,
                    "plan_id": basic_plan.id,
                    "status": "active",
                    "current_period_end": None,
                    "plan": basic_plan, # basic_plan 객체는 features를 포함하고 있음
                }
            )
        return subscription

    async def create_checkout_info(
        self, db: AsyncSession, user: models.User, plan_id: uuid.UUID
    ) -> schemas.OrderCreateResponse:
        """
        구독 결제를 위한 정보를 생성하여 반환합니다.
        """
        target_plan = await plan_service.get_plan_by_id(db, plan_id)

        if not target_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="선택한 플랜을 찾을 수 없습니다.",
            )
        if target_plan.price == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="무료 플랜은 결제할 수 없습니다.",
            )

        short_user = str(user.id).replace('-', '')[:8]        # 8 chars
        short_plan = str(plan_id).replace('-', '')[:8]       # 8 chars
        short_nonce = uuid.uuid4().hex[:12]                  # 12 chars
        order_id = f"SUB_{short_user}_P_{short_plan}_{short_nonce}"  # 총 길이 << 64
        order_name = f"Cortex {target_plan.name.value} 플랜 구독"

        return schemas.OrderCreateResponse(
            order_id=order_id,
            order_name=order_name,
            amount=target_plan.price,
            customer_name=user.username or user.email,
            customer_email=user.email,
        )

    async def update_billing_key(
        self,
        db: AsyncSession,
        user: models.User,
        plan_id: uuid.UUID,
        billing_key: str,
        card_info: Optional[Dict] = None,
    ) -> models.Subscription:
        """
        사용자의 구독 정보에 빌링키를 업데이트하거나, 구독 정보가 없으면 새로 생성합니다.
        """
        # 1. 기존 구독 정보 조회 (이전과 동일)
        subscription = await db.scalar(
            select(models.Subscription).filter_by(user_id=user.id)
        )

        target_plan = await plan_service.get_plan_by_id(db, plan_id)
        if not target_plan:
            raise HTTPException(status_code=404, detail="요청한 플랜을 찾을 수 없습니다.")

        card_details = (
            f"{card_info.get('company', '')} {card_info.get('number', '')}" if card_info else None
        )

        # 2. 구독 정보 생성 또는 업데이트 
        if subscription:
            subscription.plan_id = plan_id
            subscription.payment_gateway_customer_key = billing_key
            subscription.payment_method_details = card_details
            subscription.status = "pending"
        else:
            subscription = models.Subscription(
                user_id=user.id,
                plan_id=plan_id,
                status="pending",
                payment_gateway_customer_key = billing_key,
                payment_method_details = card_details,
            )
            db.add(subscription)
        
        # 3. 변경사항을 DB 세션에 반영하고 ID를 확정합니다. (commit은 아직 안 함)
        await db.flush()

        # 4. 방금 생성/수정한 객체를 ID를 이용해 DB에서 '다시 조회'합니다.
        #    이때 필요한 모든 연관 관계(plan -> features)를 Eager Loading합니다.
        #    이것이 최종적으로 반환될 완전한 객체입니다.
        complete_subscription = await db.get(
            models.Subscription,
            subscription.id,
            options=[
                joinedload(models.Subscription.plan).joinedload(models.Plan.features)
            ],
        )
        
        if not complete_subscription:
            # 이론적으로 발생해서는 안 되는 예외 상황
            raise HTTPException(status_code=500, detail="구독 정보를 처리하는 중 오류가 발생했습니다.")

        return complete_subscription

    ## 라우터의 비즈니스 로직을 모두 담당하는 고수준 메서드
    async def register_card_and_process_first_payment(
            self,
            db: AsyncSession,
            user: models.User,
            plan_id: uuid.UUID,
            auth_key: str,
            toss_client: TossPaymentsClient,
        ) -> schemas.SubscriptionSchema:
            """
            카드 등록, 동기적 첫 결제, DB 'active' 상태 저장을 하나의 트랜잭션으로 처리하고
            Pydantic 스키마를 반환합니다.
            """
            # --- 1. 주문 정보 생성 ---
            checkout_info = await self.create_checkout_info(db, user, plan_id)

            # --- 2. 토스 API 호출: 빌링키 발급 및 첫 결제 (동기 작업) ---
            try:
                billing_data = await payment_service.issue_and_charge_first_subscription(
                    toss_client=toss_client, auth_key=auth_key, user=user, checkout_info=checkout_info,
                )
            except HTTPException as e:
                logger.error(f"Toss payment failed for user {user.email}: {e.detail}")
                raise e
            
            billing_key = billing_data.get("billingKey")
            if not billing_key:
                raise HTTPException(status_code=500, detail="빌링키 정보를 가져올 수 없습니다.")

            # --- 3. [핵심] 구독 정보 'active' 상태로 생성 또는 업데이트 및 관계 설정 ---
            # 이 모든 작업은 commit() 전에 이루어져야 합니다.
            target_plan = await plan_service.get_plan_by_id(db, plan_id)
            if not target_plan:
                raise HTTPException(status_code=404, detail="요청한 플랜을 찾을 수 없습니다.")

            from dateutil.relativedelta import relativedelta
            period_end_dt = datetime.now(timezone.utc) + relativedelta(months=1)
            
            card_info = billing_data.get("card")
            card_details = f"{card_info.get('company', '')} {card_info.get('number', '')}" if card_info else None

            subscription = await db.scalar(select(models.Subscription).filter_by(user_id=user.id))

            if subscription:
                subscription.plan_id = plan_id
                subscription.status = "active"
                subscription.current_period_end = period_end_dt
                subscription.payment_gateway_customer_key = billing_key
                subscription.payment_method_details = card_details
                subscription.plan = target_plan # <-- 수정: plan 객체 할당
            else:
                subscription = models.Subscription(
                    user_id=user.id,
                    plan_id=plan_id,
                    status="active",
                    current_period_end=period_end_dt,
                    payment_gateway_customer_key=billing_key,
                    payment_method_details=card_details,
                    plan=target_plan # <-- 수정: plan 객체 할당
                )
                db.add(subscription)
            
            await db.flush()

            if target_plan.monthly_credit_reward > 0:
                await credit_service.grant_subscription_bonus_credits(
                    db=db,
                    user_id=user.id,
                    amount=target_plan.monthly_credit_reward,
                    source_id=checkout_info.order_id
                )
                logger.info(f"Granted {target_plan.monthly_credit_reward} bonus credits to new subscriber {user.email}.")
            
            # --- 4. DB에 모든 변경사항 커밋 ---
            await db.commit()

            # --- 5. 최종 Pydantic 스키마로 변환하여 반환 ---
            # 이제 객체에 plan이 할당되어 있으므로, refresh 없이 바로 반환 가능
            return schemas.SubscriptionSchema.model_validate(subscription)



    async def activate_or_update_subscription(
        self,
        db: AsyncSession,
        customer_key: str,  # 토스 웹훅의 customerKey (우리 시스템의 user_id)
        payment_data: dict, # 웹훅으로 받은 결제 데이터
    ) -> models.Subscription:
        """
        정기결제 성공 웹훅을 받아 구독을 활성화하거나 기간을 갱신합니다.
        """
        user_uuid = uuid.UUID(customer_key)
        
        subscription = await db.scalar(
            select(models.Subscription)
            .options(joinedload(models.Subscription.plan)) # plan 정보도 함께 로드
            .filter_by(user_id=user_uuid)
        )

        if not subscription:
            logger.error(f"Cannot update subscription. No subscription found for user_id: {customer_key}")
            raise HTTPException(status_code=404, detail="Subscription not found for webhook processing.")

        # 다음 결제일 계산 (예: 1개월 후)
        from dateutil.relativedelta import relativedelta
        new_period_end = datetime.now(timezone.utc) + relativedelta(months=1)

        subscription.status = "active"
        subscription.current_period_end = new_period_end
        
        # --- [추가] 정기결제 성공 후, 월간 보상 크레딧 지급 ---
        # 함께 로드한 plan 객체에서 보상량을 가져옵니다.
        if subscription.plan and subscription.plan.monthly_credit_reward > 0:
            await credit_service.grant_subscription_bonus_credits(
                db=db,
                user_id=user_uuid,
                amount=subscription.plan.monthly_credit_reward,
                source_id=uuid.UUID(payment_data.get("orderId")) # 결제 주문 ID를 source_id로 사용
            )
            logger.info(f"Granted {subscription.plan.monthly_credit_reward} bonus credits to recurring subscriber {customer_key}.")
        
        logger.info(
            f"Subscription for user {customer_key} successfully renewed. "
            f"Plan: {subscription.plan.name.value}, New expiration: {new_period_end.isoformat()}"
        )
        return subscription
    
    async def handle_subscription_payment_failure(
        self,
        db: AsyncSession,
        customer_key: str,
        failure_data: dict,
    ):
        """
        정기결제 실패 웹훅을 받아 구독을 비활성화(취소) 처리합니다.
        """
        user_uuid = uuid.UUID(customer_key)
        subscription = await db.scalar(select(models.Subscription).filter_by(user_id=user_uuid))

        if not subscription:
            logger.warning(f"Received payment failure webhook for non-existent subscription. User ID: {customer_key}")
            return

        # 구독 상태를 'canceled' 또는 'past_due'(유예 기간을 줄 경우) 등으로 변경
        subscription.status = "canceled"
        
        failure_code = failure_data.get("code")
        failure_message = failure_data.get("message")
        
        # 필요 시, 이벤트 발행을 통해 사용자에게 알림을 보낼 수 있습니다.
        await publish_event(
            "subscription.payment.failed",
            {
                "user_id": customer_key,
                "plan_id": str(subscription.plan_id),
                "failure_code": failure_code,
                "failure_message": failure_message,
            },
        )
        
        await db.commit()
        logger.info(f"Subscription for user {customer_key} has been canceled due to payment failure: {failure_message}")


# 서비스 인스턴스 생성
subscription_service = SubscriptionService()