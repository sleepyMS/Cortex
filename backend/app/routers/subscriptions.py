# file: backend/app/routers/subscriptions.py 

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
import logging
import uuid

from .. import schemas, models
from ..dependencies import (
    get_async_db,
    get_current_active_user,
    get_billing_toss_client, 
)
from ..services.subscription_service import subscription_service
from ..services.payment_service import payment_service
from ..services.plan_service import plan_service
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

@router.post("/change-plan", response_model=schemas.SubscriptionSchema)
async def change_subscription_plan(
    request_data: schemas.SubscriptionChangeRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user),
    toss_client: TossPaymentsClient = Depends(get_billing_toss_client)
):
    """
    기존 빌링키를 사용하여 플랜을 변경합니다.
    - 업그레이드: 차액 즉시 결제
    - 다운그레이드: 다음 결제일에 반영 예약
    """
    subscription = await subscription_service.change_subscription_plan(
        db, current_user, request_data.plan_id, toss_client
    )
    return schemas.SubscriptionSchema.model_validate(subscription)

@router.post(
    "/update-payment-method",
    summary="Update payment method (card)"
)
async def update_payment_method(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    사용자의 결제 수단(카드)을 변경하기 위한 Toss Payments 위젯 URL을 반환합니다.
    만료된 카드 갱신이나 다른 카드로 변경 시 사용합니다.
    """
    try:
        result = await subscription_service.update_payment_method(
            db=db,
            user=current_user,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate payment method update URL for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="결제 수단 변경 URL 생성에 실패했습니다."
        )

@router.post(
    "/update-billing-key",
    summary="Update billing key after card registration"
)
async def update_billing_key(
    request_data: schemas.BillingKeyRegistrationRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
    toss_client: TossPaymentsClient = Depends(get_billing_toss_client),
):
    """
    Toss Payments에서 새 카드 등록 후 authKey를 받아 빌링키를 업데이트합니다.
    기존 subscription의 billing_key를 새 billing_key로 변경합니다.
    """
    try:
        # authKey로 빌링키 발급
        billing_response = await payment_service.issue_billing_key(
            toss_client=toss_client,
            auth_key=request_data.auth_key,
            customer_key=str(current_user.id),
        )
        
        new_billing_key = billing_response.get("billingKey")
        if not new_billing_key:
            raise HTTPException(status_code=500, detail="빌링키 발급에 실패했습니다.")

        # 기존 subscription의 billing_key 업데이트
        subscription = await db.scalar(
            select(models.Subscription).filter_by(user_id=current_user.id)
        )
        
        if not subscription:
            raise HTTPException(status_code=404, detail="구독 정보를 찾을 수 없습니다.")
        
        subscription.payment_gateway_customer_key = new_billing_key
        await db.flush()
        
        logger.info(f"Updated billing key for user {current_user.id}")
        
        return {"message": "카드가 성공적으로 변경되었습니다.", "success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update billing key for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="카드 변경 처리 중 오류가 발생했습니다."
        )

@router.post(
    "/cancel-plan-change",
    summary="Cancel scheduled plan change"
)
async def cancel_plan_change(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    예약된 플랜 변경을 취소합니다.
    """
    try:
        subscription = await subscription_service.cancel_plan_change(
            db=db,
            user=current_user,
        )
        await db.commit()
        
        return {
            "message": "플랜 변경 예약이 취소되었습니다.",
            "subscription": schemas.SubscriptionSchema.model_validate(subscription)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel plan change for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="플랜 변경 예약 취소 중 오류가 발생했습니다."
        )

@router.post(
    "/cancel-subscription",
    summary="Cancel subscription"
)
async def cancel_subscription(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    구독을 해지합니다. 다음 결제일에 Basic 플랜으로 전환됩니다.
    """
    try:
        # 현재 구독 확인
        subscription = await db.scalar(
            select(models.Subscription)
            .options(joinedload(models.Subscription.plan))
            .filter_by(user_id=current_user.id)
        )
        
        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="활성 구독 정보가 없습니다."
            )
        
        # 이미 Basic 플랜인 경우
        if subscription.plan.name == models.PlanType.BASIC:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 Basic 플랜을 사용 중입니다."
            )
        
        # Basic 플랜 ID 조회
        basic_plan = await plan_service.get_plan_by_name(db, models.PlanType.BASIC)
        
        if not basic_plan:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Basic 플랜을 찾을 수 없습니다."
            )
        
        # 다운그레이드 로직 재사용 (Basic 플랜으로 예약)
        subscription.next_plan_id = basic_plan.id
        await db.flush()
        
        # 변경사항 반영을 위해 다시 로드
        db.expunge(subscription)
        stmt = (
            select(models.Subscription)
            .options(
                joinedload(models.Subscription.plan).joinedload(models.Plan.features),
                joinedload(models.Subscription.next_plan).joinedload(models.Plan.features),
            )
            .where(models.Subscription.id == subscription.id)
        )
        subscription = await db.scalar(stmt)
        
        await db.commit()
        
        logger.info(f"User {current_user.id} cancelled subscription")
        
        return {
            "message": "구독이 해지되었습니다. 현재 결제 기간이 끝나면 Basic 플랜으로 전환됩니다.",
            "subscription": schemas.SubscriptionSchema.model_validate(subscription)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel subscription for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=500,
            detail="구독 해지 중 오류가 발생했습니다."
        )