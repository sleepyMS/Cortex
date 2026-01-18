# file: backend/app/routers/marketplace.py
import uuid
from typing import List, Union, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from .. import schemas, models
from ..dependencies import get_async_db, get_current_active_user, get_current_user_or_none, get_widget_toss_client
from ..event_bus import publish_event
from ..services.marketplace_service import marketplace_service
from ..services.payment_service import payment_service 
from ..gateways.toss_payments_client import TossPaymentsClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


@router.get(
    "/products",
    response_model=schemas.PaginatedProductsResponse,
    summary="Get a paginated list of marketplace products"
)
async def get_products(
    filters: schemas.ProductFilters = Depends(),
    db: AsyncSession = Depends(get_async_db)
):
    """
    마켓플레이스의 상품(전략, 아이템, AI 모델) 목록을 필터링 및 페이지네이션하여 조회합니다.
    - `productType` (필수): 'STRATEGY', 'SHOP_ITEM', 'CREDIT_PACK', 또는 'AI_MODEL'
    - `page`, `limit`, `sortBy`, `searchTerm`, `categories` 등 다양한 필터를 지원합니다.
    """
    try:
        paginated_result = await marketplace_service.list_products(db, filters)
        return paginated_result
    except Exception as e:
        logger.error(f"Error fetching products with filters {filters.model_dump()}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="상품 목록을 조회하는 중 오류가 발생했습니다.")


@router.get(
    "/products/{product_id}",
    response_model=Union[schemas.StrategyProductDetailOwned, schemas.StrategyProductDetailPublic, schemas.ShopItemProductDetail, schemas.AIModelProduct],
    summary="Get details of a single marketplace product"
)
async def get_product_detail(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: Optional[models.User] = Depends(get_current_user_or_none)
):
    """
    상품의 상세 정보를 조회합니다.
    사용자의 로그인 및 소유권 여부에 따라 반환되는 정보의 상세 수준이 달라집니다.
    """
    product = await marketplace_service.get_product_details(db, product_id)
    
    if product.product_type == models.ProductType.STRATEGY:
        return await marketplace_service.get_strategy_product_detail(
            db, product, current_user
        )
    
    elif product.product_type == models.ProductType.SHOP_ITEM:
        return await marketplace_service.get_shop_item_product_detail(db, product)
    
    elif product.product_type == models.ProductType.AI_MODEL:
        return await marketplace_service.get_ai_model_product_detail(db, product, current_user)
    
    # 향후 다른 상품 타입이 추가될 경우를 대비
    raise HTTPException(status_code=400, detail="알 수 없는 상품 타입입니다.")


@router.post(
    "/orders",
    response_model=schemas.OrderResponse,
    status_code=status.HTTP_200_OK,
    summary="[Credit Purchase] Purchase products using credits"
)
async def purchase_with_credit(
    payload: schemas.OrderCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user),
):
    try:
        # 1. 서비스 호출 (내부적으로 주문 생성 및 자산 지급 완료)
        # 이 함수는 관계가 로드되지 않은 'order' 객체를 반환합니다.
        processed_order = await marketplace_service.process_credit_purchase(db, payload, current_user)
        
        # 응답 생성에 필요한 모든 데이터(items -> product)가 미리 로드됩니다.
        final_order = await marketplace_service.get_order_by_id(db, processed_order.id)
        
        # 2. 완전한 객체를 반환합니다.
        # FastAPI의 의존성이 트랜잭션을 자동으로 commit 해줍니다.
        return final_order
        
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error during credit purchase for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="크레딧 결제 중 오류가 발생했습니다.")


