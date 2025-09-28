# file: backend/app/services/credit_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from fastapi import HTTPException, status

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
            if ledger.source_type == "PURCHASE":
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
        
        # [개선] API 스키마에 맞춰 '유료 크레딧' 잔액을 별도로 계산하여 추가합니다.
        # 현재 정책상 'PURCHASE' 타입만 유료 크레딧입니다.
        cash_credit_balance = breakdown.purchased

        return schemas.CreditBalanceSummary(
            total_balance=total_balance,
            cash_credit_balance=cash_credit_balance, # 프론트엔드 전달용 필드
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
        source_id: uuid.UUID
    ):
        """[신규] 구독 결제 시 지급되는 보너스 크레딧을 '유료 크레딧'으로 생성합니다."""
        await self.grant_credits(
            db=db,
            user_id=user_id,
            amount=amount,
            source_type="PURCHASE", # '유료' 크레딧으로 처리하는 것이 핵심
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
            "EVENT_COUPON": 1, "ATTENDANCE_DAILY": 2, "ATTENDANCE_BONUS": 2,
            "PURCHASE": 3,
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
        """[신규 C2C용] 오직 '유료 크레딧'만 사용하여 차감하고 거래 내역을 기록합니다."""
        if amount_to_deduct <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="차감할 크레딧은 0보다 커야 합니다.")

        # 1. 'PURCHASE' 타입의 원장만 잠금(Lock)하여 조회합니다.
        query = select(models.CreditLedger).filter(
            models.CreditLedger.user_id == user_id,
            models.CreditLedger.remaining_amount > 0,
            models.CreditLedger.source_type == "PURCHASE" # 핵심 필터링 조건
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

credit_service = CreditService()