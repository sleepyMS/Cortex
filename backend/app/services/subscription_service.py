# file: backend/app/services/subscription_service.py (최종 완성본)

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
from ..gateways.toss_payments_client import TossPaymentsClient

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

        order_id = f"SUB_{user.id}_P_{plan_id}_{uuid.uuid4()}"
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

        # 2. 구독 정보 생성 또는 업데이트 (이전과 동일)
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
        
        # 3. [핵심] 변경사항을 DB 세션에 반영하고 ID를 확정합니다. (commit은 아직 안 함)
        await db.flush()

        # 4. [핵심] 방금 생성/수정한 객체를 ID를 이용해 DB에서 '다시 조회'합니다.
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

    ## [신규] 라우터의 비즈니스 로직을 모두 담당하는 고수준 메서드
    async def register_card_and_process_first_payment(
        self,
        db: AsyncSession,
        user: models.User,
        plan_id: uuid.UUID,
        auth_key: str,
        toss_client: TossPaymentsClient,
    ) -> schemas.SubscriptionSchema: # 👈 반환 타입을 SQLAlchemy 모델에서 Pydantic 스키마로 변경
        """
        카드 등록부터 첫 결제, DB 업데이트까지 처리한 후,
        DB 세션이 닫히기 전에 안전하게 Pydantic 스키마로 변환하여 반환합니다.
        """
        # 1. 주문 정보 생성 (기존과 동일)
        checkout_info = await self.create_checkout_info(db, user, plan_id)

        # 2. 빌링키 발급 및 첫 결제 (기존과 동일)
        billing_data = await payment_service.issue_and_charge_first_subscription(
            toss_client=toss_client, auth_key=auth_key, user=user, checkout_info=checkout_info,
        )
        billing_key = billing_data.get("billingKey")
        if not billing_key:
            raise HTTPException(status_code=500, detail="빌링키 정보를 가져올 수 없습니다.")

        # 3. 구독 정보 생성 또는 업데이트 (기존과 동일)
        subscription_model = await self.update_billing_key(
            db=db, user=user, plan_id=plan_id, billing_key=billing_key, card_info=billing_data.get("card"),
        )

        # 4. [핵심] DB에 변경사항을 커밋합니다. (이제 라우터가 아닌 서비스에서 커밋)
        await db.commit()
        
        # 5. [핵심] 커밋된 최신 정보를 DB에서 다시 조회하여 완전한 객체를 만듭니다.
        #    이것이 Lazy Loading을 피하는 가장 확실한 방법입니다.
        complete_subscription = await db.get(
            models.Subscription,
            subscription_model.id,
            options=[
                joinedload(models.Subscription.plan).joinedload(models.Plan.features)
            ],
        )
        if not complete_subscription:
            raise HTTPException(status_code=500, detail="구독 정보를 처리하는 중 오류가 발생했습니다.")

        # 6. [핵심] DB 세션이 닫히기 전에, SQLAlchemy 모델을 Pydantic 스키마로 변환합니다.
        #    이 과정에서 필요한 모든 데이터(plan, features)를 읽어옵니다.
        subscription_schema = schemas.SubscriptionSchema.model_validate(complete_subscription)

        return subscription_schema

    async def activate_or_update_subscription(
        self,
        db: AsyncSession,
        user_id: str,
        plan_name: str,
        gateway_subscription_id: str,
        period_end_ts: int,
    ):
        """
        결제 성공 이벤트 수신 후, 실제 구독을 생성하거나 업데이트하는 함수.
        """
        # (기존 코드와 동일)
        user_uuid = uuid.UUID(user_id)
        target_plan = await plan_service.get_plan_by_name(
            db, models.PlanType(plan_name)
        )
        if not target_plan:
            logger.error(
                f"Cannot activate subscription. Plan '{plan_name}' not found."
            )
            return

        subscription = await db.scalar(
            select(models.Subscription).filter_by(user_id=user_uuid)
        )

        period_end_dt = datetime.fromtimestamp(period_end_ts, tz=timezone.utc)

        if subscription:
            subscription.plan_id = target_plan.id
            subscription.status = "active"
            subscription.current_period_end = period_end_dt
            subscription.payment_gateway_sub_id = gateway_subscription_id
            logger.info(
                f"Subscription for user {user_id} updated to plan {target_plan.name.value}."
            )
        else:
            new_subscription = models.Subscription(
                user_id=user_uuid,
                plan_id=target_plan.id,
                status="active",
                current_period_end=period_end_dt,
                payment_gateway_sub_id=gateway_subscription_id,
            )
            db.add(new_subscription)
            logger.info(
                f"New subscription created for user {user_id} with plan {target_plan.name.value}."
            )

# 서비스 인스턴스 생성
subscription_service = SubscriptionService()