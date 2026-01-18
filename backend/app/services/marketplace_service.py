# file: backend/app/services/marketplace_service.py
import uuid
from typing import Dict, Any, Optional, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from sqlalchemy import func, or_, desc, asc
from fastapi import HTTPException, status
import logging

from .. import models, schemas
from ..event_bus import publish_event 
from .credit_service import credit_service

logger = logging.getLogger(__name__)

# 플랫폼 수수료율 (C2C 거래에서 플랫폼이 가져가는 비율)
PLATFORM_COMMISSION_RATE = 0.10  # 10%

class MarketplaceService:
    """
    마켓플레이스의 상품 조회, 주문 생성, 자산 지급 등 핵심 비즈니스 로직을 처리하는 서비스
    """

    async def list_products(
        self, db: AsyncSession, filters: schemas.ProductFilters
    ) -> Dict[str, Any]:
        """필터와 페이지네이션을 적용하여 상품 목록을 조회합니다."""
        if filters.product_type == models.ProductType.STRATEGY:
            query = select(
                models.MarketplaceProduct, models.User.username, models.BacktestResult.total_return_pct,
                models.BacktestResult.mdd_pct, models.BacktestResult.win_rate_pct,
                models.BacktestResult.profit_factor, models.BacktestResult.sharpe_ratio,
                models.BacktestResult.sortino_ratio,
            ).join(models.User, models.MarketplaceProduct.seller_id == models.User.id)\
             .outerjoin(models.Backtest, models.MarketplaceProduct.representative_backtest_id == models.Backtest.id)\
             .outerjoin(models.BacktestResult, models.Backtest.id == models.BacktestResult.backtest_id)\
             .filter(models.MarketplaceProduct.is_active == True, models.MarketplaceProduct.product_type == models.ProductType.STRATEGY)
        elif filters.product_type == models.ProductType.AI_MODEL:
            # AI 모델 상품 조회
            query = select(
                models.MarketplaceProduct, models.User.username, models.AIModel.model_type,
                models.AIModel.training_start_date, models.AIModel.training_end_date,
                models.AIModel.validation_metrics
            ).join(models.User, models.MarketplaceProduct.seller_id == models.User.id)\
             .join(models.AIModel, models.MarketplaceProduct.linked_resource_id == models.AIModel.id)\
             .filter(models.MarketplaceProduct.is_active == True, models.MarketplaceProduct.product_type == models.ProductType.AI_MODEL)
        else:
            query = select(
                models.MarketplaceProduct, models.User.username, models.ShopItemDetail.display_properties
            ).join(models.User, models.MarketplaceProduct.seller_id == models.User.id)\
             .join(models.ShopItemDetail, models.MarketplaceProduct.linked_resource_id == models.ShopItemDetail.id)\
             .filter(models.MarketplaceProduct.is_active == True, models.MarketplaceProduct.product_type.in_([models.ProductType.SHOP_ITEM, models.ProductType.CREDIT_PACK]))

        if filters.search_term:
            query = query.filter(models.MarketplaceProduct.name.ilike(f"%{filters.search_term}%"))
        if filters.categories:
            query = query.filter(models.MarketplaceProduct.product_metadata['category'].astext.in_(filters.categories))
        
        count_query = select(func.count()).select_from(query.alias())
        total_items = await db.scalar(count_query) or 0
        
        # 정렬 로직 등 
        query = query.order_by(desc(models.MarketplaceProduct.created_at))\
                     .offset((filters.page - 1) * filters.limit).limit(filters.limit)
        
        db_results = await db.execute(query)
        products_response = []
        if filters.product_type == models.ProductType.STRATEGY:
            for product, username, total_return, mdd, win_rate, profit_factor, sharpe_ratio, sortino_ratio in db_results:
                summary = schemas.BacktestResultSummaryForCard(total_return_pct=total_return, mdd_pct=mdd, win_rate_pct=win_rate, profit_factor=profit_factor, sharpe_ratio=sharpe_ratio, sortino_ratio=sortino_ratio) if total_return is not None else None
                validated_product = schemas.StrategyProduct.model_validate({**product.__dict__, 'author': {'username': username}, 'latest_backtest_summary': summary}, from_attributes=True)
                products_response.append(validated_product)
        elif filters.product_type == models.ProductType.AI_MODEL:
            for product, username, model_type, training_start, training_end, validation_metrics in db_results:
                accuracy = validation_metrics.get('accuracy') if validation_metrics else None
                ai_model_data = {
                    **product.__dict__, 
                    'author': {'username': username},
                    'model_type': model_type,
                    'training_start_date': training_start.isoformat() if training_start else None,
                    'training_end_date': training_end.isoformat() if training_end else None,
                    'accuracy': accuracy,
                }
                validated_product = schemas.AIModelProduct.model_validate(ai_model_data, from_attributes=True)
                products_response.append(validated_product)
        else:
             for product, username, display_properties in db_results:
                validated_product = schemas.ShopItemProduct.model_validate({**product.__dict__, 'author': {'username': username}, 'display_properties': display_properties}, from_attributes=True)
                products_response.append(validated_product)
        
        return {"products": products_response, "meta": {"totalItems": total_items, "itemCount": len(products_response), "itemsPerPage": filters.limit, "totalPages": (total_items + filters.limit - 1) // filters.limit, "currentPage": filters.page}}

    # --- 크레딧 결제 전용 서비스 함수 ---
    async def process_credit_purchase(self, db: AsyncSession, payload: schemas.OrderCreate, buyer: models.User) -> models.MarketplaceOrder:
        """크레딧을 사용하여 주문을 즉시 생성, 결제, 이행하는 통합 함수"""
        if not payload.items:
            raise HTTPException(status_code=400, detail="주문할 상품이 없습니다.")

        # 1. 주문 상품 검증 및 총 가격(크레딧) 계산
        total_cost = 0.0
        product_ids = [item.product_id for item in payload.items]
        products_q = await db.execute(select(models.MarketplaceProduct).filter(models.MarketplaceProduct.id.in_(product_ids)))
        products_map = {p.id: p for p in products_q.scalars().all()}

        if len(products_map) != len(product_ids):
            raise HTTPException(status_code=404, detail="일부 상품을 찾을 수 없습니다.")

        is_c2c_order = any(p.product_type in [models.ProductType.STRATEGY, models.ProductType.AI_MODEL] for p in products_map.values())
        
        order_items_to_create = []
        for item_data in payload.items:
            product = products_map[item_data.product_id]
            if product.product_type == models.ProductType.CREDIT_PACK:
                 raise HTTPException(status_code=400, detail=f"'{product.name}' 상품은 현금으로만 구매할 수 있습니다.")
            total_cost += product.price * item_data.quantity
            order_items_to_create.append(
                models.MarketplaceOrderItem(product_id=product.id, quantity=item_data.quantity, price_at_purchase=product.price)
            )

        # 2. 거래 유형에 맞는 크레딧 차감 로직 호출 (무료 상품일 경우 스킵)
        from .credit_service import credit_service
        if total_cost > 0:
            if is_c2c_order:
                await credit_service.deduct_cash_credits_only(db, user_id=buyer.id, amount_to_deduct=int(total_cost), related_entity_type="MARKETPLACE_C2C_ORDER")
            else:
                await credit_service.deduct_credits(db, user_id=buyer.id, amount_to_deduct=int(total_cost), discount_pct=0.0, related_entity_type="MARKETPLACE_B2C_ORDER")

        # 3. 주문을 'COMPLETED' 상태로 즉시 생성
        paid_order = models.MarketplaceOrder(
            buyer_id=buyer.id, 
            total_amount=total_cost, 
            status=models.OrderStatus.PAID,
            items=order_items_to_create
        )
        db.add(paid_order)
        await db.flush()

        # 4. 주문 즉시 이행 (자산 지급)
        await self.fulfill_order(db, order_id=paid_order.id)
        
        return paid_order
    
    async def list_strategy_as_product(
        self, 
        db: AsyncSession, 
        strategy: models.Strategy, 
        listing_data: schemas.StrategyListPayload, 
        seller: models.User
    ) -> models.MarketplaceProduct:
        """
        사용자의 전략을 마켓플레이스 상품으로 등록하거나, 이미 등록된 경우 업데이트합니다.
        """
        # 1. 이 전략이 이미 마켓플레이스 상품으로 등록되었는지 확인합니다.
        existing_product = await db.scalar(
            select(models.MarketplaceProduct)
            .filter(models.MarketplaceProduct.linked_resource_id == strategy.id)
        )
        
        # 2. 프론트엔드로부터 받은 메타데이터를 조합합니다.
        metadata = {
            "category": listing_data.category, 
            "positionType": listing_data.position_type
        }

        # 3. 기존 상품이 있으면 정보 업데이트, 없으면 새로 생성합니다.
        if existing_product:
            # 기존 상품 정보 업데이트
            existing_product.price = listing_data.price
            existing_product.description = listing_data.description
            existing_product.product_metadata = metadata
            existing_product.representative_backtest_id = listing_data.representative_backtest_id
            existing_product.is_active = True # 비활성화 상태였다면 다시 활성화
            product = existing_product
            logger.info(f"Updating existing marketplace product for strategy {strategy.id}.")
        else:
            # 새 마켓플레이스 상품 생성
            product = models.MarketplaceProduct(
                name=strategy.name,
                description=listing_data.description or strategy.description,
                price=listing_data.price,
                product_type=models.ProductType.STRATEGY,
                inventory_type=models.InventoryType.UNLOCK,
                linked_resource_id=strategy.id,
                seller_id=seller.id,
                product_metadata=metadata,
                representative_backtest_id=listing_data.representative_backtest_id
            )
            db.add(product)
            logger.info(f"Creating new marketplace product for strategy {strategy.id}.")
        
        await db.flush()
        # 관계 필드를 채워서 반환해야 스키마 변환 시 오류가 발생하지 않습니다.
        product.seller = seller
        
        return product

    # --- 현금 결제 전용 서비스 함수 ---
    async def create_pending_order_for_cash(self, db: AsyncSession, payload: schemas.OrderCreate, buyer: models.User) -> models.MarketplaceOrder:
        """현금 결제를 위해 'PENDING' 상태의 주문을 생성합니다."""
        if not payload.items:
            raise HTTPException(status_code=400, detail="주문할 상품이 없습니다.")

        total_amount = 0.0
        product_ids = [item.product_id for item in payload.items]
        products_result = await db.execute(select(models.MarketplaceProduct).filter(models.MarketplaceProduct.id.in_(product_ids)))
        products_map = {p.id: p for p in products_result.scalars().all()}

        if len(products_map) != len(product_ids):
            raise HTTPException(status_code=404, detail="일부 상품을 찾을 수 없습니다.")

        order_items_to_create = []
        for item_data in payload.items:
            product = products_map[item_data.product_id]
            if product.product_type != models.ProductType.CREDIT_PACK:
                raise HTTPException(status_code=400, detail=f"'{product.name}' 상품은 크레딧으로 구매해야 합니다.")
            total_amount += product.price * item_data.quantity
            order_items_to_create.append(
                models.MarketplaceOrderItem(product_id=product.id, quantity=item_data.quantity, price_at_purchase=product.price)
            )

        pending_order = models.MarketplaceOrder(
            buyer_id=buyer.id, total_amount=total_amount, status=models.OrderStatus.PENDING, items=order_items_to_create
        )
        db.add(pending_order)
        await db.flush()
        
        # [핵심 수정] 반환하기 전에 필요한 관계를 Eager Loading하여 다시 조회합니다.
        # get_order_by_id 함수는 이미 Eager Loading 로직을 가지고 있으므로 재사용합니다.
        complete_pending_order = await self.get_order_by_id(db, pending_order.id)
        if not complete_pending_order:
            # 이 에러는 이론적으로 발생해서는 안 됩니다.
            raise HTTPException(status_code=500, detail="주문 생성 후 정보를 조회하는 데 실패했습니다.")

        return complete_pending_order # 완전한 정보를 가진 객체를 반환

    # --- gateway_transaction_id를 Optional로 변경 ---
    async def fulfill_order(
        self, db: AsyncSession, order_id: uuid.UUID, gateway_transaction_id: Optional[str] = None
    ):
        """Celery Task 또는 서비스에서 직접 호출되는 주문 이행 비즈니스 로직."""
        logger.info(f"Fulfilling order: {order_id}")

        order = await db.get(
            models.MarketplaceOrder, order_id,
            options=[
                selectinload(models.MarketplaceOrder.items).joinedload(models.MarketplaceOrderItem.product),
                selectinload(models.MarketplaceOrder.buyer) 
            ]
        )

        if not order or order.status not in [models.OrderStatus.PAID, models.OrderStatus.PENDING]:
            logger.warning(f"Order {order_id} cannot be fulfilled. Status: {order.status if order else 'Not Found'}.")
            return
        
        if not order.buyer:
             logger.error(f"Fulfilling order {order_id} failed: Buyer object not loaded or None.")
             return

        for item in order.items:
            product = item.product
            # 구매한 상품이 CREDIT_PACK일 경우, 크레딧을 지급하는 로직
            if product.product_type == models.ProductType.CREDIT_PACK:

                credit_amount = product.product_metadata.get("credit_amount") 

                if not credit_amount or credit_amount <= 0:
                    logger.critical(
                        f"CRITICAL: Order fulfillment failed for order {order.id}. "
                        f"Product {product.id} ({product.name}) is a CREDIT_PACK but has invalid 'credit_amount' in metadata."
                    )
                    # 데이터가 잘못된 경우, 명시적인 오류를 발생시켜 Celery 태스크를 실패 처리합니다.
                    raise ValueError(f"Product {product.id} metadata is missing or has an invalid 'credit_amount'")
                
                # 유효한 credit_amount가 있을 때만 크레딧 지급 로직 실행
                await credit_service.grant_credits(
                    db=db,
                    user_id=order.buyer_id,
                    amount=credit_amount * item.quantity,
                    source_type="PURCHASE",
                    source_id=str(order.id)
                )

            elif product.inventory_type == models.InventoryType.UNLOCK:
                if product.product_type == models.ProductType.AI_MODEL:
                    # AI 모델 구매 처리: UserPurchasedAIModel에 권한 추가
                    ai_ownership_exists = await db.scalar(
                        select(models.UserPurchasedAIModel).filter_by(user_id=order.buyer_id, ai_model_id=product.linked_resource_id)
                    )
                    if not ai_ownership_exists:
                        db.add(models.UserPurchasedAIModel(
                            user_id=order.buyer_id, 
                            ai_model_id=product.linked_resource_id, 
                            order_item_id=item.id
                        ))
                        logger.info(f"Granted AI model {product.linked_resource_id} access to user {order.buyer_id}")
                else:
                    # 전략 구매 처리
                    ownership_exists_query = select(models.UserPurchasedStrategy).filter_by(user_id=order.buyer_id, strategy_id=product.linked_resource_id)
                    ownership_exists = await db.scalar(select(ownership_exists_query.exists()))
                    if not ownership_exists:
                        db.add(models.UserPurchasedStrategy(user_id=order.buyer_id, strategy_id=product.linked_resource_id, order_item_id=item.id))
                
                # [C2C 판매자 정산] 전략 또는 AI 모델 구매 시 판매자에게 수익 지급
                if product.product_type in [models.ProductType.STRATEGY, models.ProductType.AI_MODEL]:
                    sale_amount = int(item.price_at_purchase * item.quantity)
                    
                    # 자기 자신의 상품을 구매한 경우는 정산 스킵 (테스트 케이스 등)
                    if sale_amount > 0 and product.seller_id != order.buyer_id:
                        commission = int(sale_amount * PLATFORM_COMMISSION_RATE)
                        seller_payout = sale_amount - commission
                        
                        if seller_payout > 0:
                            await credit_service.grant_credits(
                                db=db,
                                user_id=product.seller_id,
                                amount=seller_payout,
                                source_type="C2C_SALE_REVENUE",
                                source_id=str(order.id)
                            )
                            logger.info(
                                f"C2C Sale: Paid seller {product.seller_id} "
                                f"amount {seller_payout} CC (commission: {commission} CC, rate: {PLATFORM_COMMISSION_RATE*100}%)"
                            )
                            
            elif product.inventory_type == models.InventoryType.CONSUMABLE:
                existing_inventory_item = await db.scalar(select(models.UserInventory).filter_by(user_id=order.buyer_id, product_id=product.id))
                if existing_inventory_item:
                    existing_inventory_item.quantity += item.quantity
                else:
                    db.add(models.UserInventory(user_id=order.buyer_id, product_id=product.id, quantity=item.quantity))

        order.status = models.OrderStatus.COMPLETED 
        if gateway_transaction_id:
            order.gateway_transaction_id = gateway_transaction_id
        await db.flush()

        order_name = order.items[0].product.name if order.items else "상품"
        if len(order.items) > 1:
            order_name += f" 외 {len(order.items) - 1}건"

        publish_event("order.fulfilled", {
            "order_id": str(order_id), 
            "buyer_id": str(order.buyer_id),
            "buyer_email": order.buyer.email,
            "buyer_username": order.buyer.username,
            "order_name": order_name,
            "total_amount": order.total_amount
        })
        logger.info(f"Successfully fulfilled order {order_id}. Published 'order.fulfilled' event.")

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
    
    async def get_ai_model_product_detail(
        self, 
        db: AsyncSession, 
        product: models.MarketplaceProduct,
        current_user: Optional[models.User]
    ) -> schemas.AIModelProduct:
        """
        AI 모델 상품의 상세 정보를 조회합니다.
        """
        # 1. 연결된 AI 모델 정보 조회
        ai_model = await db.scalar(
            select(models.AIModel)
            .options(joinedload(models.AIModel.user))
            .filter(models.AIModel.id == product.linked_resource_id)
        )
        if not ai_model:
            logger.error(f"Data integrity error: Product {product.id} links to non-existent AIModel {product.linked_resource_id}")
            raise HTTPException(status_code=404, detail="연결된 AI 모델을 찾을 수 없습니다.")

        # 2. 정확도 추출
        accuracy = None
        if ai_model.validation_metrics:
            accuracy = ai_model.validation_metrics.get('accuracy')

        # 3. 응답 데이터 조합
        return schemas.AIModelProduct(
            id=product.id,
            name=product.name,
            price=product.price,
            product_type=product.product_type,
            inventory_type=product.inventory_type,
            product_metadata=product.product_metadata or {},
            author=schemas.ProductAuthor(username=ai_model.user.username if ai_model.user else None),
            model_type=ai_model.model_type,
            training_start_date=ai_model.training_start_date.isoformat() if ai_model.training_start_date else None,
            training_end_date=ai_model.training_end_date.isoformat() if ai_model.training_end_date else None,
            accuracy=accuracy
        )

    async def list_ai_model_as_product(
        self,
        db: AsyncSession,
        ai_model: models.AIModel,
        listing_data: schemas.AIModelListPayload,
        seller: models.User
    ) -> models.MarketplaceProduct:
        """
        사용자의 AI 모델을 마켓플레이스 상품으로 등록하거나 업데이트합니다.
        """
        # 1. 이 AI 모델이 이미 마켓플레이스 상품으로 등록되었는지 확인
        existing_product = await db.scalar(
            select(models.MarketplaceProduct)
            .filter(
                models.MarketplaceProduct.linked_resource_id == ai_model.id,
                models.MarketplaceProduct.product_type == models.ProductType.AI_MODEL
            )
        )
        
        # 2. 메타데이터 조합
        metadata = {
            "modelType": ai_model.model_type,
            "trainingSymbol": ai_model.training_symbol,
        }

        # 3. 기존 상품이 있으면 정보 업데이트, 없으면 새로 생성
        if existing_product:
            existing_product.price = listing_data.price
            existing_product.description = listing_data.description
            existing_product.product_metadata = metadata
            existing_product.is_active = True
            product = existing_product
            logger.info(f"Updating existing marketplace product for AI model {ai_model.id}.")
        else:
            product = models.MarketplaceProduct(
                name=ai_model.name,
                description=listing_data.description or ai_model.description,
                price=listing_data.price,
                product_type=models.ProductType.AI_MODEL,
                inventory_type=models.InventoryType.UNLOCK,
                linked_resource_id=ai_model.id,
                seller_id=seller.id,
                product_metadata=metadata,
            )
            db.add(product)
            logger.info(f"Creating new marketplace product for AI model {ai_model.id}.")
        
        await db.flush()
        product.seller = seller

        # Pydantic response_model (schemas.AIModelProduct) 매핑을 위한 속성 주입
        # MarketplaceProduct 모델에는 없는 필드들이지만, API 응답 스키마가 요구하므로 동적으로 할당합니다.
        product.model_type = ai_model.model_type
        product.training_start_date = ai_model.training_start_date.isoformat() if ai_model.training_start_date else None
        product.training_end_date = ai_model.training_end_date.isoformat() if ai_model.training_end_date else None
        
        product.accuracy = None
        if ai_model.validation_metrics:
             product.accuracy = ai_model.validation_metrics.get("accuracy")
        
        # BaseProduct 스키마의 author 필드 매핑
        product.author = seller
        
        return product

    async def check_ai_model_purchase(
        self, db: AsyncSession, user_id: uuid.UUID, ai_model_id: uuid.UUID
    ) -> bool:
        """사용자가 특정 AI 모델을 구매했는지 여부를 확인합니다."""
        query = select(models.UserPurchasedAIModel).filter_by(
            user_id=user_id, 
            ai_model_id=ai_model_id
        )
        result = await db.execute(select(query.exists()))
        return result.scalar_one()

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

    async def _get_or_create_admin_user(self, db: AsyncSession) -> models.User:
        """시스템 상품의 판매자가 될 관리자 계정을 조회하거나 생성합니다."""
        admin_email = "admin@cortex.com"
        admin_user = await db.scalar(select(models.User).filter_by(email=admin_email))
        
        if not admin_user:
            from ..security import get_password_hash
            logger.info(f"Admin user not found. Creating a new one: {admin_email}")
            admin_user = models.User(
                email=admin_email,
                username="cortex_admin",
                hashed_password=get_password_hash("test1234"),
                role="admin",
                is_active=True,
                is_email_verified=True
            )
            db.add(admin_user)
            await db.flush()
        return admin_user

    # 크레딧 팩 상품 시딩 함수 (클래스 메서드로 포함)
    async def seed_credit_packs(self, db: AsyncSession):
        """초기 '크레딧 팩' 상품을 데이터베이스에 생성합니다."""
        admin_user = await self._get_or_create_admin_user(db)

        credit_packs_to_seed = [
            {
                "item_type": "CREDIT_PACK_1000",
                "display_properties": {"icon": "coins", "tier": "bronze"},
                "product_info": {
                    "name": "1,000 크레딧 팩", "price": 990.0,
                    "product_metadata": {"credit_amount": 1000}
                }
            },
            {
                "item_type": "CREDIT_PACK_5500",
                "display_properties": {"icon": "gem", "tier": "silver"},
                "product_info": {
                    "name": "5,500 크레딧 팩 (10% 보너스)", "price": 5000.0,
                    "product_metadata": {"credit_amount": 5500}
                }
            },
            {
                "item_type": "CREDIT_PACK_12000",
                "display_properties": {"icon": "diamond", "tier": "gold"},
                "product_info": {
                    "name": "12,000 크레딧 팩 (20% 보너스)", "price": 9900.0,
                    "product_metadata": {"credit_amount": 12000}
                }
            },
            {
                "item_type": "CREDIT_PACK_12000",
                "display_properties": {"icon": "diamond", "tier": "gold"},
                "product_info": {
                    "name": "75,000 크레딧 팩 (25% 보너스)", "price": 59900.0,
                    "product_metadata": {"credit_amount": 75000}
                }
            },
        ]

        for pack_data in credit_packs_to_seed:
            shop_item = await db.scalar(
                select(models.ShopItemDetail).filter_by(item_type=pack_data["item_type"])
            )
            if not shop_item:
                shop_item = models.ShopItemDetail(
                    item_type=pack_data["item_type"],
                    display_properties=pack_data["display_properties"]
                )
                db.add(shop_item)
                await db.flush()
                logger.info(f"Seeded shop item detail for '{pack_data['item_type']}'.")

            existing_product = await db.scalar(
                select(models.MarketplaceProduct).filter_by(name=pack_data["product_info"]["name"])
            )

            if not existing_product:
                new_product = models.MarketplaceProduct(
                    linked_resource_id=shop_item.id,
                    seller_id=admin_user.id,
                    product_type=models.ProductType.CREDIT_PACK,
                    inventory_type=models.InventoryType.CONSUMABLE,
                    is_active=True,
                    **pack_data["product_info"]
                )
                db.add(new_product)
                logger.info(f"Seeded '{new_product.name}' product linked to ShopItemDetail {shop_item.id}.")


# 서비스 인스턴스 생성
marketplace_service = MarketplaceService()