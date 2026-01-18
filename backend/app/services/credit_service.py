# file: backend/app/services/credit_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, desc, literal, DateTime
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid
from fastapi import HTTPException, status
from sqlalchemy import union_all

from .. import models, schemas

class CreditService:
    """
    크레딧 원장(Ledger) 관리, 증감, 조회, 환불 등
    모든 크레딧 관련 핵심 비즈니스 로직을 담당하는 서비스.
    """
    async def get_balance_summary(self, db: AsyncSession, user_id: uuid.UUID) -> schemas.CreditBalanceSummary:
        """[개선] 사용자의 크레딧 잔액을 종류별 및 유료/무료로 상세하게 조회합니다."""
        now_utc = datetime.now(timezone.utc)
        
        query = select(models.CreditLedger).filter(
            models.CreditLedger.user_id == user_id,
            models.CreditLedger.remaining_amount > 0,
            (models.CreditLedger.expires_at == None) | (models.CreditLedger.expires_at > now_utc)
        )
        result = await db.execute(query)
        ledgers = result.scalars().all()

        breakdown = schemas.CreditBalanceBreakdown()
        for ledger in ledgers:
            if ledger.source_type in ["PURCHASE", "SUBSCRIPTION_BONUS", "C2C_SALE_REVENUE"]:
                breakdown.purchased += ledger.remaining_amount
            elif ledger.source_type in ["ATTENDANCE_DAILY", "ATTENDANCE_BONUS"]:
                breakdown.expiring_weekly += ledger.remaining_amount
            elif ledger.source_type == "EVENT_COUPON":
                breakdown.event.append(schemas.CreditBalanceBreakdownEvent(
                    amount=ledger.remaining_amount,
                    expires_at=ledger.expires_at
                ))
        
        total_balance = (
            breakdown.purchased + 
            breakdown.expiring_weekly + 
            sum(e.amount for e in breakdown.event)
        )
        
        # API 스키마에 맞춰 '유료 크레딧' 잔액을 별도로 계산하여 추가합니다.
        cash_credit_balance = breakdown.purchased

        return schemas.CreditBalanceSummary(
            total_balance=total_balance,
            cash_credit_balance=cash_credit_balance, 
            breakdown=breakdown
        )

    async def grant_credits(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
        source_type: str,
        source_id: Optional[str] = None,
        expires_at: Optional[datetime] = None,
    ):
        """새로운 크레딧 원장을 생성하여 사용자에게 크레딧을 지급합니다."""
        if amount <= 0:
            return

        new_ledger_entry = models.CreditLedger(
            user_id=user_id,
            source_type=source_type,
            source_id=source_id,
            initial_amount=amount,
            remaining_amount=amount,
            expires_at=expires_at
        )
        db.add(new_ledger_entry)
        await db.flush()

    async def grant_subscription_bonus_credits(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
        source_id: str
    ):
        """구독 결제 시 지급되는 보너스 크레딧을 '유료 크레딧'으로 생성합니다."""
        await self.grant_credits(
            db=db,
            user_id=user_id,
            amount=amount,
            source_type="SUBSCRIPTION_BONUS", # '유료' 크레딧으로 처리하는 것이 핵심
            source_id=source_id,   # 관련 결제 ID 등
            expires_at=None        # 유료 크레딧은 만료되지 않음
        )

    async def deduct_credits(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        amount_to_deduct: int,
        discount_pct: float,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[uuid.UUID] = None
    ) -> models.CreditTransaction:
        """
        [B2C용] 정의된 우선순위(무료 먼저)에 따라 크레딧을 차감하고 거래 내역을 기록합니다.
        주로 플랫폼 아이템 구매 시 사용됩니다.
        """
        if amount_to_deduct <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="차감할 크레딧은 0보다 커야 합니다.")
            
        now_utc = datetime.now(timezone.utc)
        query = select(models.CreditLedger).filter(
            models.CreditLedger.user_id == user_id,
            models.CreditLedger.remaining_amount > 0,
            (models.CreditLedger.expires_at == None) | (models.CreditLedger.expires_at > now_utc)
        ).with_for_update()
        
        result = await db.execute(query)
        available_ledgers = result.scalars().all()

        total_balance = sum(ledger.remaining_amount for ledger in available_ledgers)
        if total_balance < amount_to_deduct:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="크레딧 잔액이 부족합니다.")

        priority_order = {
            "EVENT_COUPON": 1, 
            "ATTENDANCE_DAILY": 2, 
            "ATTENDANCE_BONUS": 2,
            "PURCHASE": 3,
            "SUBSCRIPTION_BONUS": 3,
        }
        
        def sort_key(ledger: models.CreditLedger):
            priority = priority_order.get(ledger.source_type, 99)
            sort_date = ledger.expires_at if priority == 1 and ledger.expires_at else ledger.created_at
            return (priority, sort_date)

        available_ledgers.sort(key=sort_key)

        remaining_deduction = amount_to_deduct
        transaction_details_to_create: List[dict] = []
        for ledger in available_ledgers:
            if remaining_deduction <= 0: break
            deduct_from_this_ledger = min(ledger.remaining_amount, remaining_deduction)
            ledger.remaining_amount -= deduct_from_this_ledger
            remaining_deduction -= deduct_from_this_ledger
            transaction_details_to_create.append({"ledger_id": ledger.id, "amount_deducted": deduct_from_this_ledger})

        new_transaction = models.CreditTransaction(
            user_id=user_id, total_amount_deducted=amount_to_deduct, discount_pct=discount_pct,
            related_entity_type=related_entity_type, related_entity_id=related_entity_id,
        )
        db.add(new_transaction)
        
        for detail in transaction_details_to_create:
            db.add(models.CreditTransactionDetail(transaction=new_transaction, **detail))
            
        await db.flush()
        return new_transaction

    async def deduct_cash_credits_only(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        amount_to_deduct: int,
        related_entity_type: Optional[str] = None,
        related_entity_id: Optional[uuid.UUID] = None
    ) -> models.CreditTransaction:
        """[C2C용] 오직 '유료 크레딧'만 사용하여 차감하고 거래 내역을 기록합니다."""
        if amount_to_deduct <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="차감할 크레딧은 0보다 커야 합니다.")

        # 1. '유료 크레딧' 타입의 원장만 잠금(Lock)하여 조회합니다.
        # PURCHASE, SUBSCRIPTION_BONUS, C2C_SALE_REVENUE 모두 유료 크레딧으로 취급
        paid_credit_types = ["PURCHASE", "SUBSCRIPTION_BONUS", "C2C_SALE_REVENUE"]
        query = select(models.CreditLedger).filter(
            models.CreditLedger.user_id == user_id,
            models.CreditLedger.remaining_amount > 0,
            models.CreditLedger.source_type.in_(paid_credit_types)  # 유료 크레딧 타입들
        ).order_by(models.CreditLedger.created_at.asc()).with_for_update() # FIFO

        result = await db.execute(query)
        cash_ledgers = result.scalars().all()

        # 2. 유료 크레딧 잔액 확인
        total_cash_balance = sum(ledger.remaining_amount for ledger in cash_ledgers)
        if total_cash_balance < amount_to_deduct:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="유료 크레딧 잔액이 부족합니다.")

        # 3. 순차적으로 유료 크레딧 차감 (FIFO)
        remaining_deduction = amount_to_deduct
        transaction_details_to_create: List[dict] = []
        for ledger in cash_ledgers:
            if remaining_deduction <= 0: break
            deduct_from_this_ledger = min(ledger.remaining_amount, remaining_deduction)
            ledger.remaining_amount -= deduct_from_this_ledger
            remaining_deduction -= deduct_from_this_ledger
            transaction_details_to_create.append({"ledger_id": ledger.id, "amount_deducted": deduct_from_this_ledger})
        
        # 4. 거래 및 상세 내역 생성
        new_transaction = models.CreditTransaction(
            user_id=user_id, total_amount_deducted=amount_to_deduct, discount_pct=0.0,
            related_entity_type=related_entity_type, related_entity_id=related_entity_id,
        )
        db.add(new_transaction)
        
        for detail in transaction_details_to_create:
            db.add(models.CreditTransactionDetail(transaction=new_transaction, **detail))
        
        await db.flush()
        return new_transaction

    async def list_transactions_paginated(
        self, db: AsyncSession, user_id: uuid.UUID, page: int, limit: int
    ) -> dict:
        """사용자의 크레딧 거래 내역을 페이지네이션하여 반환합니다."""
        offset = (page - 1) * limit

        # 1. 전체 거래 내역 개수 조회 (변경 없음)
        count_query = select(func.count(models.CreditTransaction.id)).filter(
            models.CreditTransaction.user_id == user_id
        )
        total_items = await db.scalar(count_query) or 0

        # 2. 상세 내역(details)과 그에 연결된 원장(ledger) 정보까지 Eager Loading합니다.
        query = (
            select(models.CreditTransaction)
            .options(
                selectinload(models.CreditTransaction.details)
                .joinedload(models.CreditTransactionDetail.ledger)
            )
            .filter(models.CreditTransaction.user_id == user_id)
            .order_by(desc(models.CreditTransaction.created_at))
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        transactions_models = result.scalars().unique().all()

        # 3. [추가] 수동 매핑: SQLAlchemy 모델을 Pydantic 스키마로 직접 변환합니다.
        response_items = []
        for trans_model in transactions_models:
            detail_schemas = []
            for detail_model in trans_model.details:
                if detail_model.ledger: # ledger 정보가 로드되었는지 확인
                    detail_schemas.append(schemas.CreditTransactionLedgerDetail(
                        # detail.ledger.source_type에서 값을 가져와 스키마에 채워줍니다.
                        source_type=detail_model.ledger.source_type,
                        amount_deducted=detail_model.amount_deducted
                    ))
            
            response_items.append(schemas.CreditTransactionResponse(
                id=trans_model.id,
                total_amount_deducted=trans_model.total_amount_deducted,
                discount_pct=trans_model.discount_pct,
                related_entity_type=trans_model.related_entity_type,
                created_at=trans_model.created_at,
                details=detail_schemas
            ))

        return {
            "items": response_items, # 이제 Pydantic 객체 리스트를 반환
            "meta": {
                "totalItems": total_items,
                "itemCount": len(response_items),
                "itemsPerPage": limit,
                "totalPages": (total_items + limit - 1) // limit,
                "currentPage": page,
            },
        }
    
    async def get_unified_history_paginated(self, db: AsyncSession, user_id: uuid.UUID, page: int, limit: int) -> dict:
        """
        [완성본] 사용자의 모든 크레딧 획득/사용 기록을 DB 레벨에서 통합하고
        페이지네이션하여 효율적으로 반환합니다.
        """
        offset = (page - 1) * limit

        # 1. 획득 내역(Ledger)을 조회하는 쿼리 정의
        gains_query = select(
            models.CreditLedger.created_at.label("date"),
            models.CreditLedger.source_type.label("description"),
            models.CreditLedger.initial_amount.label("amount"),
            models.CreditLedger.id.label("related_id"),
            models.CreditLedger.expires_at.label("expires_at") 
        ).filter_by(user_id=user_id)

        # 2. 사용 내역(Transaction)을 조회하는 쿼리 정의
        usages_query = select(
            models.CreditTransaction.created_at.label("date"),
            models.CreditTransaction.related_entity_type.label("description"),
            (models.CreditTransaction.total_amount_deducted * -1).label("amount"), # 음수로 변환
            models.CreditTransaction.id.label("related_id"),
            literal(None, type_=DateTime).label("expires_at") 
        ).filter_by(user_id=user_id)

        # 3. [핵심] UNION ALL을 사용하여 두 쿼리를 DB에서 하나로 합칩니다.
        unified_query = union_all(gains_query, usages_query).alias("unified")

        # 4. 전체 개수 계산
        count_query = select(func.count()).select_from(unified_query)
        total_items = await db.scalar(count_query) or 0

        # 5. 합쳐진 결과에 대해 정렬 및 페이지네이션을 적용합니다.
        final_query = (
            select(unified_query)
            .order_by(desc(unified_query.c.date))
            .offset(offset)
            .limit(limit)
        )
        
        result = await db.execute(final_query)
        history_items = result.mappings().all() # 결과를 딕셔너리 리스트로 받음

        return {
            "items": history_items,
            "meta": {
                "totalItems": total_items,
                "itemCount": len(history_items),
                "itemsPerPage": limit,
                "totalPages": (total_items + limit - 1) // limit if limit > 0 else 0,
                "currentPage": page,
            },
        }
    
    async def get_transaction_by_id(self, db: AsyncSession, transaction_id: uuid.UUID) -> dict:
        """ID로 특정 거래를 조회하고, Pydantic 스키마와 호환되는 딕셔너리로 반환합니다."""
        query = (
            select(models.CreditTransaction)
            .options(
                selectinload(models.CreditTransaction.details)
                .joinedload(models.CreditTransactionDetail.ledger)
            )
            .filter(models.CreditTransaction.id == transaction_id)
        )
        trans_model = await db.scalar(query)
        if not trans_model:
            return None

        # list_transactions_paginated에서 사용했던 수동 매핑 로직 재사용
        detail_schemas = []
        for detail_model in trans_model.details:
            if detail_model.ledger:
                detail_schemas.append(schemas.CreditTransactionLedgerDetail(
                    source_type=detail_model.ledger.source_type,
                    amount_deducted=detail_model.amount_deducted
                ))
        
        # Pydantic 모델을 사용하여 응답 구조를 만듭니다.
        response_schema = schemas.CreditTransactionResponse(
            id=trans_model.id,
            user_id=trans_model.user_id, 
            total_amount_deducted=trans_model.total_amount_deducted,
            discount_pct=trans_model.discount_pct,
            related_entity_type=trans_model.related_entity_type,
            created_at=trans_model.created_at,
            details=detail_schemas
        )
        return response_schema.model_dump()
    
credit_service = CreditService()