@router.post(
    "/checkout/cash",
    response_model=schemas.OrderCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="[Cash Purchase] Create a pending order for cash payment"
)
async def create_order_for_cash_payment(
    payload: schemas.OrderCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    [현금 결제 전용] '크레딧 팩'과 같이 현금 결제가 필요한 상품의 주문을 생성하고,
    Toss Payments와 연동할 결제 정보를 반환합니다.
    """
    # try-except 블록은 로깅 및 커스텀 예외 처리를 위해 유지하되,
    # 수동 commit/rollback 호출만 제거합니다.
    try:
        pending_order = await marketplace_service.create_pending_order_for_cash(db, payload, current_user)
        payment_info = payment_service.prepare_payment_info_for_sdk(order=pending_order, user=current_user)
        # FastAPI의 의존성 주입이 이 함수가 성공적으로 반환되면
        # 자동으로 트랜잭션을 commit 할 것입니다.
        return payment_info
    except HTTPException:
        # FastAPI가 자동으로 rollback 처리합니다.
        raise
    except Exception as e:
        # FastAPI가 자동으로 rollback 처리합니다.
        logger.error(f"Error creating cash order for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="주문 생성 중 오류가 발생했습니다.")
    
@router.post(
    "/listings",
    response_model=schemas.StrategyProduct,
    status_code=status.HTTP_201_CREATED,
    summary="List a strategy on the marketplace"
)
async def list_strategy_on_marketplace(
    payload: schemas.StrategyListPayload,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """사용자의 특정 전략을 마켓플레이스에 상품으로 등록하거나 업데이트합니다."""
    strategy_to_list = await db.get(models.Strategy, payload.strategy_id)
    if not strategy_to_list or strategy_to_list.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="자신의 전략만 마켓에 등록할 수 있습니다.")
    
    product = await marketplace_service.list_strategy_as_product(
        db=db, strategy=strategy_to_list, listing_data=payload, seller=current_user
    )
    await db.commit()
    logger.info(f"Strategy '{strategy_to_list.name}' listed/updated by user {current_user.email}.")
    return product


@router.post(
    "/ai-listings",
    response_model=schemas.AIModelProduct,
    status_code=status.HTTP_201_CREATED,
    summary="List an AI model on the marketplace"
)
async def list_ai_model_on_marketplace(
    payload: schemas.AIModelListPayload,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """사용자의 AI 모델을 마켓플레이스에 상품으로 등록하거나 업데이트합니다."""
    ai_model = await db.get(models.AIModel, payload.model_id)
    
    if not ai_model or ai_model.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="자신의 AI 모델만 마켓에 등록할 수 있습니다.")
    
    if ai_model.status != "completed":
        raise HTTPException(status_code=400, detail="학습이 완료된 모델만 등록할 수 있습니다.")
    
    product = await marketplace_service.list_ai_model_as_product(
        db=db, ai_model=ai_model, listing_data=payload, seller=current_user
    )
    await db.commit()
    logger.info(f"AI Model '{ai_model.name}' listed/updated on marketplace by user {current_user.email}.")
    return product


@router.delete(
    "/listings/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlist a strategy from the marketplace"
)
async def unlist_strategy_from_marketplace(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """특정 상품(리스팅)을 마켓플레이스에서 판매 중단 처리합니다."""
    await marketplace_service.unlist_strategy_product(
        db=db, 
        product_id=product_id, 
        current_user_id=current_user.id
    )
    await db.commit()
    logger.info(f"Marketplace product ID {product_id} unlisted by user {current_user.email}.")

    
@router.get(
    "/orders/{order_id}",
    response_model=schemas.OrderResponse, 
    summary="Get order details by order ID"
)
async def get_order_by_id(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    주문 ID를 사용하여 특정 주문의 상세 정보와 최종 상태를 조회합니다.
    주문 소유권자만 조회할 수 있습니다.
    """
    order = await marketplace_service.get_order_by_id(db, order_id)

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="주문을 찾을 수 없습니다.")
    
    if order.buyer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="주문에 접근할 권한이 없습니다.")

    return order

@router.post(
    "/payments/confirm",
    status_code=status.HTTP_200_OK,
    summary="[결제 승인] Toss Payments 최종 결제 승인 요청"
)
async def confirm_payment(
    payload: schemas.PaymentConfirmPayload,
    db: AsyncSession = Depends(get_async_db),
    toss_client: TossPaymentsClient = Depends(get_widget_toss_client),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    프론트엔드에서 Toss로부터 전달받은 paymentKey로 최종 결제 승인을 요청합니다.
    """
    try:
        # 1. 서버 측 금액 검증 및 최종 승인 요청
        approval_data = await payment_service.verify_and_approve_payment(
            db=db,
            toss_client=toss_client,
            payment_key=payload.payment_key,
            order_id=payload.order_id,
            amount=payload.amount
        )

        # 2. 승인 성공 시, 즉시 'payment.succeeded' 이벤트 발행
        #    (Celery가 이 이벤트를 받아 크레딧 지급 절차를 시작)
        event_payload = {
            "order_id": payload.order_id,
            "gateway_transaction_id": payload.payment_key,
            "amount": payload.amount,
            "customer_key": str(current_user.id)
        }
        publish_event("payment.succeeded", event_payload)
        logger.info(f"Payment for order {payload.order_id} approved. Published 'payment.succeeded' event.")
        
        return {"status": "success", "orderId": payload.order_id}

    except HTTPException as e:
        # 검증 실패 시 에러를 그대로 반환
        raise e
    except Exception as e:
        logger.error(f"Error during payment confirmation for order {payload.order_id}: {e}", exc_info=True)
        # TODO: 여기에 결제는 됐지만 승인에 실패했을 경우를 대비한 보상 트랜잭션 로직(결제 취소 등) 추가 가능
        raise HTTPException(status_code=500, detail="결제 승인 중 오류가 발생했습니다.")