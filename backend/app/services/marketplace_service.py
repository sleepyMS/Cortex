# file: backend/app/services/marketplace_service.py
import uuid
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import func, or_, desc, asc, cast, String
from fastapi import HTTPException, status
import logging

from .. import models, schemas

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
        
        # 전략(STRATEGY)과 아이템(SHOP_ITEM)에 따라 쿼리 구성이 달라집니다.
        if filters.product_type == models.ProductType.STRATEGY:
            # --- 전략 상품 조회 로직 ---
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
            
            query = select(models.MarketplaceProduct, models.User.username, latest_backtest_subquery.c.total_return_pct, latest_backtest_subquery.c.mdd_pct, latest_backtest_subquery.c.win_rate_pct)\
                .join(models.User, models.MarketplaceProduct.seller_id == models.User.id)\
                .outerjoin(latest_backtest_subquery, 
                    (models.MarketplaceProduct.linked_resource_id == latest_backtest_subquery.c.strategy_id) & (latest_backtest_subquery.c.row_num == 1))\
                .filter(models.MarketplaceProduct.is_active == True, models.MarketplaceProduct.product_type == models.ProductType.STRATEGY)

        else: # models.ProductType.SHOP_ITEM
            # --- 상점 아이템 조회 로직 ---
            query = select(models.MarketplaceProduct, models.User.username, models.ShopItemDetail.display_properties)\
                .join(models.User, models.MarketplaceProduct.seller_id == models.User.id)\
                .join(models.ShopItemDetail, models.MarketplaceProduct.linked_resource_id == models.ShopItemDetail.id)\
                .filter(models.MarketplaceProduct.is_active == True, models.MarketplaceProduct.product_type == models.ProductType.SHOP_ITEM)

        # 공통 필터 적용
        if filters.search_term:
            query = query.filter(models.MarketplaceProduct.name.ilike(f"%{filters.search_term}%"))
        if filters.categories:
            query = query.filter(models.MarketplaceProduct.metadata_['category'].astext.in_(filters.categories))

        # 총 아이템 개수 계산
        count_query = select(func.count()).select_from(query.alias())
        total_items = await db.scalar(count_query) or 0
        
        # 정렬 로직
        if filters.sortBy == "price_asc": query = query.order_by(asc(models.MarketplaceProduct.price))
        elif filters.sortBy == "price_desc": query = query.order_by(desc(models.MarketplaceProduct.price))
        elif filters.sortBy == "totalReturnPct_desc" and filters.product_type == models.ProductType.STRATEGY:
            query = query.order_by(desc(latest_backtest_subquery.c.total_return_pct).nullslast())
        else: query = query.order_by(desc(models.MarketplaceProduct.created_at))

        # 페이지네이션 적용
        query = query.offset((filters.page - 1) * filters.limit).limit(filters.limit)
        
        db_results = await db.execute(query)
        
        # Pydantic 스키마로 변환
        products_response = []
        if filters.product_type == models.ProductType.STRATEGY:
            for product, username, total_return, mdd, win_rate in db_results:
                product.author = schemas.ProductAuthor(username=username)
                product.latest_backtest_summary = schemas.BacktestResultSummaryForCard(
                    totalReturnPct=total_return, mddPct=mdd, winRatePct=win_rate
                )
                products_response.append(schemas.StrategyProduct.model_validate(product))
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
            existing_product.metadata_ = metadata
            existing_product.is_active = True
            product = existing_product
        else:
            product = models.MarketplaceProduct(
                name=strategy.name, description=listing_data.description or strategy.description,
                price=listing_data.price, product_type=models.ProductType.STRATEGY,
                inventory_type=models.InventoryType.UNLOCK, linked_resource_id=strategy.id,
                seller_id=seller.id, metadata_=metadata
            )
            db.add(product)
        await db.flush()
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
        
    async def fulfill_order(self, db: AsyncSession, order_id: uuid.UUID, gateway_transaction_id: str):
        """[수정] 순수한 비즈니스 로직. Celery Task에서 호출됨."""
        logger.info(f"Fulfilling order: {order_id}")
        order = await db.get(models.MarketplaceOrder, order_id, options=[selectinload(models.MarketplaceOrder.items).joinedload(models.MarketplaceOrderItem.product)])
        
        if not order or order.status != models.OrderStatus.PENDING:
            logger.warning(f"Order {order_id} not found or not in PENDING state.")
            return

        for item in order.items:
            product = item.product # 이미 로드된 상품 정보 사용
            if product.inventory_type == models.InventoryType.UNLOCK:
                ownership_exists = await db.scalar(select(models.UserPurchasedStrategy).filter_by(user_id=order.buyer_id, strategy_id=product.linked_resource_id))
                if not ownership_exists:
                    db.add(models.UserPurchasedStrategy(user_id=order.buyer_id, strategy_id=product.linked_resource_id, order_item_id=item.id))
                    logger.info(f"Granted UNLOCK asset (strategy: {product.linked_resource_id}) to user {order.buyer_id}")
            
            elif product.inventory_type == models.InventoryType.CONSUMABLE:
                for _ in range(item.quantity):
                    db.add(models.UserInventory(user_id=order.buyer_id, product_id=product.id, order_item_id=item.id))
                logger.info(f"Granted {item.quantity} CONSUMABLE asset(s) (product: {product.id}) to user {order.buyer_id}")

        order.status = models.OrderStatus.COMPLETED
        order.gateway_transaction_id = gateway_transaction_id
        await db.flush()

        await publish_event("order.fulfilled", {"order_id": str(order_id), "buyer_id": str(order.buyer_id)})
        logger.info(f"Successfully fulfilled order {order_id}. Published 'order.fulfilled' event.")

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
        """
        특정 전략 ID에 대한 가장 최근의 '완료된' 백테스트 요약 정보를 조회합니다.
        (StrategyService의 기능을 직접 호출하는 대신, 독립성을 위해 자체적으로 구현)
        """
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
        summary_data = result.first() # .first()는 튜플을 반환하거나 결과가 없으면 None을 반환

        if not summary_data:
            return None

        # Pydantic 스키마를 사용하여 명확한 객체로 변환
        return schemas.BacktestResultSummaryForCard(
            totalReturnPct=summary_data.total_return_pct,
            winRatePct=summary_data.win_rate_pct,
            mddPct=summary_data.mdd_pct,
            sharpeRatio=summary_data.sharpe_ratio,
            profitFactor=summary_data.profit_factor,
            sortinoRatio=summary_data.sortino_ratio
        )
    
    async def get_strategy_product_detail(self, db: AsyncSession, product: models.MarketplaceProduct) -> schemas.StrategyProductDetail:
        """
        전략 상품에 특화된 모든 상세 정보를 조합하여 반환합니다.
        """
        # 1. Product에 연결된 원본 Strategy 정보를 Eager Loading하여 조회합니다.
        strategy = await db.scalar(
            select(models.Strategy)
            .options(joinedload(models.Strategy.author)) # 작성자 정보 함께 로드
            .filter(models.Strategy.id == product.linked_resource_id)
        )
        if not strategy:
            logger.error(f"Data integrity error: MarketplaceProduct {product.id} links to non-existent Strategy {product.linked_resource_id}")
            raise HTTPException(status_code=404, detail="연결된 전략 정보를 찾을 수 없습니다.")

        # 2. 내부 헬퍼 함수를 호출하여 최신 성과 요약(KPI)을 가져옵니다.
        latest_summary_model = await self._get_latest_backtest_summary(db, strategy.id)
        
        # 3. 최신 성과를 만든 '대표 백테스트'의 전체 정보를 조회합니다.
        #    (프론트엔드에서 차트, 월별 성과 등을 그리기 위해 필요)
        representative_backtest_model = None
        if latest_summary_model and latest_summary_model.backtest_id:
            # Backtest와 그 하위 result, strategy 정보까지 함께 로드
            representative_backtest_model = await db.scalar(
                select(models.Backtest)
                .options(
                    joinedload(models.Backtest.result),
                    joinedload(models.Backtest.strategy)
                )
                .filter(models.Backtest.id == latest_summary_model.backtest_id)
            )

        # 4. Pydantic의 model_validate를 사용하여 모든 데이터를 최종 응답 스키마에 조합합니다.
        #    - 기본 product 객체의 속성을 복사
        #    - update 딕셔너리로 상세 정보를 덮어쓰거나 추가
        return schemas.StrategyProductDetail.model_validate(
            product,
            from_attributes=True,
            update={
                'author': strategy.author,
                'strategy_details': strategy,
                'latest_backtest_summary': latest_summary_model,
                'representative_backtest': representative_backtest_model,
            }
        )

# 서비스 인스턴스 생성
marketplace_service = MarketplaceService()
