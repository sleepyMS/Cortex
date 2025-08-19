# file: backend/app/routers/subscriptions.py

from fastapi import APIRouter, HTTPException, Depends, status, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import Optional

from .. import schemas, models
# ▼▼▼ [수정] 비동기 의존성 및 서비스 임포트 정리 ▼▼▼
from ..dependencies import get_async_db, get_current_active_user
from ..services.subscription_service import subscription_service
# ▲▲▲ [수정] ▲▲▲

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions & Payments"])

# --- 사용자 구독 정보 조회 엔드포인트 ---

@router.get("/me", response_model=schemas.SubscriptionSchema, summary="Get current user's subscription details")
async def get_my_subscription(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    현재 로그인된 사용자의 구독 상세 정보를 비동기로 조회합니다.
    (활성화된 구독이 없으면 기본 'Basic' 플랜 정보를 반환합니다.)
    """
    subscription = await subscription_service.get_user_subscription_details(db, current_user)
    if not subscription:
        # 이 경우는 일반적으로 발생하지 않지만 (모든 유저는 Basic 플랜을 가짐), 예외 처리
        raise HTTPException(status_code=404, detail="구독 정보를 찾을 수 없습니다.")
    
    logger.info(f"User {current_user.email} fetched their subscription details.")
    return subscription


@router.post("/checkout", response_model=schemas.CheckoutResponse, summary="Create a payment checkout session")
async def create_checkout_session(
    checkout_request: schemas.CheckoutRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    특정 플랜을 구독하기 위한 결제 세션을 생성하고, 결제 페이지 URL을 반환합니다.
    """
    try:
        checkout_url = await subscription_service.create_checkout_session(db, current_user, checkout_request.plan_id)
        # 서비스에서 커밋을 처리하지 않으므로, 라우터에서 커밋
        await db.commit()
        logger.info(f"Checkout session created for user {current_user.email} for plan ID {checkout_request.plan_id}.")
        return schemas.CheckoutResponse(checkout_url=checkout_url)
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating checkout session for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="결제 세션 생성 중 서버 오류가 발생했습니다.")

# --- 결제 게이트웨이 웹훅 엔드포인트 ---

@router.post("/webhooks/payment/{payment_gateway}", status_code=status.HTTP_200_OK, summary="Payment gateway webhook endpoint")
async def handle_payment_webhook(
    payment_gateway: str,
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    결제 게이트웨이(Stripe 등)로부터 구독 상태 변경에 대한 알림(Webhook)을 수신합니다.
    """
    raw_payload = await request.body()

    try:
        # 웹훅 처리 로직을 서비스에 위임
        await subscription_service.handle_payment_webhook(
            db=db,
            payment_gateway=payment_gateway,
            payload=raw_payload,
            signature=stripe_signature
        )
        await db.commit()
        return {"status": "ok"}
    except HTTPException as e:
        await db.rollback()
        logger.warning(f"Webhook handling failed: {e.detail}")
        # 결제 게이트웨이에는 200 OK 외의 응답을 보내면 재전송을 시도할 수 있으므로,
        # 내용에만 에러를 담아 200으로 응답하는 것을 고려할 수 있습니다.
        # 여기서는 명확한 에러 식별을 위해 HTTP 에러 코드를 그대로 반환합니다.
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Critical error processing webhook for {payment_gateway}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="웹훅 처리 중 서버 내부 오류가 발생했습니다.")