# file: backend/app/routers/webhook.py (최종 완성본)

from fastapi import APIRouter, Request, HTTPException, status
import logging

# 일반 결제 승인을 위해 payment_service를 다시 import 합니다.
from ..services.payment_service import payment_service 
from ..event_bus import publish_event 

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/toss-payments", status_code=status.HTTP_200_OK)
async def handle_toss_payments_webhook(request: Request):
    """
    Toss Payments로부터 수신되는 모든 결제 관련 웹훅을 처리하는 엔드포인트입니다.
    
    주요 기능:
    1. 주문 ID(orderId)의 접두사를 분석하여 '구독 결제'와 '일반 결제'를 구분합니다.
    2. 구독 결제는 '성공 통보'로 간주하여 즉시 내부 이벤트(subscription.payment.succeeded)를 발행합니다.
    3. 일반 결제는 위변조 방지를 위해 서버 측에서 최종 '승인' 절차(verify_and_approve_payment)를 거친 후,
       내부 이벤트(payment.succeeded)를 발행합니다.
    4. 모든 시나리오에 대해 Toss Payments에는 200 OK를 응답하여 중복 전송을 방지합니다.
    """
    try:
        payload = await request.json()
        logger.debug(f"Received Toss Payments webhook: {payload}")

        # Toss Payments 웹훅은 실제 데이터가 'data' 객체 내부에 포함될 수 있습니다.
        # 또한 이벤트 타입은 'eventType' 필드로 오는 것이 표준입니다. (예: PAYMENT_STATUS_CHANGED)
        event_type = payload.get("eventType")
        payment_data = payload.get("data")

        if not payment_data or event_type != "PAYMENT_STATUS_CHANGED":
            logger.warning("Received a webhook that is not a payment status change or has no data.")
            return {"status": "ok", "message": "ignored_non_payment_event"}
        
        # 결제 상태가 'DONE' (성공)일 때만 비즈니스 로직을 처리합니다.
        if payment_data.get("status") == 'DONE':
            order_id = payment_data.get("orderId")
            payment_key = payment_data.get("paymentKey")
            amount = int(payment_data.get("totalAmount"))

            if not all([order_id, payment_key, isinstance(amount, int)]):
                logger.error(f"Webhook payload is missing essential fields. OrderID: {order_id}")
                raise HTTPException(status_code=400, detail="Essential fields are missing in webhook data.")

            # --- [핵심] 결제 유형에 따른 분기 처리 ---
            if order_id.startswith("SUB_"):
                # [구독 결제 처리]
                # 서버에서 이미 charge_billing_key로 결제를 실행했으므로, 이 웹훅은 '성공 통보'입니다.
                # 별도 승인 없이, 구독 시스템에 알릴 이벤트를 발행합니다.
                event_payload = {
                    "order_id": order_id,
                    "payment_gateway_transaction_id": payment_key,
                    "amount": amount,
                    "payment_data": payment_data  # 카드 정보 등 추가 정보를 위해 전체 데이터 전달
                }
                await publish_event("subscription.payment.succeeded", event_payload)
                logger.info(f"✅ Subscription payment success event published for order: {order_id}")

            else:
                # [일반 결제 처리] (생략되었던 부분)
                # 프론트엔드에서 요청한 결제를 서버에서 최종 확인 및 승인하는 단계입니다.
                # 이 과정은 결제 금액 위변조를 막는 중요한 보안 장치입니다.
                await payment_service.verify_and_approve_payment(
                    payment_key=payment_key,
                    order_id=order_id,
                    amount=amount
                )
                
                # 승인이 성공적으로 완료되면, 관련 시스템에 알릴 이벤트를 발행합니다.
                event_payload = {
                    "order_id": order_id,
                    "gateway_transaction_id": payment_key,
                    "amount": amount,
                    "payment_data": payment_data
                }
                await publish_event("payment.succeeded", event_payload)
                logger.info(f"✅ General payment for order {order_id} verified and approved.")

    except HTTPException as e:
        # verify_and_approve_payment 등 내부 로직에서 발생한 HTTP 예외 처리
        logger.error(f"HTTP exception during webhook processing: {e.detail}", exc_info=True)
    except Exception as e:
        # JSON 파싱 오류 등 기타 예외 처리
        logger.error(f"An unexpected error occurred during webhook processing: {e}", exc_info=True)
    
    # 어떤 경우에도 Toss Payments 서버에는 200 OK를 반환해야 합니다.
    # 만약 여기서 에러를 반환하면, Toss는 웹훅이 실패했다고 판단하고 동일한 내용을 계속해서 재전송합니다.
    return {"status": "ok"}