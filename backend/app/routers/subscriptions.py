# file: backend/app/routers/subscriptions.py

from fastapi import APIRouter, HTTPException, Depends, status, Request, Header
from sqlalchemy.orm import Session
import logging
from typing import List, Optional, Dict, Any
import os

from .. import schemas, models, security
from ..database import get_db
from ..services.subscription_service import subscription_service
from ..services.payment_gateway_service import payment_gateway_service
from ..services.plan_service import plan_service
from ..dependencies import get_user_subscription

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Payments"])

# --- 사용자 구독 정보 조회 엔드포인트 ---

@router.get("/me", response_model=schemas.SubscriptionSchema, summary="Get current user's subscription details")
async def get_my_subscription(
    subscription: schemas.SubscriptionSchema = Depends(get_user_subscription)
):
    """
    현재 로그인된 사용자의 구독 상세 정보를 조회합니다.
    (활성화된 구독이 없으면 기본 'Basic' 플랜 정보를 반환합니다.)
    """
    return subscription


@router.post("/checkout", response_model=schemas.CheckoutResponse, summary="Create a payment checkout session")
async def create_checkout_session(
    checkout_request: schemas.CheckoutRequest,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 플랜을 구독하기 위한 결제 세션을 생성하고, 결제 페이지 URL을 반환합니다.
    """
    target_plan = plan_service.get_plan_by_id(db, checkout_request.plan_id)

    if not target_plan:
        logger.warning(f"User {current_user.email} (ID: {current_user.id}) requested checkout for non-existent plan ID: {checkout_request.plan_id}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 플랜을 찾을 수 없습니다.")
    
    unit_amount = int(target_plan.price * 100)
    currency = "usd"

    success_url = os.getenv("FRONTEND_SUCCESS_PAYMENT_URL", "http://localhost:3000/payment/success")
    cancel_url = os.getenv("FRONTEND_CANCEL_PAYMENT_URL", "http://localhost:3000/payment/cancel")

    try:
        checkout_url = await payment_gateway_service.create_checkout_session(
            payment_gateway="stripe",
            plan_name=target_plan.name,
            unit_amount=unit_amount,
            currency=currency,
            user_email=current_user.email,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": str(current_user.id), "plan_id": str(target_plan.id)}
        )
        logger.info(f"User {current_user.email} (ID: {current_user.id}) created checkout session for plan {target_plan.name}.")
        return {"checkout_url": checkout_url}
    except HTTPException as e:
        logger.error(f"Failed to create checkout session for user {current_user.email}: {e.detail}", exc_info=True)
        raise e
    except Exception as e:
        logger.error(f"An unexpected error occurred while creating checkout session for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="결제 세션 생성 중 서버 오류가 발생했습니다."
        )

# --- 결제 게이트웨이 웹훅 엔드포인트 ---

@router.post("/webhooks/payment/{payment_gateway}", status_code=status.HTTP_200_OK, summary="Payment gateway webhook endpoint")
async def handle_payment_webhook(
    payment_gateway: str,
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db)
):
    """
    결제 게이트웨이(Stripe, 아임포트 등)로부터 구독 상태 변경에 대한 알림(Webhook)을 수신합니다.
    """
    raw_payload = await request.body()

    try:
        if payment_gateway == "stripe":
            if not stripe_signature:
                logger.warning(f"Stripe webhook received without signature. IP: {request.client.host}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="웹훅 서명이 누락되었습니다.")
            
            event_data = payment_gateway_service.handle_webhook(raw_payload, stripe_signature, "stripe")
        elif payment_gateway == "iamport":
            logger.warning(f"I'mport webhook received. IP: {request.client.host}. Handling via service.")
            event_data = payment_gateway_service.handle_webhook(raw_payload, None, "iamport")
        else:
            logger.warning(f"Unsupported payment gateway webhook received: {payment_gateway}. IP: {request.client.host}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 결제 게이트웨이 웹훅입니다.")

    except HTTPException as e:
        logger.error(f"Webhook signature verification/parsing failed for {payment_gateway}. Detail: {e.detail}", exc_info=True)
        return {"status": "error", "message": "Webhook verification failed."}
    except Exception as e:
        logger.error(f"An unexpected error occurred during webhook validation for {payment_gateway}: {e}", exc_info=True)
        return {"status": "error", "message": "Internal server error during webhook validation."}

    try:
        event_type = event_data.get("type")
        
        updated_subscription = subscription_service.process_payment_event(db, event_type, event_data)
        db.commit()
        
        if updated_subscription:
            logger.info(f"Successfully processed webhook event '{event_type}' for user ID: {updated_subscription.user_id} (Subscription ID: {updated_subscription.id}).")
        else:
            logger.info(f"Webhook event '{event_type}' processed, but no subscription updated or unhandled event. Event data: {event_data}")
        
        return {"status": "ok"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing payment event '{event_type}' for {payment_gateway} webhook: {e}", exc_info=True)
        return {"status": "error", "message": "Internal server error during event processing."}