# file: backend/app/routers/subscriptions.py

from fastapi import APIRouter, HTTPException, Depends, status, Request, Header
from sqlalchemy.orm import Session
import logging
from typing import List, Optional, Dict, Any
import os

from .. import schemas, models, security
from ..database import get_db
from ..services.subscription_service import subscription_service # 👈 구독 서비스 임포트
from ..services.payment_gateway_service import payment_gateway_service # 👈 결제 게이트웨이 서비스 임포트
from ..services.plan_service import plan_service # 👈 플랜 서비스 임포트 (플랜 가격 조회용)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Payments"])

# --- 사용자 구독 정보 조회 엔드포인트 ---

@router.get("/me", response_model=schemas.Subscription, summary="Get current user's subscription details")
async def get_my_subscription(
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    현재 로그인된 사용자의 구독 상세 정보를 조회합니다.
    """
    subscription = subscription_service.get_user_subscription(db, current_user.id)
    if not subscription:
        logger.info(f"User {current_user.email} (ID: {current_user.id}) has no active subscription.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="활성화된 구독 정보가 없습니다."
        )
    logger.info(f"User {current_user.email} (ID: {current_user.id}) fetched their subscription details.")
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
    plan = plan_service.get_all_plans(db) # 모든 플랜 로드
    target_plan = next((p for p in plan if p.id == checkout_request.plan_id), None)

    if not target_plan:
        logger.warning(f"User {current_user.email} (ID: {current_user.id}) requested checkout for non-existent plan ID: {checkout_request.plan_id}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 플랜을 찾을 수 없습니다.")
    
    # Stripe 예시: 가격은 센트 단위로 변환
    unit_amount = int(target_plan.price * 100) # USD/KRW 등 통화에 따라 달라짐
    currency = "usd" # 통화 설정 (KRW의 경우 아임포트 고려)

    # 성공/취소 URL은 프론트엔드 URL로 설정되어야 함
    # 실제 운영에서는 .env나 설정 파일을 통해 안전하게 관리되어야 합니다.
    # 성공 URL에는 결제 성공 페이지로 리디렉션될 때 필요한 쿼리 파라미터(session_id 등) 포함 고려
    success_url = os.getenv("FRONTEND_SUCCESS_PAYMENT_URL", "http://localhost:3000/payment/success")
    cancel_url = os.getenv("FRONTEND_CANCEL_PAYMENT_URL", "http://localhost:3000/payment/cancel")

    try:
        # 결제 게이트웨이 선택 (현재는 Stripe로 가정)
        checkout_url = await payment_gateway_service.create_checkout_session(
            payment_gateway="stripe", # 또는 "iamport" 등 선택
            plan_name=target_plan.name,
            unit_amount=unit_amount,
            currency=currency,
            user_email=current_user.email,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": str(current_user.id), "plan_id": str(target_plan.id)} # 메타데이터는 문자열로
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
    request: Request, # 원본 Request 객체에 접근 (body, headers)
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"), # Stripe 웹훅 시그니처 헤더
    db: Session = Depends(get_db) # 👈 db 의존성 주입 추가
    # x_razorpay_signature: Optional[str] = Header(None, alias="x-razorpay-signature") # 다른 게이트웨이 시그니처
    # (아임포트의 경우 별도 검증 방식)
):
    """
    결제 게이트웨이(Stripe, 아임포트 등)로부터 구독 상태 변경에 대한 알림(Webhook)을 수신합니다.
    보안을 위해 웹훅 서명 검증이 필수적입니다.
    """
    raw_payload = await request.body() # 원본 Request Body (bytes)

    # 1. 웹훅 서명 검증 (보안상 매우 중요)
    try:
        # payment_gateway에 따라 검증 로직 분기
        if payment_gateway == "stripe":
            if not stripe_signature:
                logger.warning(f"Stripe webhook received without signature. IP: {request.client.host}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="웹훅 서명이 누락되었습니다.")
            
            event_data = payment_gateway_service.handle_webhook(raw_payload, stripe_signature, "stripe")
        elif payment_gateway == "iamport":
            # 아임포트 웹훅은 일반적으로 서명 헤더 없이, imp_uid를 페이로드로 보내므로,
            # payment_gateway_service.handle_webhook에서 아임포트 API를 호출하여
            # 실제 결제 상태를 조회/검증하는 로직이 필요합니다.
            logger.warning(f"I'mport webhook received. IP: {request.client.host}. Handling via service.")
            event_data = payment_gateway_service.handle_webhook(raw_payload, None, "iamport") # 아임포트는 서명 헤더 없을 수 있음
        else:
            logger.warning(f"Unsupported payment gateway webhook received: {payment_gateway}. IP: {request.client.host}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 결제 게이트웨이 웹훅입니다.")

    except HTTPException as e:
        logger.error(f"Webhook signature verification/parsing failed for {payment_gateway}. Detail: {e.detail}", exc_info=True)
        # 보안상 상세 에러 메시지는 반환하지 않음 (대신 200 OK를 반환하여 게이트웨이가 재시도 안 하도록)
        return {"status": "error", "message": "Webhook verification failed."} # 200 OK 내에 오류 상태 전달
    except Exception as e:
        logger.error(f"An unexpected error occurred during webhook validation for {payment_gateway}: {e}", exc_info=True)
        return {"status": "error", "message": "Internal server error during webhook validation."} # 200 OK 내에 오류 상태 전달

    # 2. 웹훅 이벤트 유형에 따른 비즈니스 로직 처리
    try:
        event_type = event_data.get("type") # Stripe의 경우 event_type
        # 아임포트의 경우 event_data에서 'status', 'imp_uid' 등 추출하여 event_type 매핑
        
        updated_subscription = subscription_service.process_payment_event(db, event_type, event_data)
        db.commit() # 구독 정보 업데이트 커밋
        
        if updated_subscription:
            logger.info(f"Successfully processed webhook event '{event_type}' for user ID: {updated_subscription.user_id} (Subscription ID: {updated_subscription.id}).")
        else:
            logger.info(f"Webhook event '{event_type}' processed, but no subscription updated or unhandled event. Event data: {event_data}")
        
        return {"status": "ok"} # 200 OK를 반환하여 결제 게이트웨이가 재시도를 멈추도록 함
    except Exception as e:
        db.rollback() # 오류 발생 시 롤백
        logger.error(f"Error processing payment event '{event_type}' for {payment_gateway} webhook: {e}", exc_info=True)
        # 웹훅 재시도 방지를 위해 HTTP 200 OK를 반환하되, 내부적으로 오류 기록
        return {"status": "error", "message": "Internal server error during event processing."}