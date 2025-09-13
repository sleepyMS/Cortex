# file: backend/app/services/payment_service.py

from .. import schemas, models
from ..gateways.toss_payments_client import TossPaymentsClient

from fastapi import HTTPException, status, Request
from typing import Dict
import uuid
import logging

logger = logging.getLogger(__name__)

class PaymentService:
    def prepare_payment_info_for_sdk(
        self, order: models.MarketplaceOrder, user: models.User
    ) -> schemas.OrderCreateResponse:
        """[마켓플레이스용] DB 주문 정보를 SDK가 필요한 정보로 변환"""
        first_product_name = order.items[0].product.name if order.items else "상품 구매"
        order_name = f"{first_product_name}"
        if len(order.items) > 1: order_name += f" 외 {len(order.items) - 1}건"
        return schemas.OrderCreateResponse(
            order_id=order.id, order_name=order_name, amount=order.total_amount,
            customer_name=user.username or user.email, customer_email=user.email,
        )

    async def issue_and_charge_first_subscription(
        self,
        toss_client: TossPaymentsClient,
        auth_key: str,
        user: models.User,
        checkout_info: schemas.OrderCreateResponse,
    ) -> Dict:
        """[구독용] 빌링키 발급과 첫 결제를 한 번에 처리"""
        # 1. 빌링키 발급
        billing_data = await toss_client.issue_billing_key(
            auth_key=auth_key, customer_key=str(user.id)
        )
        billing_key = billing_data.get("billingKey")
        if not billing_key:
            raise HTTPException(status_code=500, detail="빌링키 정보를 가져올 수 없습니다.")
        
        # 2. 결제 요청 payload 생성
        # 금액을 반올림하여 정수로 변환합니다.
        # Python의 round() 함수는 0.5일 때 짝수로 반올림하는 특성이 있으므로, decimal 모듈을 사용하는 것이 더 안전합니다.
        import math
        processed_amount = math.ceil(checkout_info.amount) if checkout_info.amount > 0 else 0
        
        logger.debug(f"Original amount: {checkout_info.amount}")
        logger.debug(f"Processed amount: {processed_amount}")
        
        charge_payload = {
            "amount": processed_amount,
            "orderId": checkout_info.order_id,
            "orderName": checkout_info.order_name,
            "customerEmail": checkout_info.customer_email,
            "customerKey": str(user.id)
        }
        
        # 3. 빌링키로 결제 요청
        #    toss_client.charge_billing_key 함수에 customer_key를 따로 넘길 필요 없이,
        #    완성된 payload 객체만 전달합니다.
        await toss_client.charge_billing_key(
            billing_key=billing_key,
            payload=charge_payload
        )

        return billing_data

payment_service = PaymentService()