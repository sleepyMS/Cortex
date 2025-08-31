# file: backend/app/routers/subscriptions.py
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import uuid

from .. import schemas, models
from ..dependencies import get_async_db, get_current_active_user
from ..services.subscription_service import subscription_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get(
    "/me", 
    response_model=schemas.SubscriptionSchema, 
    summary="Get current user's subscription details"
)
async def get_my_subscription(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    현재 로그인된 사용자의 구독 상세 정보를 조회합니다.
    활성 구독이 없으면 시스템의 기본 'Basic' 플랜 정보를 반환합니다.
    """
    subscription = await subscription_service.get_user_subscription_details(db, current_user)
    if not subscription:
        # 이 경우는 일반적으로 발생하지 않지만 (모든 유저는 Basic 플랜을 가져야 함), 예외 처리
        raise HTTPException(status_code=404, detail="구독 정보를 찾을 수 없습니다.")
    
    return subscription


@router.post(
    "/checkout", 
    response_model=schemas.OrderCreateResponse, 
    summary="Get payment info for subscription checkout"
)
async def get_checkout_info(
    checkout_request: schemas.CheckoutRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    특정 플랜 구독을 위한 결제 정보를 생성하여 반환합니다.
    프론트엔드는 이 정보를 사용하여 Toss Payments SDK를 초기화합니다.
    """
    try:
        checkout_info = await subscription_service.create_checkout_info(
            db, current_user, checkout_request.plan_id
        )
        logger.info(f"Checkout info created for user {current_user.email} for plan ID {checkout_request.plan_id}.")
        return checkout_info
    except HTTPException as e:
        # 서비스 계층에서 발생한 HTTP 예외는 그대로 전달
        raise e
    except Exception as e:
        # 예상치 못한 서버 오류 처리
        logger.error(f"Error creating checkout info for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="결제 정보 생성 중 서버 오류가 발생했습니다.")
