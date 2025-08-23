# file: backend/app/services/payment_gateway_service.py

import httpx
import logging
import json
from typing import Dict, Any

from fastapi import HTTPException, status

# --- (변경) 중앙 설정 객체 임포트 ---
from ..config import settings

# Stripe SDK (필요 시 주석 해제)
# import stripe

logger = logging.getLogger(__name__)

class PaymentGatewayService:
    """
    Stripe, I'mport 등 외부 결제 게이트웨이와의 통신 및 웹훅 처리를 담당하는 서비스.
    """
    def __init__(self):
        # --- (변경) 모든 설정을 settings 객체에서 가져옴 ---
        payment_settings = settings.PAYMENT
        
        self.stripe_api_key = payment_settings.STRIPE_SECRET_KEY
        self.stripe_webhook_secret = payment_settings.STRIPE_WEBHOOK_SECRET
        self.stripe_base_url = payment_settings.STRIPE_API_BASE_URL
        
        self.iamport_api_key = payment_settings.IAMPORT_API_KEY
        self.iamport_api_secret = payment_settings.IAMPORT_API_SECRET
        self.iamport_base_url = payment_settings.IAMPORT_API_BASE_URL

        self.is_stripe_configured = all([self.stripe_api_key, self.stripe_webhook_secret])
        self.is_iamport_configured = all([self.iamport_api_key, self.iamport_api_secret])

        if not self.is_stripe_configured:
            logger.warning("Stripe payment gateway is not fully configured.")
        if not self.is_iamport_configured:
            logger.warning("I'mport payment gateway is not fully configured.")

        # stripe.api_key = self.stripe_api_key

    async def create_checkout_session(
        self,
        payment_gateway: str,
        plan_name: str,
        unit_amount: int,
        currency: str,
        user_email: str,
        success_url: str,
        cancel_url: str,
        metadata: Dict[str, Any]
    ) -> str:
        """지정된 결제 게이트웨이를 통해 결제 세션을 생성하고 결제 페이지 URL을 반환합니다."""
        if payment_gateway == "stripe":
            if not self.is_stripe_configured:
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="결제 서비스가 설정되지 않았습니다.")
            
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.stripe_base_url}/checkout/sessions",
                        headers={"Authorization": f"Bearer {self.stripe_api_key}"},
                        data={
                            "payment_method_types[]": "card",
                            "line_items[][price_data][currency]": currency.lower(),
                            "line_items[][price_data][unit_amount]": unit_amount,
                            "line_items[][price_data][product_data][name]": plan_name,
                            "line_items[][quantity]": 1,
                            "mode": "subscription",
                            "customer_email": user_email,
                            "success_url": success_url,
                            "cancel_url": cancel_url,
                            "metadata[user_id]": str(metadata.get("user_id")),
                            "metadata[plan_id]": str(metadata.get("plan_id")),
                        },
                        timeout=10.0
                    )
                    response.raise_for_status()
                    session_data = response.json()
                    session_url = session_data.get("url")
                    
                    if not session_url:
                        logger.error(f"Stripe session URL not found in response: {session_data}")
                        raise ValueError("Stripe did not return a valid session URL.")
                        
                    logger.info(f"Stripe checkout session created for {user_email}, plan: {plan_name}")
                    return session_url
            except httpx.HTTPStatusError as e:
                logger.error(f"Stripe HTTP error: {e.response.text}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="결제 세션 생성에 실패했습니다.")
            except Exception as e:
                logger.error(f"Unexpected error creating Stripe session: {e}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="결제 세션 생성 중 오류 발생.")
        
        elif payment_gateway == "iamport":
            if not self.is_iamport_configured:
                logger.error("I'mport is not configured to create checkout session.")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="결제 서비스가 설정되지 않았습니다.")
            
            # 아임포트는 직접 결제 세션을 생성하는 API보다는,
            # 클라이언트에서 SDK를 통해 결제창을 띄우고, 백엔드는 검증/처리하는 방식이 일반적.
            # 이 엔드포인트는 주로 Stripe와 같은 'Hosted Checkout Page' 방식에 더 적합.
            # 아임포트의 경우, 백엔드에서 사전 검증 및 결제 고유 ID를 생성하여 클라이언트에 넘겨주는 방식으로 구현될 수 있음.
            # 이 예시에서는 단순화하여 Stripe와 유사하게 URL을 반환하는 형태로 가정.
            logger.warning("I'mport direct checkout session creation via backend API is less common. Review implementation.")
            raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="아임포트 결제 세션 생성은 아직 구현되지 않았습니다.")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 결제 게이트웨이입니다.")

    def handle_webhook(self, payload_bytes: bytes, signature: str, payment_gateway: str) -> Dict[str, Any]:
        """
        결제 게이트웨이 웹훅 요청을 검증하고 파싱합니다.
        보안을 위해 반드시 서명(signature)을 검증해야 합니다.
        """
        if payment_gateway == "stripe":
            if not self.is_stripe_configured:
                logger.error("Stripe is not configured to handle webhooks.")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="웹훅 처리가 설정되지 않았습니다.")
            
            try:
                # Stripe 웹훅 서명 검증 예시
                # stripe.Webhook.construct_event(
                #     payload_bytes, signature, self.stripe_webhook_secret
                # )
                # 실제 SDK 사용을 권장하지만, 여기서는 개념 설명
                
                # 가상의 서명 검증 로직 (실제 서명 검증 로직으로 교체 필요)
                if not self._verify_stripe_signature_mock(payload_bytes, signature, self.stripe_webhook_secret):
                    logger.warning(f"Stripe webhook signature verification failed. Payload: {payload_bytes.decode('utf-8', errors='ignore')[:100]}")
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="웹훅 서명 검증 실패.")
                
                event_data = json.loads(payload_bytes.decode('utf-8'))
                logger.info(f"Stripe webhook event received: {event_data.get('type')}")
                return event_data
            except ValueError as e:
                logger.warning(f"Stripe webhook payload invalid: {e}")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="웹훅 페이로드 형식이 잘못되었습니다.")
            except Exception as e:
                logger.error(f"Unexpected error handling Stripe webhook: {e}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="웹훅 처리 중 오류가 발생했습니다.")
        
        elif payment_gateway == "iamport":
            if not self.is_iamport_configured:
                logger.error("I'mport is not configured to handle webhooks.")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="웹훅 처리가 설정되지 않았습니다.")
            
            # 아임포트 웹훅 서명/검증 로직 (아임포트의 특정 방식에 따라 구현 필요)
            # 아임포트는 일반적으로 웹훅 후 `imp_uid`를 받아 아임포트 API를 통해 직접 결제 상태를 조회/검증하는 방식이 많음
            logger.warning("I'mport webhook handling is not fully implemented. Requires specific verification logic.")
            raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="아임포트 웹훅 처리는 아직 구현되지 않았습니다.")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 결제 게이트웨이입니다.")

    def _verify_stripe_signature_mock(self, payload: bytes, signature: str, secret: str) -> bool:
        """
        🚨🚨🚨 중요: 이 함수는 실제 Stripe 웹훅 서명 검증 로직이 아닙니다. 🚨🚨🚨
        실제 운영 환경에서는 Stripe SDK의 `stripe.Webhook.construct_event`를 사용해야 합니다.
        """
        # 이 함수는 실제 구현이 아니며, 단순히 placeholder 역할을 합니다.
        # 실제 Stripe 웹훅 서명 검증 로직은 매우 복잡하며, 타임스탬프 검증, 서명 분할, 해싱 등 여러 단계를 거칩니다.
        # https://stripe.com/docs/webhooks/verify-events 참조
        if signature and secret and payload:
            # 여기서는 단순히 signature 헤더가 존재하면 True를 반환하는 예시로 대체합니다.
            # **반드시 실제 서명 검증 로직으로 교체해야 합니다.**
            if "t=" in signature and "v1=" in signature: # 최소한의 형식 검사
                 return True
        return False


# 서비스 인스턴스 생성
payment_gateway_service = PaymentGatewayService()