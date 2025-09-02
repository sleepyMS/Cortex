# file: backend/app/routers/marketplace.py
import uuid
from typing import List, Union
from fastapi import APIRouter, Depends, HTTPException, status, Request
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from .. import schemas, models
from ..dependencies import get_async_db, get_current_active_user, create_owner_verifier
from ..services.marketplace_service import marketplace_service
from ..services.payment_service import payment_service # 결제 서비스 import

logger = logging.getLogger(__name__)

# [수정] 파일명에 맞춰 router.py가 아닌 marketplace.py로 명명
router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

get_verified_strategy = create_owner_verifier(models.Strategy, owner_field="author_id")

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
    마켓플레이스의 상품(전략, 아이템) 목록을 필터링 및 페이지네이션하여 조회합니다.
    - `productType` (필수): 'STRATEGY' 또는 'SHOP_ITEM'
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
    response_model=Union[schemas.StrategyProductDetail, schemas.ShopItemProductDetail],
    summary="Get details of a single marketplace product"
)
async def get_product_detail(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """특정 상품 하나의 상세 정보를 타입에 맞춰 조회합니다."""
    # 1. 기본 상품 정보 조회
    product = await marketplace_service.get_product_details(db, product_id)
    
    # 2. 상품 타입에 따라 적절한 서비스 함수를 호출하여 상세 정보 조합
    if product.product_type == models.ProductType.STRATEGY:
        return await marketplace_service.get_strategy_product_detail(db, product)
    
    elif product.product_type == models.ProductType.SHOP_ITEM:
        return await marketplace_service.get_shop_item_product_detail(db, product)
    
    # 이론적으로 도달하지 않아야 하지만, 안정성을 위해 기본 응답 제공
    return product


@router.post(
    "/orders",
    response_model=schemas.OrderCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an order and get payment info"
)
async def create_order(
    payload: schemas.OrderCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """상품 구매를 위한 주문을 생성하고, Toss Payments 연동에 필요한 정보를 반환합니다."""
    try:
        pending_order = await marketplace_service.create_order(db, payload, current_user)
        
        # [수정] PaymentService를 통해 SDK에 필요한 정보 포맷
        payment_info = payment_service.prepare_payment_info_for_sdk(order=pending_order, user=current_user)
        
        await db.commit()
        return payment_info
    except HTTPException as e:
        await db.rollback(); raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating order for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="주문 생성 중 오류가 발생했습니다.")
    
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
    # 소유권 검증을 위해 전략을 먼저 조회합니다.
    strategy_to_list = await db.get(models.Strategy, payload.strategy_id)
    if not strategy_to_list or strategy_to_list.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="자신의 전략만 마켓에 등록할 수 있습니다.")
    
    try:
        product = await marketplace_service.list_strategy_as_product(
            db=db, strategy=strategy_to_list, listing_data=payload, seller=current_user
        )
        await db.commit()
        await db.refresh(product, attribute_names=['seller'])
        logger.info(f"Strategy '{strategy_to_list.name}' listed on marketplace by user {current_user.email}.")
        return product
    except HTTPException as e:
        await db.rollback(); raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error listing strategy {strategy_to_list.id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="전략을 마켓에 등록하는 중 서버 오류가 발생했습니다.")

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
    try:
        # [수정] 이제 이 호출은 서비스 함수의 정의와 정확히 일치합니다.
        await marketplace_service.unlist_strategy_product(
            db=db, 
            product_id=product_id, 
            current_user_id=current_user.id
        )
        await db.commit()
        logger.info(f"Marketplace product ID {product_id} unlisted by user {current_user.email}.")
    except HTTPException as e:
        await db.rollback(); raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error unlisting product {product_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="판매 중단 처리 중 오류가 발생했습니다.")