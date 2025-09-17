# file: backend/app/services/marketplace_service.py
import uuid
from typing import Dict, Any, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import func, or_, desc, asc, cast, String
from fastapi import HTTPException, status
import logging

from .. import models, schemas
from ..services.payment_service import payment_service 

from ..event_bus import publish_event 

logger = logging.getLogger(__name__)

class MarketplaceService:
    """
    마켓플레이스의 상품 조회, 주문 생성, 자산 지급 등 핵심 비즈니스 로직을 처리하는 서비스
    """

    async def list_products(
        self, db: AsyncSession, filters: schemas.ProductFilters
    ) -> Dict[str, Any]:
        """필터와 페이지네이션을 적용하여 상품 목록을 조회합니다."""

        if filters.product_type == models.ProductType.STRATEGY:
            # --- 1. 전략 상품 조회 로직 ---
            latest_backtest_subquery = (
                select(
                    models.Backtest.strategy_id,
                    models.BacktestResult.total_return_pct,
                    models.BacktestResult.mdd_pct,
                    models.BacktestResult.win_rate_pct,
                    models.BacktestResult.profit_factor,
                    models.BacktestResult.sharpe_ratio,
                    models.BacktestResult.sortino_ratio,
                    func.row_number().over(
                        partition_by=models.Backtest.strategy_id,
                        order_by=models.Backtest.created_at.desc()
                    ).label("row_num")
                )
                .join(models.BacktestResult, models.Backtest.id == models.BacktestResult.backtest_id)
                .filter(models.Backtest.status == 'completed')
                .subquery('latest_backtest')
            )
            
            # [핵심 개선] SELECT 구문에 모든 성과 지표 컬럼을 포함시킵니다.
            query = select(
                models.MarketplaceProduct,
                models.User.username,
                models.BacktestResult.total_return_pct,
                models.BacktestResult.mdd_pct,
                models.BacktestResult.win_rate_pct,
                models.BacktestResult.profit_factor,
                models.BacktestResult.sharpe_ratio,
                models.BacktestResult.sortino_ratio,
            ).join(models.User, models.MarketplaceProduct.seller_id == models.User.id)\
             .outerjoin(
                models.Backtest, 
                models.MarketplaceProduct.representative_backtest_id == models.Backtest.id
             ).outerjoin(
                models.BacktestResult,
                models.Backtest.id == models.BacktestResult.backtest_id
             ).filter(
                models.MarketplaceProduct.is_active == True,
                models.MarketplaceProduct.product_type == models.ProductType.STRATEGY
             )

        else: # models.ProductType.SHOP_ITEM
            # --- 2. 상점 아이템 조회 로직 ---
            query = select(
                models.MarketplaceProduct, 
                models.User.username, 
                models.ShopItemDetail.display_properties
            ).join(models.User, models.MarketplaceProduct.seller_id == models.User.id)\
             .join(models.ShopItemDetail, models.MarketplaceProduct.linked_resource_id == models.ShopItemDetail.id)\
             .filter(
                models.MarketplaceProduct.is_active == True,
                models.MarketplaceProduct.product_type == models.ProductType.SHOP_ITEM
             )

        # --- 3. 공통 필터 및 페이지네이션 로직 ---
        if filters.search_term:
            query = query.filter(models.MarketplaceProduct.name.ilike(f"%{filters.search_term}%"))
        if filters.categories:
            query = query.filter(models.MarketplaceProduct.product_metadata['category'].astext.in_(filters.categories))

        count_query = select(func.count()).select_from(query.alias())
        total_items = await db.scalar(count_query) or 0
        
        if filters.sort_by == "price_asc":
            query = query.order_by(asc(models.MarketplaceProduct.price))
        elif filters.sort_by == "price_desc":
            query = query.order_by(desc(models.MarketplaceProduct.price))
        elif filters.sort_by == "totalReturnPct_desc" and filters.product_type == models.ProductType.STRATEGY:
            query = query.order_by(desc(latest_backtest_subquery.c.total_return_pct).nullslast())
        else:
            query = query.order_by(desc(models.MarketplaceProduct.created_at))

        query = query.offset((filters.page - 1) * filters.limit).limit(filters.limit)
        
        db_results = await db.execute(query)
        
        # --- 4. 최종 응답 데이터 조립 ---
        products_response = []
        if filters.product_type == models.ProductType.STRATEGY:
            
            result_list = list(db_results)
            logger.warning(f"Found {len(result_list)} strategy products in DB.")

            for db_result_tuple in result_list:
                (product, username, total_return, mdd, win_rate, 
                 profit_factor, sharpe_ratio, sortino_ratio) = db_result_tuple

                summary_data = None
                if total_return is not None:
                    summary_data = schemas.BacktestResultSummaryForCard(
                        total_return_pct=total_return,
                        mdd_pct=mdd,
                        win_rate_pct=win_rate,
                        profit_factor=profit_factor,
                        sharpe_ratio=sharpe_ratio,
                        sortino_ratio=sortino_ratio
                    )

                data_to_validate = product.__dict__
                data_to_validate['author'] = schemas.ProductAuthor(username=username)
                data_to_validate['latest_backtest_summary'] = summary_data
                
                validated_product = schemas.StrategyProduct.model_validate(data_to_validate, from_attributes=True)
                products_response.append(validated_product)
        else: # SHOP_ITEM
            for product, username, display_properties in db_results:
                product.author = schemas.ProductAuthor(username=username)
                product.display_properties = display_properties
                products_response.append(schemas.ShopItemProduct.model_validate(product))

        return {
            "products": products_response,
            "meta": {
                "totalItems": total_items,
                "itemCount": len(products_response),
                "itemsPerPage": filters.limit,
                "totalPages": (total_items + filters.limit - 1) // filters.limit,
                "currentPage": filters.page,
            },
        }

    async def list_strategy_as_product(self, db: AsyncSession, strategy: models.Strategy, 
                                     listing_data: schemas.StrategyListPayload, seller: models.User) -> models.MarketplaceProduct:
        
        # 소유권 검증은 라우터에서 이미 처리됨
        existing_product = await db.scalar(select(models.MarketplaceProduct).filter(models.MarketplaceProduct.linked_resource_id == strategy.id))
        
        metadata = {"category": listing_data.category, "positionType": listing_data.position_type}

        if existing_product:
            existing_product.price = listing_data.price
            existing_product.description = listing_data.description
            existing_product.product_metadata = metadata
            existing_product.representative_backtest_id = listing_data.representative_backtest_id
            existing_product.is_active = True
            product = existing_product
        else:
            product = models.MarketplaceProduct(
                name=strategy.name, description=listing_data.description or strategy.description,
                price=listing_data.price, product_type=models.ProductType.STRATEGY,
                inventory_type=models.InventoryType.UNLOCK, linked_resource_id=strategy.id,
                seller_id=seller.id, product_metadata=metadata,
                representative_backtest_id=listing_data.representative_backtest_id
            )
            db.add(product)

        await db.flush()

        product.seller = seller
        
        return product

    async def create_order(self, db: AsyncSession, payload: schemas.OrderCreate, buyer: models.User) -> models.MarketplaceOrder:
        total_amount = 0.0; order_items = []
        product_ids = [item.product_id for item in payload.items]
        products_result = await db.execute(select(models.MarketplaceProduct).filter(models.MarketplaceProduct.id.in_(product_ids)))
        products_map = {p.id: p for p in products_result.scalars().all()}
        if len(products_map) != len(product_ids): raise HTTPException(status_code=404, detail="일부 상품을 찾을 수 없습니다.")
        for item_data in payload.items:
            product = products_map[item_data.product_id]
            total_amount += product.price * item_data.quantity
            order_items.append(models.MarketplaceOrderItem(product_id=product.id, quantity=item_data.quantity, price_at_purchase=product.price))
        new_order = models.MarketplaceOrder(buyer_id=buyer.id, total_amount=total_amount, status=models.OrderStatus.PENDING, items=order_items)
        db.add(new_order)
        await db.flush()
        return new_order
    
    def create_order_and_prepare_payment(
        self, order: models.MarketplaceOrder, user: models.User
    ) -> schemas.OrderCreateResponse:
        """
        생성된 주문을 바탕으로 PaymentService를 호출하여 SDK 결제 정보를 생성합니다.
        """
        return payment_service.prepare_payment_info_for_sdk(order=order, user=user)

        
    async def fulfill_order(
        self, db: AsyncSession, order_id: uuid.UUID, gateway_transaction_id: str
    ):
        """Celery Task에서 호출되는 주문 이행 비즈니스 로직."""
        logger.info(f"Fulfilling order: {order_id}")
        order = await db.get(
            models.MarketplaceOrder,
            order_id,
            options=[
                selectinload(models.MarketplaceOrder.items).joinedload(
                    models.MarketplaceOrderItem.product
                )
            ],
        )

        if not order or order.status != models.OrderStatus.PENDING:
            logger.warning(f"Order {order_id} not found or not in PENDING state.")
            return

        for item in order.items:
            product = item.product
            if product.inventory_type == models.InventoryType.UNLOCK:
                # 소유권이 없을 때만 자산을 지급하도록 로직을 간소화
                ownership_exists_query = select(models.UserPurchasedStrategy).filter_by(
                    user_id=order.buyer_id, strategy_id=product.linked_resource_id
                )
                ownership_exists = await db.scalar(select(ownership_exists_query.exists()))

                if not ownership_exists:
                    db.add(
                        models.UserPurchasedStrategy(
                            user_id=order.buyer_id,
                            strategy_id=product.linked_resource_id,
                            order_item_id=item.id,
                        )
                    )
                    logger.info(
                        f"Granted UNLOCK asset (strategy: {product.linked_resource_id}) to user {order.buyer_id}"
                    )

            elif product.inventory_type == models.InventoryType.CONSUMABLE:
                # 1. 사용자의 인벤토리에 해당 상품이 이미 있는지 확인
                existing_inventory_item = await db.scalar(
                    select(models.UserInventory).filter_by(
                        user_id=order.buyer_id, product_id=product.id
                    )
                )

                if existing_inventory_item:
                    # 2. 이미 있다면, quantity를 구매한 수량만큼 더함
                    existing_inventory_item.quantity += item.quantity
                    logger.info(
                        f"Updated quantity for existing CONSUMABLE asset (product: {product.id}) for user {order.buyer_id}. New quantity: {existing_inventory_item.quantity}"
                    )
                else:
                    # 3. 없다면, 새로운 인벤토리 아이템을 생성
                    db.add(
                        models.UserInventory(
                            user_id=order.buyer_id,
                            product_id=product.id,
                            quantity=item.quantity # 구매한 수량으로 초기화
                        )
                    )
                    logger.info(
                        f"Granted {item.quantity} new CONSUMABLE asset(s) (product: {product.id}) to user {order.buyer_id}"
                    )

        order.status = models.OrderStatus.COMPLETED
        order.gateway_transaction_id = gateway_transaction_id
        await db.flush()

        await publish_event(
            "order.fulfilled",
            {"order_id": str(order_id), "buyer_id": str(order.buyer_id)},
        )
        logger.info(
            f"Successfully fulfilled order {order_id}. Published 'order.fulfilled' event."
        )

    async def get_order_by_id(self, db: AsyncSession, order_id: uuid.UUID) -> Optional[models.MarketplaceOrder]:
        """
        주문 ID로 특정 주문을 조회합니다.
        성능 최적화를 위해 주문에 포함된 모든 아이템과 각 아이템의 상품 정보를
        한 번의 쿼리로 함께 로드(Eager Loading)합니다.
        """
        query = (
            select(models.MarketplaceOrder)
            .options(
                selectinload(models.MarketplaceOrder.items)  # 주문에 속한 'items' 목록을 로드
                .joinedload(models.MarketplaceOrderItem.product) # 각 'item'에 연결된 'product' 정보를 로드
            )
            .filter(models.MarketplaceOrder.id == order_id)
        )
        
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_product_details(self, db: AsyncSession, product_id: uuid.UUID) -> models.MarketplaceProduct:
        """ID로 단일 상품의 기본 정보를 조회합니다."""
        product = await db.get(models.MarketplaceProduct, product_id)
        if not product or not product.is_active:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="상품을 찾을 수 없습니다.")
        return product

    async def get_shop_item_product_detail(self, db: AsyncSession, product: models.MarketplaceProduct) -> Dict[str, Any]:
        """상점 아이템에 특화된 상세 정보(display_properties)를 조합합니다."""
        item_detail = await db.get(models.ShopItemDetail, product.linked_resource_id)
        
        response_schema = schemas.ShopItemProductDetail(
            **product.__dict__,
            display_properties=item_detail.display_properties if item_detail else {}
        )
        return response_schema.model_dump()

    async def _get_latest_backtest_summary(
        self, db: AsyncSession, strategy_id: uuid.UUID
    ) -> Optional[schemas.BacktestResultSummaryForCard]:
        latest_backtest_subquery = (
            select(
                models.Backtest.id.label("backtest_id")
            )
            .filter(
                models.Backtest.strategy_id == strategy_id,
                models.Backtest.status == 'completed'
            )
            .order_by(models.Backtest.created_at.desc())
            .limit(1)
            .subquery('latest_backtest_id')
        )

        query = (
            select(
                latest_backtest_subquery.c.backtest_id,
                models.BacktestResult.total_return_pct,
                models.BacktestResult.win_rate_pct,
                models.BacktestResult.mdd_pct,
                models.BacktestResult.sharpe_ratio,
                models.BacktestResult.profit_factor,
                models.BacktestResult.sortino_ratio
            )
            .join(latest_backtest_subquery, models.BacktestResult.backtest_id == latest_backtest_subquery.c.backtest_id)
        )

        result = await db.execute(query)
        summary_data = result.first()

        if not summary_data:
            return None

        return schemas.BacktestResultSummaryForCard(
            backtest_id=summary_data.backtest_id,
            total_return_pct=summary_data.total_return_pct,
            win_rate_pct=summary_data.win_rate_pct,
            mdd_pct=summary_data.mdd_pct,
            sharpe_ratio=summary_data.sharpe_ratio,
            profit_factor=summary_data.profit_factor,
            sortino_ratio=summary_data.sortino_ratio
        )
    
    async def get_strategy_product_detail(
        self, 
        db: AsyncSession, 
        product: models.MarketplaceProduct, 
        current_user: Optional[models.User]
    ) -> Union[schemas.StrategyProductDetailOwned, schemas.StrategyProductDetailPublic]:
        """
        전략 상품의 상세 정보를 조회합니다.
        - 사용자가 전략을 소유한 경우, 모든 규칙을 포함한 상세 정보를 반환합니다.
        - 소유하지 않은 경우(비로그인 포함), 규칙을 제외한 공개 정보만 반환합니다.
        """
        # 1. 상품에 연결된 원본 전략 정보 조회 (판매자 정보 포함)
        strategy = await db.scalar(
            select(models.Strategy)
            .options(joinedload(models.Strategy.author))
            .filter(models.Strategy.id == product.linked_resource_id)
        )
        if not strategy:
            logger.error(f"Data integrity error: Product {product.id} links to non-existent Strategy {product.linked_resource_id}")
            raise HTTPException(status_code=404, detail="연결된 전략 정보를 찾을 수 없습니다.")

        # 2. 사용자의 소유권 확인
        is_owned = False
        if current_user:
            # check_strategy_purchase 함수를 호출하여 소유 여부를 확인합니다.
            is_owned = await self.check_strategy_purchase(db, current_user.id, strategy.id)

        # 3. 공개 정보인 대표 백테스트 결과 조회
        # (주의: trade_logs와 같이 민감할 수 있는 정보는 여기서 로드하지 않습니다.)
        representative_backtest_model = None
        if product.representative_backtest_id:
            representative_backtest_model = await db.scalar(
                select(models.Backtest)
                .options(
                    joinedload(models.Backtest.result),
                    joinedload(models.Backtest.strategy).selectinload(models.Strategy.backtests)
                )
                .filter(models.Backtest.id == product.representative_backtest_id)
            )
            
        # 4. Pydantic 모델에 전달할 데이터 소스들을 하나의 딕셔너리로 조합
        # Pydantic이 필요한 필드를 product, strategy, author 객체 등에서 자동으로 찾아 변환합니다.
        combined_data_for_validation = {
            **product.__dict__,
            **strategy.__dict__,
            'author': strategy.author, # 관계 필드는 명시적으로 전달
            'representative_backtest': representative_backtest_model
        }

        # 5. 소유권 여부에 따라 다른 스키마로 데이터를 검증하고 반환
        if is_owned:
            # 소유자일 경우: 모든 정보가 포함된 'Owned' 스키마로 반환
            return schemas.StrategyProductDetailOwned.model_validate(
                combined_data_for_validation, from_attributes=True
            )
        else:
            # 비구매자일 경우: 민감 정보가 제외된 'Public' 스키마로 반환
            return schemas.StrategyProductDetailPublic.model_validate(
                combined_data_for_validation, from_attributes=True
            )
    
    async def unlist_strategy_product(
        self, db: AsyncSession, product_id: uuid.UUID, current_user_id: uuid.UUID
    ):
        """
        상품 ID를 사용하여 마켓플레이스 상품을 비활성화(판매 중단)합니다.
        판매자 본인만 이 작업을 수행할 수 있도록 소유권을 검증합니다.
        """
        # 1. 전달받은 product_id로 상품을 조회합니다.
        product = await db.get(models.MarketplaceProduct, product_id)
        
        # 2. 상품이 없거나, 요청한 사용자가 판매자가 아니면 에러를 발생시킵니다. (보안 강화)
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="판매 중단할 상품을 찾을 수 없습니다.")
        
        if product.seller_id != current_user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="자신의 상품만 판매 중단할 수 있습니다.")

        # 3. 이미 비활성화된 경우, 불필요한 DB 작업을 방지합니다.
        if not product.is_active:
            logger.info(f"Product {product_id} is already inactive.")
            return

        # 4. is_active 플래그를 False로 변경하여 판매 중단 처리합니다.
        product.is_active = False
        await db.flush()
        logger.info(f"Product {product_id} has been successfully unlisted.")


    async def check_strategy_purchase(
        self, db: AsyncSession, user_id: uuid.UUID, strategy_id: uuid.UUID
    ) -> bool:
        """사용자가 특정 전략을 구매했는지 여부를 확인합니다."""
        query = select(models.UserPurchasedStrategy).filter_by(
            user_id=user_id, 
            strategy_id=strategy_id
        )
        result = await db.execute(select(query.exists()))
        return result.scalar_one()

# 서비스 인스턴스 생성
marketplace_service = MarketplaceService()
