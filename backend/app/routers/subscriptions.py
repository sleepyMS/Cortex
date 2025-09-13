# file: backend/app/routers/subscriptions.py 

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import uuid

from .. import schemas, models
from ..dependencies import (
    get_async_db,
    get_current_active_user,
    get_billing_toss_client, 
)
from ..services.subscription_service import subscription_service
from ..gateways.toss_payments_client import TossPaymentsClient  

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get(
    "/me",
    response_model=schemas.SubscriptionSchema,
    summary="Get current user's subscription details",
)
async def get_my_subscription(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    현재 로그인된 사용자의 구독 상세 정보를 조회합니다.
    활성 구독이 없으면 시스템의 기본 'Basic' 플랜 정보를 반환합니다.
    """
    subscription = await subscription_service.get_user_subscription_details(
        db, current_user
    )
    return subscription

@router.post(
    "/register-card",
    response_model=schemas.SubscriptionSchema,
    summary="Register a card for subscription and trigger the first payment",
)
async def register_card_for_subscription(
    request_data: schemas.BillingKeyRegistrationRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
    toss_client: TossPaymentsClient = Depends(get_billing_toss_client),
):
    try:
        # ⚠️ 디버깅용 로그, 문제 해결 후 제거 가능
        logger.warning(f"Received authKey: {request_data.auth_key[:8]}...") 

        subscription_schema = (
            await subscription_service.register_card_and_process_first_payment(
                db=db,
                user=current_user,
                plan_id=request_data.plan_id,
                auth_key=request_data.auth_key,
                toss_client=toss_client,
            )
        )
        logger.info(f"Subscription process completed for user {current_user.email}.")
        return subscription_schema

    except HTTPException as e:
        # 서비스 내에서 발생한 상세 에러 메시지를 그대로 프론트엔드에 전달합니다.
        raise e
    except Exception as e:
        logger.error(f"An unexpected error occurred during card registration: {e}", exc_info=True)
        # 일반적인 서버 오류 메시지 반환
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="결제 시스템에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        )