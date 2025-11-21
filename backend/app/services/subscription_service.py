# file: backend/app/services/subscription_service.py 

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
import logging
from dateutil.relativedelta import relativedelta

from .. import models, schemas
from ..services.plan_service import plan_service
from ..services.payment_service import payment_service
from ..services.credit_service import credit_service
from ..gateways.toss_payments_client import TossPaymentsClient

from ..event_bus import publish_event
from ..config import settings

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
                joinedload(models.Subscription.plan).joinedload(models.Plan.features),
                joinedload(models.Subscription.next_plan).joinedload(models.Plan.features)  # 추가
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
        카드 등록, 동기적 첫 결제, DB 'active' 상태 저장을 하나의 트랜잭션으로 처리합니다.
        """
        checkout_info = await self.create_checkout_info(db, user, plan_id)

        try:
            # [수정] payment_service로부터 통합된 응답 데이터를 받습니다.
            response_data = await payment_service.issue_and_charge_first_subscription(
                toss_client=toss_client, auth_key=auth_key, user=user, checkout_info=checkout_info,
            )
        except HTTPException as e:
            logger.error(f"Toss payment failed for user {user.email}: {e.detail}")
            raise e
        
        # [수정] 각 데이터를 올바른 위치에서 추출합니다.
        billing_info = response_data.get("billing_info", {})
        payment_info = response_data.get("payment_info", {})

        billing_key = billing_info.get("billingKey")
        payment_key = payment_info.get("paymentKey") # 첫 결제의 고유 ID

        if not billing_key or not payment_key:
            raise HTTPException(status_code=500, detail="빌링키 또는 결제 정보를 가져올 수 없습니다.")

        target_plan = await plan_service.get_plan_by_id(db, plan_id)
        if not target_plan:
            raise HTTPException(status_code=404, detail="요청한 플랜을 찾을 수 없습니다.")

        from dateutil.relativedelta import relativedelta
        period_end_dt = datetime.now(timezone.utc) + relativedelta(months=1)
        
        card_info = billing_info.get("card") # 카드 정보는 billing_info에 있습니다.
        card_details = f"{card_info.get('company', '')} {card_info.get('number', '')}" if card_info else None

        subscription = await db.scalar(select(models.Subscription).filter_by(user_id=user.id))

        if subscription:
            subscription.plan_id = plan_id
            subscription.status = "active"
            subscription.current_period_end = period_end_dt
            subscription.payment_gateway_customer_key = billing_key
            subscription.payment_method_details = card_details
            subscription.payment_gateway_sub_id = payment_key # 첫 결제 키를 저장
            subscription.plan = target_plan 
        else:
            subscription = models.Subscription(
                user_id=user.id,
                plan_id=plan_id,
                status="active",
                current_period_end=period_end_dt,
                payment_gateway_customer_key=billing_key,
                payment_method_details=card_details,
                payment_gateway_sub_id=payment_key,
                plan=target_plan 
            )
            db.add(subscription)
        
        await db.flush()

        await db.refresh(subscription)

        if target_plan.monthly_credit_reward > 0:
            await credit_service.grant_subscription_bonus_credits(
                db=db,
                user_id=user.id,
                amount=target_plan.monthly_credit_reward,
                source_id=checkout_info.order_id
            )
            logger.info(f"Granted {target_plan.monthly_credit_reward} bonus credits to new subscriber {user.email}.")
        
        # commit은 dependency가 자동으로 처리

        publish_event(
            "subscription.created",
            {
                "user_id": str(user.id),
                "user_email": user.email,
                "username": user.username,
                "plan_name": target_plan.name.value,
                "amount": target_plan.price,
                "next_payment_date": subscription.current_period_end
            }
        )

        # DB 세션이 닫히기 전에 응답 스키마를 수동으로 구성
        return schemas.SubscriptionSchema(
            id=subscription.id,
            user_id=subscription.user_id,
            plan_id=subscription.plan_id,
            status=subscription.status,
            current_period_end=subscription.current_period_end,
            payment_method_details=subscription.payment_method_details,
            created_at=subscription.created_at,
            updated_at=subscription.updated_at,
            plan=schemas.PlanSchema.model_validate(subscription.plan)
        )

    async def activate_or_update_subscription(
        self, db: AsyncSession, customer_key: str, payment_data: dict
    ) -> models.Subscription:
        """
        정기결제 성공 웹훅을 받아 구독을 활성화하거나 기간을 갱신합니다. (멱등성 보장)
        user 객체를 함께 로드하여 commit 전에 이벤트 페이로드를 준비합니다.
        """
        user_uuid = uuid.UUID(customer_key)
        payment_key = payment_data.get("paymentKey")

        # 멱등성 체크를 위한 쿼리와 메인 쿼리를 분리하거나,
        # 메인 쿼리에서 user 정보를 함께 가져옵니다.
        
        subscription = await db.scalar(
            select(models.Subscription)
            .options(
                joinedload(models.Subscription.plan),
                joinedload(models.Subscription.user)
            )
            .filter(models.Subscription.user_id == user_uuid)
        )

        if not subscription:
            logger.error(f"Cannot update subscription. No subscription found for user_id: {customer_key}")
            raise HTTPException(status_code=404, detail="Subscription not found for webhook processing.")

        # 멱등성 체크를 subscription 조회 이후로 이동 (더 효율적)
        if subscription.payment_gateway_sub_id == payment_key:
            logger.warning(f"Webhook for paymentKey {payment_key} has already been processed. Skipping.")
            return subscription

        user = subscription.user
        if not user:
             logger.error(f"Data integrity error: Subscription {subscription.id} has no associated user.")
             raise HTTPException(status_code=500, detail="Subscription has no user.")

        # --- DB 상태 갱신 ---
        new_period_end = datetime.now(timezone.utc) + relativedelta(months=1)
        subscription.status = "active"
        subscription.current_period_end = new_period_end
        subscription.payment_gateway_sub_id = payment_key # 마지막 성공한 결제 ID 기록

        if subscription.plan and subscription.plan.monthly_credit_reward > 0:
            await credit_service.grant_subscription_bonus_credits(
                db=db, user_id=user_uuid,
                amount=subscription.plan.monthly_credit_reward,
                source_id=uuid.UUID(payment_data.get("orderId"))
            )
            logger.info(f"Granted {subscription.plan.monthly_credit_reward} bonus credits...")
        
        logger.info(
            f"Subscription for user {customer_key} successfully renewed. "
            f"Plan: {subscription.plan.name.value}, New expiration: {new_period_end.isoformat()}"
        )

        event_payload = {
            "user_id": str(user.id),
            "user_email": user.email,
            "username": user.username,
            "plan_name": subscription.plan.name.value,
            "amount": payment_data.get("totalAmount", subscription.plan.price),
            "next_payment_date": subscription.current_period_end
        }

        publish_event("subscription.renewed", event_payload)

        return subscription
    
    async def handle_subscription_payment_failure(
        self,
        db: AsyncSession,
        customer_key: str,
        failure_data: dict,
    ):
        user_uuid = uuid.UUID(customer_key)
        subscription = await db.scalar(
            select(models.Subscription)
            .options(
                joinedload(models.Subscription.user), 
                joinedload(models.Subscription.plan)
            )
            .filter_by(user_id=user_uuid)
        )

        if not subscription or not subscription.user or not subscription.plan:
            logger.warning(f"Received payment failure webhook for non-existent subscription/user. User ID: {customer_key}")
            return

        subscription.status = "canceled"
        
        failure_code = failure_data.get("code")
        failure_message = failure_data.get("message")
        
        publish_event(
            "subscription.payment.failed",
            {
                "user_id": customer_key,
                "user_email": subscription.user.email,
                "username": subscription.user.username,
                "plan_name": subscription.plan.name.value,
                "failure_code": failure_code,
                "failure_message": failure_message,
            },
        )
        
        logger.info(f"Subscription for user {customer_key} has been canceled due to payment failure: {failure_message}")

    async def change_subscription_plan(
        self,
        db: AsyncSession,
        user: models.User,
        new_plan_id: uuid.UUID,
        toss_client: TossPaymentsClient
    ) -> models.Subscription:
        """
        사용자의 구독 플랜을 변경합니다.
        - 업그레이드: 차액 즉시 결제 후 즉시 반영
        - 다운그레이드: 다음 결제일에 반영 (예약)
        """
        subscription = await db.scalar(
            select(models.Subscription)
            .options(joinedload(models.Subscription.plan))
            .filter_by(user_id=user.id)
        )

        if not subscription:
            raise HTTPException(status_code=404, detail="활성 구독 정보가 없습니다.")
        
        if not subscription.payment_gateway_customer_key:
            raise HTTPException(status_code=400, detail="등록된 결제 수단이 없습니다. 카드를 먼저 등록해주세요.")

        new_plan = await plan_service.get_plan_by_id(db, new_plan_id)
        if not new_plan:
            raise HTTPException(status_code=404, detail="변경할 플랜을 찾을 수 없습니다.")
        
        current_plan = subscription.plan
        if current_plan.id == new_plan_id:
            raise HTTPException(status_code=400, detail="이미 해당 플랜을 구독 중입니다.")

        # 1. 다운그레이드 (가격이 더 낮아지는 경우) -> 예약
        if new_plan.price < current_plan.price:
            subscription.next_plan_id = new_plan_id
            await db.flush()

            # Identity Map을 우회하기 위해 expunge
            db.expunge(subscription)

            logger.info(f"User {user.id} scheduled downgrade to {new_plan.name.value}")

            # select + options 패턴으로 완전히 새로 로드
            stmt = (
                select(models.Subscription)
                .options(
                    joinedload(models.Subscription.plan).joinedload(models.Plan.features),
                    joinedload(models.Subscription.next_plan).joinedload(models.Plan.features),
                )
                .where(models.Subscription.id == subscription.id)
            )
            subscription = await db.scalar(stmt)
            return subscription

        # 2. 업그레이드 (가격이 더 높아지는 경우) -> 즉시 결제 및 반영
        # 일할 계산 (Proration)
        now = datetime.now(timezone.utc)
        period_end = subscription.current_period_end
        
        if period_end <= now:
            # 만료되었거나 갱신 시점인 경우 -> 전체 금액 결제
            prorated_charge = new_plan.price
        else:
            total_days = 30 # 한 달을 30일로 가정
            remaining_days = (period_end - now).days + 1 # 남은 일수 (오늘 포함)
            
            if remaining_days < 0: remaining_days = 0
            
            daily_rate_old = current_plan.price / total_days
            daily_rate_new = new_plan.price / total_days
            
            # 차액 계산: (새 플랜 일할 - 구 플랜 일할) * 남은 일수
            prorated_charge = int((daily_rate_new - daily_rate_old) * remaining_days)
        
        if prorated_charge > 0:
            try:
                order_id = f"CHG_{uuid.uuid4().hex[:12]}"
                order_name = f"{new_plan.name.value} 플랜 업그레이드 (차액 결제)"
                
                await payment_service.charge_subscription_renewal(
                    toss_client=toss_client,
                    billing_key=subscription.payment_gateway_customer_key,
                    customer_key=str(user.id),
                    order_id=order_id,
                    order_name=order_name,
                    amount=prorated_charge,
                    customer_email=user.email
                )
                logger.info(f"Charged {prorated_charge} for plan upgrade for user {user.id}")
            except Exception as e:
                logger.error(f"Failed to charge for plan upgrade: {e}")
                raise HTTPException(status_code=500, detail="플랜 변경 결제에 실패했습니다.")

        # 플랜 변경 반영
        subscription.plan_id = new_plan_id
        subscription.plan = new_plan
        subscription.next_plan_id = None # 예약된 변경 취소

        await db.flush()

        # 업그레이드 시 차등 크레딧 지급
        current_plan_credits = current_plan.monthly_credit_reward
        new_plan_credits = new_plan.monthly_credit_reward
        credit_difference = new_plan_credits - current_plan_credits

        if credit_difference > 0:
            await credit_service.grant_subscription_bonus_credits(
                db=db,
                user_id=user.id,
                amount=credit_difference,
                source_id=f"UPGRADE_{subscription.id}"
            )
            logger.info(
                f"Granted {credit_difference} additional credits for upgrade "
                f"from {current_plan.name.value} to {new_plan.name.value}"
            )

        # Identity Map을 우회하기 위해 expunge
        db.expunge(subscription)

        logger.info(f"User {user.id} upgraded plan to {new_plan.name.value}")

        # select + options 패턴으로 완전히 새로 로드
        stmt = (
            select(models.Subscription)
            .options(
                joinedload(models.Subscription.plan).joinedload(models.Plan.features),
                joinedload(models.Subscription.next_plan).joinedload(models.Plan.features),
            )
            .where(models.Subscription.id == subscription.id)
        )
        subscription = await db.scalar(stmt)
        return subscription

    async def update_payment_method(
        self,
        db: AsyncSession,
        user: models.User,
    ) -> dict:
        """
        사용자의 결제 수단을 변경하기 위한 Toss Payments 빌링키 재발급 URL을 생성합니다.
        """
        subscription = await db.scalar(
            select(models.Subscription)
            .options(joinedload(models.Subscription.plan))
            .filter_by(user_id=user.id)
        )

        if not subscription:
            raise HTTPException(status_code=404, detail="활성 구독 정보가 없습니다.")
        
        if not subscription.payment_gateway_customer_key:
            raise HTTPException(status_code=400, detail="등록된 결제 수단이 없습니다.")

        # 프론트엔드 SDK에서 사용할 설정값 반환
        customer_key = str(user.id)
        success_url = f"{settings.APP.FRONTEND_BASE_URL}/subscription/update-card/success"
        fail_url = f"{settings.APP.FRONTEND_BASE_URL}/subscription/update-card/fail"
        
        return {
            "customer_key": customer_key,
            "success_url": success_url,
            "fail_url": fail_url,
            "client_key": settings.PAYMENT.TOSS_WIDGET_CLIENT_KEY
        }

    async def process_recurring_payments(
        self,
        db: AsyncSession,
        toss_client: TossPaymentsClient
    ):
        """
        만료된 구독을 찾아 정기 결제를 수행합니다.
        """
        now = datetime.now(timezone.utc)
        
        stmt = (
            select(models.Subscription)
            .options(
                joinedload(models.Subscription.user),
                joinedload(models.Subscription.plan),
                joinedload(models.Subscription.next_plan) # 예약된 플랜 로드
            )
            .filter(
                models.Subscription.status == "active",
                models.Subscription.current_period_end <= now,
                models.Subscription.payment_gateway_customer_key.isnot(None)
            )
        )
        result = await db.execute(stmt)
        subscriptions = result.scalars().all()
        
        logger.info(f"Found {len(subscriptions)} subscriptions to renew.")
        
        results = {"success": 0, "failed": 0}
        
        for sub in subscriptions:
            try:
                # [New] 예약된 플랜 변경(다운그레이드) 처리
                if sub.next_plan_id:
                    logger.info(f"Processing scheduled plan change for user {sub.user_id} to {sub.next_plan.name.value}")
                    sub.plan_id = sub.next_plan_id
                    sub.plan = sub.next_plan # 메모리 상 객체도 업데이트
                    sub.next_plan_id = None
                    sub.next_plan = None
                    # DB에 반영하여 plan 관계 업데이트 (가격 정보 등)
                    await db.flush()
                    await db.refresh(sub, attribute_names=["plan"])

                new_order_id = str(uuid.uuid4())
                order_name = f"{sub.plan.name.value} 정기 결제"
                
                payment_result = await payment_service.charge_subscription_renewal(
                    toss_client=toss_client,
                    billing_key=sub.payment_gateway_customer_key,
                    customer_key=str(sub.user_id),
                    order_id=new_order_id,
                    order_name=order_name,
                    amount=sub.plan.price,
                    customer_email=sub.user.email
                )
                
                new_period_end = datetime.now(timezone.utc) + relativedelta(months=1)
                sub.status = "active"
                sub.current_period_end = new_period_end
                sub.payment_gateway_sub_id = payment_result.get("paymentKey")
                
                if sub.plan.monthly_credit_reward > 0:
                    await credit_service.grant_subscription_bonus_credits(
                        db=db,
                        user_id=sub.user_id,
                        amount=sub.plan.monthly_credit_reward,
                        source_id=new_order_id
                    )
                
                results["success"] += 1
                logger.info(f"Successfully renewed subscription for user {sub.user_id}")
                
            except Exception as e:
                logger.error(f"Failed to renew subscription for user {sub.user_id}: {e}")
                sub.status = "canceled"
                results["failed"] += 1
        
        return results

    async def cancel_plan_change(
        self,
        db: AsyncSession,
        user: models.User,
    ) -> models.Subscription:
        """
        예약된 플랜 변경을 취소합니다.
        """
        subscription = await db.scalar(
            select(models.Subscription)
            .options(
                joinedload(models.Subscription.plan).joinedload(models.Plan.features),
                joinedload(models.Subscription.next_plan).joinedload(models.Plan.features),
            )
            .filter_by(user_id=user.id)
        )

        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="구독 정보를 찾을 수 없습니다."
            )

        if not subscription.next_plan_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="예약된 플랜 변경이 없습니다."
            )

        # 예약 취소
        subscription.next_plan_id = None
        subscription.next_plan = None
        await db.flush()

        logger.info(f"Cancelled scheduled plan change for user {user.id}")

        # 변경사항 반영을 위해 다시 로드
        db.expunge(subscription)
        stmt = (
            select(models.Subscription)
            .options(
                joinedload(models.Subscription.plan).joinedload(models.Plan.features),
                joinedload(models.Subscription.next_plan).joinedload(models.Plan.features),
            )
            .where(models.Subscription.id == subscription.id)
        )
        subscription = await db.scalar(stmt)
        return subscription
        
# 서비스 인스턴스 생성
subscription_service = SubscriptionService()