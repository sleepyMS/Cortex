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
        """사용자의 크레딧 잔액을 종류별로 상세하게 조회합니다."""
        now_utc = datetime.now(timezone.utc)
        
        # 만료되지 않은, 잔액이 남은 모든 원장을 조회합니다.
        query = select(models.CreditLedger).filter(
            models.CreditLedger.user_id == user_id,
            models.CreditLedger.remaining_amount > 0,
            (models.CreditLedger.expires_at == None) | (models.CreditLedger.expires_at > now_utc)
        )
        result = await db.execute(query)
        ledgers = result.scalars().all()

        # 조회된 원장을 종류별로 집계합니다.
        breakdown = schemas.CreditBalanceBreakdown()
        for ledger in ledgers:
            if ledger.source_type == "PURCHASE":
                breakdown.purchased += ledger.remaining_amount
            elif ledger.source_type == "SUBSCRIPTION_DAILY":
                breakdown.subscription_daily += ledger.remaining_amount
            elif ledger.source_type in ["ATTENDANCE_DAILY", "ATTENDANCE_BONUS"]:
                breakdown.expiring_weekly += ledger.remaining_amount
            elif ledger.source_type == "EVENT_COUPON":
                breakdown.event.append(schemas.CreditBalanceBreakdownEvent(
                    amount=ledger.remaining_amount,
                    expires_at=ledger.expires_at
                ))
        
        total_balance = (
            breakdown.purchased + 
            breakdown.subscription_daily + 
            breakdown.expiring_weekly + 
            sum(e.amount for e in breakdown.event)
        )

        return schemas.CreditBalanceSummary(total_balance=total_balance, breakdown=breakdown)

    async def grant_credits(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: int,
        source_type: str,
        source_id: Optional[uuid.UUID] = None,
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
        [핵심 로직] 정의된 우선순위에 따라 크레딧을 차감하고 거래 내역을 기록합니다.
        이 함수는 반드시 데이터베이스 트랜잭션 내에서 실행되어야 합니다.
        """
        if amount_to_deduct <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="차감할 크레딧은 0보다 커야 합니다.")
            
        now_utc = datetime.now(timezone.utc)

        # 1. [동시성 제어] 사용자의 모든 원장 행에 쓰기 잠금(Lock)을 설정합니다.
        # 이 트랜잭션이 끝날 때까지 다른 요청이 이 사용자의 크레딧을 변경할 수 없게 되어 Race Condition을 방지합니다.
        query = select(models.CreditLedger).filter(
            models.CreditLedger.user_id == user_id,
            models.CreditLedger.remaining_amount > 0,
            (models.CreditLedger.expires_at == None) | (models.CreditLedger.expires_at > now_utc)
        ).with_for_update()
        
        result = await db.execute(query)
        available_ledgers = result.scalars().all()

        # 2. 잔액 확인
        total_balance = sum(ledger.remaining_amount for ledger in available_ledgers)
        if total_balance < amount_to_deduct:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="크레딧 잔액이 부족합니다.")

        # 3. 소진 우선순위에 따라 원장 정렬
        priority_order = {
            "EVENT_COUPON": 1,
            "ATTENDANCE_DAILY": 2, "ATTENDANCE_BONUS": 2,
            "SUBSCRIPTION_DAILY": 3,
            "PURCHASE": 4,
        }
        
        def sort_key(ledger: models.CreditLedger):
            priority = priority_order.get(ledger.source_type, 99)
            # 1순위(이벤트)는 만료일이 빠른 순, 나머지는 생성일이 빠른 순으로 정렬
            sort_date = ledger.expires_at if priority == 1 else ledger.created_at
            return (priority, sort_date)

        available_ledgers.sort(key=sort_key)

        # 4. 순차적으로 크레딧 차감
        remaining_deduction = amount_to_deduct
        transaction_details_to_create: List[dict] = []

        for ledger in available_ledgers:
            if remaining_deduction == 0:
                break
            
            deduct_from_this_ledger = min(ledger.remaining_amount, remaining_deduction)
            ledger.remaining_amount -= deduct_from_this_ledger
            remaining_deduction -= deduct_from_this_ledger
            
            transaction_details_to_create.append({
                "ledger_id": ledger.id,
                "amount_deducted": deduct_from_this_ledger,
                # 스키마에 추가하면 좋은 정보
                "source_type": ledger.source_type 
            })

        # 5. 거래 기록 생성
        new_transaction = models.CreditTransaction(
            user_id=user_id,
            total_amount_deducted=amount_to_deduct,
            discount_pct=discount_pct,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )
        db.add(new_transaction)
        
        # 6. 상세 거래 내역 생성
        for detail in transaction_details_to_create:
            new_detail = models.CreditTransactionDetail(
                transaction=new_transaction, # 관계를 통해 자동 연결
                ledger_id=detail["ledger_id"],
                amount_deducted=detail["amount_deducted"]
            )
            db.add(new_detail)
            
        await db.flush()
        return new_transaction

credit_service = CreditService()