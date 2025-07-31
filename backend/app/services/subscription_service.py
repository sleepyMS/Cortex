# file: backend/app/services/subscription_service.py

from sqlalchemy.orm import Session
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone

from .. import models, schemas
from ..security import get_password_hash # 비밀번호 해싱 (필요 시)
from ..security import verify_refresh_token_secret, hash_refresh_token_secret # 리프레시 토큰 해싱 (필요 시)

logger = logging.getLogger(__name__)

class SubscriptionService:
    """
    사용자 구독 정보 조회 및 결제 웹훅 이벤트를 처리하여
    Subscription 모델을 업데이트하는 서비스.
    """
    def get_user_subscription(self, db: Session, user_id: int) -> models.Subscription | None:
        """
        특정 사용자의 현재 구독 정보를 조회합니다.
        """
        subscription = db.query(models.Subscription).filter(models.Subscription.user_id == user_id).first()
        if subscription:
            # Plan 정보도 함께 로드되도록 joinload 사용 고려 (쿼리 최적화)
            # subscription = db.query(models.Subscription).options(joinedload(models.Subscription.plan)).filter(...).first()
            pass
        return subscription

    def process_payment_event(self, db: Session, event_type: str, event_data: Dict[str, Any]) -> models.Subscription | None:
        """
        결제 게이트웨이 웹훅 이벤트를 처리하여 Subscription 모델을 업데이트합니다.
        Idempotency(멱등성)를 보장해야 합니다.
        """
        # Stripe 웹훅 이벤트 처리 예시 (다른 게이트웨이별로 로직 분기)
        if event_type == "checkout.session.completed":
            # 새 구독 생성 또는 기존 구독 업데이트 (시험 결제 성공 시)
            session_id = event_data["id"]
            customer_email = event_data["customer_details"]["email"]
            subscription_id_on_gateway = event_data["subscription"] # 결제 게이트웨이의 Subscription ID
            plan_id = event_data["metadata"]["plan_id"] # 메타데이터에서 전달받은 plan_id
            user_id = event_data["metadata"]["user_id"] # 메타데이터에서 전달받은 user_id
            
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                logger.error(f"Webhook: checkout.session.completed for non-existent user_id: {user_id}")
                return None # 사용자 없음 오류

            plan = db.query(models.Plan).filter(models.Plan.id == plan_id).first()
            if not plan:
                logger.error(f"Webhook: checkout.session.completed for non-existent plan_id: {plan_id}")
                return None # 플랜 없음 오류

            # 기존 구독 조회 (Idempotency)
            existing_subscription = db.query(models.Subscription).filter(
                models.Subscription.user_id == user.id
            ).first()

            # 구독 기간 계산 (예시: 한 달 구독)
            # Stripe API의 경우, 'current_period_end'가 웹훅 이벤트에 포함될 수 있음
            current_period_end_ts = event_data["current_period_end"] if "current_period_end" in event_data else (datetime.now(timezone.utc) + timedelta(days=30)).timestamp()
            current_period_end = datetime.fromtimestamp(current_period_end_ts, tz=timezone.utc)

            if existing_subscription:
                # 기존 구독 업데이트
                existing_subscription.plan_id = plan.id
                existing_subscription.status = "active"
                existing_subscription.current_period_end = current_period_end
                existing_subscription.payment_gateway_sub_id = subscription_id_on_gateway
                # refresh_token (만약 Stripe에서 웹훅으로 전달한다면)
                # existing_subscription.refresh_token = event_data.get("refresh_token") # 예시
                db.add(existing_subscription)
                logger.info(f"Webhook: Updated existing subscription for user {user.email} to plan {plan.name}.")
                return existing_subscription
            else:
                # 새로운 구독 생성
                new_subscription = models.Subscription(
                    user_id=user.id,
                    plan_id=plan.id,
                    status="active",
                    current_period_end=current_period_end,
                    payment_gateway_sub_id=subscription_id_on_gateway,
                    # refresh_token (만약 Stripe에서 웹훅으로 전달한다면)
                    # refresh_token=event_data.get("refresh_token") # 예시
                )
                db.add(new_subscription)
                logger.info(f"Webhook: Created new subscription for user {user.email} with plan {plan.name}.")
                return new_subscription

        elif event_type == "customer.subscription.updated":
            # 구독 상태 변경 (갱신 성공, 플랜 변경 등)
            subscription_id_on_gateway = event_data["id"]
            user_id = event_data["metadata"].get("user_id") # Stripe 웹훅은 metadata를 포함함

            subscription = db.query(models.Subscription).filter(
                models.Subscription.payment_gateway_sub_id == subscription_id_on_gateway
            ).first()

            if not subscription:
                logger.warning(f"Webhook: customer.subscription.updated for unknown payment_gateway_sub_id: {subscription_id_on_gateway}")
                return None

            new_status = event_data["status"] # 'active', 'canceled', 'past_due'
            current_period_end = datetime.fromtimestamp(event_data["current_period_end"], tz=timezone.utc)
            
            # 플랜 변경 이벤트 처리 (예: 플랜 ID가 달라진 경우)
            new_plan_id_on_gateway = event_data["plan"]["id"] # Stripe plan ID
            # 우리 시스템의 plan_id와 매핑하는 로직 필요
            # new_plan = db.query(models.Plan).filter(models.Plan.gateway_plan_id == new_plan_id_on_gateway).first()
            # if new_plan: subscription.plan_id = new_plan.id

            subscription.status = new_status
            subscription.current_period_end = current_period_end
            db.add(subscription)
            logger.info(f"Webhook: Updated subscription status for user {subscription.user_id} to '{new_status}'.")
            return subscription

        elif event_type == "customer.subscription.deleted":
            # 구독 취소 또는 만료
            subscription_id_on_gateway = event_data["id"]
            subscription = db.query(models.Subscription).filter(
                models.Subscription.payment_gateway_sub_id == subscription_id_on_gateway
            ).first()

            if not subscription:
                logger.warning(f"Webhook: customer.subscription.deleted for unknown payment_gateway_sub_id: {subscription_id_on_gateway}")
                return None
            
            subscription.status = "canceled"
            # 만료된 구독이라면 current_period_end를 현재 시점으로 설정 고려
            if subscription.current_period_end > datetime.now(timezone.utc):
                 subscription.current_period_end = datetime.now(timezone.utc) # 즉시 만료 처리
            
            # 리프레시 토큰 무효화 (결제 게이트웨이 리프레시 토큰이 models.Subscription에 있다면)
            # if subscription.refresh_token:
            #     # 해당 리프레시 토큰을 무효화하는 로직 (예: DB에서 삭제 또는 플래그 설정)
            #     subscription.refresh_token = None
            db.add(subscription)
            logger.info(f"Webhook: Canceled subscription for user {subscription.user_id}.")
            return subscription

        else:
            logger.info(f"Webhook: Unhandled event type: {event_type}. Event Data: {event_data}")
            return None # 처리하지 않는 이벤트 타입

# 서비스 인스턴스 생성
subscription_service = SubscriptionService()