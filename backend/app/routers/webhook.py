# file: backend/app/routers/webhook.py

from fastapi import APIRouter, Request, HTTPException, status
import logging
from fastapi import Depends

from ..event_bus import publish_event
from ..services.payment_service import payment_service
from ..dependencies import get_async_db, get_billing_toss_client
from sqlalchemy.ext.asyncio import AsyncSession
from ..gateways.toss_payments_client import TossPaymentsClient

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/toss-payments", status_code=status.HTTP_200_OK)
async def handle_toss_payments_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_db), # DB 세션 의존성 추가
    toss_client: TossPaymentsClient = Depends(get_billing_toss_client) # Toss Client 의존성 추가
):
    """
    Toss Payments로부터 수신되는 모든 결제 관련 웹훅을 처리하는 통합 엔드포인트입니다.

    [개선된 로직]
    1. 결제 상태('DONE' 여부)를 기준으로 '성공'과 '실패' 시나리오를 먼저 분기합니다.
    2. 각 시나리오 내부에서 주문 ID 접두사('SUB_')를 통해 '정기결제'와 '일반결제'를 구분합니다.
    3. 각 상황에 맞는 명확한 이름의 이벤트를 발행하여 Celery Task가 후속 조치를 하도록 위임합니다.
    4. 일반결제 성공 시에만 서버 측 최종 승인 절차를 수행하여 보안을 강화합니다.
    """
    try:
        payload = await request.json()
        logger.warning(f"Received Toss Payments webhook: {payload}")

        event_type = payload.get("eventType")
        payment_data = payload.get("data")

        # 유효성 검사: 결제 상태 변경 이벤트가 아니거나, 데이터가 없으면 무시
        if not payment_data or event_type != "PAYMENT_STATUS_CHANGED":
            logger.info("Ignored webhook: Not a payment status change or no data.")
            return {"status": "ok"}

        order_id = payment_data.get("orderId")
        customer_key = payment_data.get("customerKey") # 구독 결제에서 사용자의 ID

        # --- 1. [핵심] 결제 '성공' 시나리오 처리 ---
        if payment_data.get("status") == 'DONE':
            payment_key = payment_data.get("paymentKey")
            amount = int(payment_data.get("totalAmount", 0))

            if order_id.startswith("SUB_"):
                # [정기결제 성공 처리]
                # 이 웹훅은 정기결제 성공 '통보'이므로, 별도 승인 없이 이벤트만 발행합니다.
                event_payload = {
                    "customer_key": customer_key,
                    "payment_data": payment_data
                }
                publish_event("subscription.recurring_payment.succeeded", event_payload)
                logger.info(f"Published recurring payment SUCCESS event for user: {customer_key}")

            else:
                # [일반결제 성공 처리]
                # 보안을 위해 서버에서 최종 승인 절차를 반드시 거칩니다.
                await payment_service.verify_and_approve_payment(
                    db=db,
                    toss_client=toss_client,
                    payment_key=payment_key, 
                    order_id=order_id, 
                    amount=amount
                )
                event_payload = {
                    "order_id": order_id,
                    "gateway_transaction_id": payment_key,
                    "amount": amount,
                    "customer_key": customer_key
                }
                publish_event("payment.succeeded", event_payload)
                logger.info(f"General payment for order {order_id} verified, approved, and event published.")

        # --- 2. [핵심] 결제 '실패' 시나리오 처리 ---
        else:
            failure_data = payment_data.get("failure")
            if order_id.startswith("SUB_"):
                # [정기결제 실패 처리]
                event_payload = {
                    "customer_key": customer_key,
                    "failure_data": failure_data
                }
                publish_event("subscription.recurring_payment.failed", event_payload)
                logger.warning(f"Published recurring payment FAILURE event for user: {customer_key}")

            else:
                # [일반결제 실패 처리] (필요 시 확장)
                event_payload = {
                    "order_id": order_id,
                    "failure_data": failure_data
                }
                publish_event("payment.failed", event_payload)
                logger.warning(f"Published general payment FAILURE event for order: {order_id}")

    except Exception as e:
        logger.error(f"An unexpected error occurred during webhook processing: {e}", exc_info=True)
        # 예외가 발생하더라도 Toss에는 성공 응답을 보내 중복 전송을 막습니다.
        # 실제 오류는 Sentry 등의 모니터링 도구를 통해 인지해야 합니다.

    # Toss Payments에는 항상 200 OK를 반환하여 웹훅 재전송을 방지합니다.
    return {"status": "ok"}