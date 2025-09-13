# file: backend/app/gateways/toss_payments_client.py

import base64
import httpx
from typing import Dict, Any
from fastapi import HTTPException, status
import logging
import json

logger = logging.getLogger(__name__)

class TossPaymentsClient:
    """Toss Payments API와 직접 통신하는 저수준 클라이언트"""
    def __init__(self, secret_key: str):
        if not secret_key:
            raise ValueError("Toss Payments secret key is required.")
        
        encoded_key = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("utf-8")
        self.base_url = "https://api.tosspayments.com/v1"
        self.auth_headers = {"Authorization": f"Basic {encoded_key}"}

    async def _request(self, method: str, path: str, **kwargs: Any) -> Dict:
        """
        Toss Payments API 요청을 처리하는 내부 함수.
        요청 페이로드와 응답 데이터를 로깅하여 디버깅을 돕습니다.
        """
        async with httpx.AsyncClient() as client:
            try:
                # 1. 요청 페이로드 로깅
                request_body = kwargs.get('json', None)
                if request_body:
                    logger.warning(f"Sending to Toss API: {method} {self.base_url}{path} with payload: {json.dumps(request_body)}")
                else:
                    logger.warning(f"Sending to Toss API: {method} {self.base_url}{path}")
                
                # 2. 실제 API 요청
                response = await client.request(
                    method, 
                    f"{self.base_url}{path}", 
                    headers=self.auth_headers, 
                    timeout=10.0, 
                    **kwargs
                )

                # 3. 응답 데이터 로깅
                response_data = response.json()
                logger.warning(f"Received from Toss API: {response.status_code} {response.url} - {response_data}")
                
                response.raise_for_status()
                return response_data
            
            except httpx.HTTPStatusError as e:
                # 에러 응답 전문 로깅
                error_data = e.response.json()
                logger.error(f"Toss API Error on {path}: {error_data}", exc_info=True)
                raise HTTPException(
                    status_code=e.response.status_code,
                    detail=error_data.get("message", "알 수 없는 결제 오류가 발생했습니다."),
                )
            except httpx.RequestError as e:
                logger.error(f"Network error calling Toss API: {e}", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="결제 서버와 통신할 수 없습니다.",
                )

    async def approve_payment(self, payment_key: str, order_id: str, amount: int) -> Dict:
        return await self._request("POST", f"/payments/{payment_key}", json={"orderId": order_id, "amount": amount})

    async def issue_billing_key(self, auth_key: str, customer_key: str) -> Dict:
        return await self._request("POST", "/billing/authorizations/issue", json={"authKey": auth_key, "customerKey": customer_key})

    async def charge_billing_key(
        self, billing_key: str, payload: Dict
    ) -> Dict:
        """
        빌링키로 결제를 실행합니다. customerKey는 payload에 이미 포함되어야 합니다.
        """
        # Toss API 명세에 따라 billing_key를 URL 경로에 사용
        return await self._request("POST", f"/billing/{billing_key}", json=payload)