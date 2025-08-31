# file: backend/app/routers/webhook.py (신규 파일)
from fastapi import APIRouter, Request, HTTPException, status
from ..services.payment_service import payment_service # 결제 검증 로직을 담을 서비스
from ..event_bus import publish_event 
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/toss-payments", status_code=status.HTTP_200_OK)
async def handle_toss_payments_webhook(request: Request):
    payload = await request.json()
    event_type = payload.get("status")

    if event_type == 'DONE':
        payment_key = payload.get("paymentKey")
        order_id = payload.get("orderId")
        amount = int(payload.get("totalAmount"))

        try:
            # 1. [핵심] PaymentService를 통해 서버 측 결제 승인 및 검증
            await payment_service.verify_and_approve_payment(
                payment_key=payment_key,
                order_id=order_id,
                amount=amount
            )

            # 2. 검증 성공 시에만 '결제 성공' 이벤트 발행
            event_payload = {
                "order_id": order_id,
                "gateway_transaction_id": payment_key,
                "amount": amount
            }
            await publish_event("payment.succeeded", event_payload)
            
        except HTTPException as e:
            # 결제 승인 실패 시, 에러 로깅 후 Toss에 200 OK를 보내 중복 웹훅 방지
            logger.error(f"Webhook processing failed for order {order_id}: {e.detail}")
        
    return {"status": "ok"} # Toss Payments에는 항상 200 OK 응답