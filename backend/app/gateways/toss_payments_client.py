# file: backend/app/gateways/toss_payments_client.py

import base64
import httpx
from typing import Dict
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class TossPaymentsClient:
    """Toss Payments API와 직접 통신하는 저수준 클라이언트"""
    def __init__(self, secret_key: str):
        if not secret_key:
            raise ValueError("Toss Payments secret key is required.")
        
        encoded_key = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("utf-8")
        self.base_url = "https://api.tosspayments.com/v1"
        self.auth_headers = {"Authorization": f"Basic {encoded_key}"}

    async def _request(self, method: str, path: str, **kwargs) -> Dict:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(
                    method, f"{self.base_url}{path}", headers=self.auth_headers, timeout=10.0, **kwargs
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                error_data = e.response.json()
                logger.error(f"Toss API Error on {path}: {error_data}")
                raise HTTPException(
                    status_code=e.response.status_code,
                    detail=error_data.get("message", "알 수 없는 결제 오류가 발생했습니다."),
                )
            except httpx.RequestError as e:
                logger.error(f"Network error calling Toss API: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="결제 서버와 통신할 수 없습니다.",
                )

    async def approve_payment(self, payment_key: str, order_id: str, amount: int) -> Dict:
        return await self._request("POST", f"/payments/{payment_key}", json={"orderId": order_id, "amount": amount})

    async def issue_billing_key(self, auth_key: str, customer_key: str) -> Dict:
        return await self._request("POST", "/billing/authorizations/issue", json={"authKey": auth_key, "customerKey": customer_key})

    async def charge_billing_key(
        self, billing_key: str, customer_key: str, payload: Dict
    ) -> Dict:
        """
        빌링키로 결제를 실행합니다. customerKey를 payload에 추가합니다.
        """
        # payload에 필수 파라미터인 customerKey를 추가합니다.
        full_payload = {"customerKey": customer_key, **payload}
        return await self._request("POST", f"/billing/{billing_key}", json=full_payload)