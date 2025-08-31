# file: backend/app/services/payment_service.py
import base64
import httpx
import uuid
from fastapi import HTTPException, status, Request

from typing import Dict
import logging

from .. import schemas, models
from ..config import settings

logger = logging.getLogger(__name__)

TOSS_API_BASE_URL = "https://api.tosspayments.com/v1"

class PaymentService:
    """
    Toss Payments와의 모든 통신을 전담하는 서비스.
    API 키 관리, 결제 준비, 결제 승인, 웹훅 검증 등의 역할을 수행합니다.
    """
    def __init__(self):
        # Base64 인코딩된 시크릿 키를 미리 준비합니다.
        # 주의: 키 뒤에 ':'를 붙여서 인코딩해야 합니다.
        self.secret_key = settings.PAYMENT.TOSS_PAYMENTS_SECRET_KEY
        encoded_key = base64.b64encode(f"{self.secret_key}:".encode("utf-8")).decode("utf-8")
        self.auth_headers = {"Authorization": f"Basic {encoded_key}"}

    def prepare_payment_info_for_sdk(
        self, order: models.MarketplaceOrder, user: models.User
    ) -> schemas.OrderCreateResponse:
        """
        DB에 생성된 주문 정보를 바탕으로 프론트엔드 Toss Payments SDK가 필요로 하는
        정보를 포맷하여 반환합니다.
        """
        first_product_name = order.items[0].product.name if order.items else "상품 구매"
        order_name = f"{first_product_name}"
        if len(order.items) > 1:
            order_name += f" 외 {len(order.items) - 1}건"

        return schemas.OrderCreateResponse(
            order_id=order.id,
            order_name=order_name,
            amount=order.total_amount,
            customer_name=user.username or user.email,
            customer_email=user.email,
        )

    async def verify_and_approve_payment(
        self, payment_key: str, order_id: str, amount: int
    ) -> Dict:
        """
        [웹훅 수신 후 호출] Toss Payments 서버에 결제를 최종 승인 요청합니다.
        이 과정은 결제의 위변조를 막는 가장 중요한 서버 측 검증 단계입니다.
        """
        url = f"{TOSS_API_BASE_URL}/payments/{payment_key}"
        payload = {"orderId": order_id, "amount": amount}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, headers=self.auth_headers, json=payload, timeout=10.0)
                response.raise_for_status()  # 2xx 응답이 아니면 예외 발생

                payment_data = response.json()
                logger.info(f"Toss Payments approval success for order {order_id}. Status: {payment_data.get('status')}")
                return payment_data

            except httpx.HTTPStatusError as e:
                # Toss Payments가 보낸 에러 응답을 로깅하고 클라이언트에 전달
                error_data = e.response.json()
                error_code = error_data.get("code", "UNKNOWN_ERROR")
                error_message = error_data.get("message", "결제 승인 중 오류가 발생했습니다.")
                logger.error(f"Toss Payments approval failed for order {order_id}: {error_code} - {error_message}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"[{error_code}] {error_message}")
            except httpx.RequestError as e:
                # 네트워크 오류 등
                logger.error(f"Network error during Toss Payments approval for order {order_id}: {e}")
                raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="결제 서버와 통신할 수 없습니다.")
            
    async def prepare_subscription_payment(self, user: models.User, plan: models.Plan) -> Dict:
        """
        구독 결제를 준비하고 SDK에 필요한 정보를 반환합니다.
        Toss Payments의 경우, 정기결제는 '빌링키' 발급을 먼저 요청할 수 있습니다.
        """
        # 구독 상품에 맞는 orderId와 orderName 생성
        order_id = f"sub_{user.id}_{plan.id}_{uuid.uuid4()}"
        order_name = f"Cortex {plan.name.value} 플랜 구독"

        # 프론트엔드 SDK에 전달할 정보
        return {
            "amount": plan.price,
            "orderId": order_id,
            "orderName": order_name,
            "customerName": user.username or user.email,
            "customerEmail": user.email,
            # 여기에 정기결제에 필요한 추가 파라미터가 포함될 수 있음
        }

# 서비스 인스턴스 생성
payment_service = PaymentService()