# file: backend/app/gateways/toss_payments_client.py
import base64
import httpx
import asyncio
import uuid
from typing import Dict, Any
from fastapi import HTTPException, status
import logging, json

logger = logging.getLogger(__name__)

class TossPaymentsClient:
    def __init__(self, secret_key: str):
        if not secret_key:
            raise ValueError("Toss Payments secret key is required.")
        encoded_key = base64.b64encode(f"{secret_key}:".encode("utf-8")).decode("utf-8")
        self.base_url = "https://api.tosspayments.com/v1"
        self.auth_headers = {"Authorization": f"Basic {encoded_key}", "Content-Type": "application/json"}

    async def _request(self, method: str, path: str, headers: Dict[str,str] = None, retries: int = 3, backoff_factor: float = 0.5, **kwargs: Any) -> Dict:
        merged_headers = {**self.auth_headers, **(headers or {})}
        async with httpx.AsyncClient() as client:
            attempt = 0
            while True:
                attempt += 1
                try:
                    request_body = kwargs.get('json', None)
                    if request_body:
                        logger.warning(f"Sending to Toss API: {method} {self.base_url}{path} with payload: {json.dumps(request_body, ensure_ascii=False)}")
                    else:
                        logger.warning(f"Sending to Toss API: {method} {self.base_url}{path}")
                    response = await client.request(method, f"{self.base_url}{path}", headers=merged_headers, timeout=10.0, **kwargs)
                    # 안전하게 JSON 시도
                    try:
                        response_data = response.json()
                    except Exception:
                        response_data = {"raw_text": response.text}
                    logger.warning(f"Received from Toss API: {response.status_code} {response.url} - {response_data}")
                    response.raise_for_status()
                    return response_data

                except httpx.HTTPStatusError as e:
                    status_code = e.response.status_code
                    try:
                        error_data = e.response.json()
                    except Exception:
                        error_data = {"message": e.response.text}
                    # 토스 내부 처리 실패인 경우(retry 조건): 500 + code == FAILED_INTERNAL_SYSTEM_PROCESSING
                    if status_code >= 500 and attempt <= retries and error_data.get("code") == "FAILED_INTERNAL_SYSTEM_PROCESSING":
                        sleep_for = backoff_factor * (2 ** (attempt - 1))
                        logger.warning(f"Toss internal error detected ({error_data.get('code')}). retrying in {sleep_for}s (attempt {attempt}/{retries}). TraceId: {e.response.headers.get('X-TossPayments-Trace-Id')}")
                        await asyncio.sleep(sleep_for)
                        continue
                    # 더 이상 재시도하지 않음 -> raise
                    logger.error(f"Toss API Error on {path}: {error_data}", exc_info=True)
                    raise HTTPException(status_code=status_code, detail=error_data.get("message", "결제 오류가 발생했습니다."))
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

    async def charge_billing_key(self, billing_key: str, payload: Dict) -> Dict:
        # 멱등키 추가 + 재시도 로직 활용
        headers = {"Idempotency-Key": str(uuid.uuid4())}
        return await self._request("POST", f"/billing/{billing_key}", headers=headers, json=payload)
