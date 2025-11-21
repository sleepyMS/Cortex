import unittest
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure backend root is in sys.path
sys.path.append(os.getcwd())

from app.services.subscription_service import SubscriptionService
from app.models import Subscription, User, Plan, PlanType
from fastapi import HTTPException

class TestPlanSwitching(unittest.IsolatedAsyncioTestCase):
    async def test_upgrade_subscription_plan_prorated(self):
        """
        Test upgrading from Basic (0) to Pro (10000) with proration.
        """
        service = SubscriptionService()
        mock_db = AsyncMock()
        mock_toss_client = AsyncMock()
        
        user = User(id=uuid.uuid4(), email="test@example.com")
        old_plan = Plan(id=uuid.uuid4(), name=PlanType.BASIC, price=0)
        new_plan = Plan(id=uuid.uuid4(), name=PlanType.PRO, price=30000) # 30,000 KRW / 30 days = 1,000 KRW/day
        
        # Subscription ends in 15 days
        now = datetime.now(timezone.utc)
        current_period_end = now + timedelta(days=15)
        
        subscription = Subscription(
            id=uuid.uuid4(),
            user=user,
            plan=old_plan,
            plan_id=old_plan.id,
            status="active",
            current_period_end=current_period_end,
            payment_gateway_customer_key="billing-key-123"
        )
        
        mock_db.scalar.return_value = subscription
        
        # Mock plan_service
        with patch("app.services.subscription_service.plan_service") as mock_plan_service:
            mock_plan_service.get_plan_by_id = AsyncMock(return_value=new_plan)
            
            # Mock payment_service
            with patch("app.services.subscription_service.payment_service") as mock_payment_service:
                mock_payment_service.charge_subscription_renewal = AsyncMock(return_value={"paymentKey": "new-payment-key"})
                
                # Execute
                # Old rate: 0
                # New rate: 1000
                # Diff: 1000
                # Remaining days: 15 (approx)
                # Expected charge: ~15000
                
                result = await service.change_subscription_plan(mock_db, user, new_plan.id, mock_toss_client)
                
                # Verify
                self.assertEqual(subscription.plan_id, new_plan.id)
                self.assertEqual(subscription.plan, new_plan)
                self.assertIsNone(subscription.next_plan_id)
                
                # Verify payment called
                mock_payment_service.charge_subscription_renewal.assert_called_once()
                call_args = mock_payment_service.charge_subscription_renewal.call_args[1]
                self.assertGreater(call_args['amount'], 0)
                print(f"Prorated amount charged: {call_args['amount']}")

    async def test_downgrade_subscription_plan_scheduled(self):
        """
        Test downgrading from Pro (30000) to Basic (0) - Scheduled.
        """
        service = SubscriptionService()
        mock_db = AsyncMock()
        mock_toss_client = AsyncMock()
        
        user = User(id=uuid.uuid4(), email="test@example.com")
        old_plan = Plan(id=uuid.uuid4(), name=PlanType.PRO, price=30000)
        new_plan = Plan(id=uuid.uuid4(), name=PlanType.BASIC, price=0)
        
        subscription = Subscription(
            id=uuid.uuid4(),
            user=user,
            plan=old_plan,
            plan_id=old_plan.id,
            status="active",
            current_period_end=datetime.now(timezone.utc) + timedelta(days=15),
            payment_gateway_customer_key="billing-key-123"
        )
        
        mock_db.scalar.return_value = subscription
        
        with patch("app.services.subscription_service.plan_service") as mock_plan_service:
            mock_plan_service.get_plan_by_id = AsyncMock(return_value=new_plan)
            
            with patch("app.services.subscription_service.payment_service") as mock_payment_service:
                # Execute
                result = await service.change_subscription_plan(mock_db, user, new_plan.id, mock_toss_client)
                
                # Verify
                self.assertEqual(subscription.plan_id, old_plan.id) # Should NOT change yet
                self.assertEqual(subscription.next_plan_id, new_plan.id) # Should be scheduled
                
                # Verify payment NOT called
                mock_payment_service.charge_subscription_renewal.assert_not_called()

    async def test_change_subscription_plan_no_billing_key(self):
        service = SubscriptionService()
        mock_db = AsyncMock()
        mock_toss_client = AsyncMock()
        
        user = User(id=uuid.uuid4(), email="test@example.com")
        old_plan = Plan(id=uuid.uuid4(), name=PlanType.BASIC)
        new_plan = Plan(id=uuid.uuid4(), name=PlanType.PRO)
        
        subscription = Subscription(
            id=uuid.uuid4(),
            user=user,
            plan=old_plan,
            plan_id=old_plan.id,
            status="active",
            payment_gateway_customer_key=None # No billing key
        )
        
        mock_db.scalar.return_value = subscription
        
        with self.assertRaises(HTTPException) as cm:
            await service.change_subscription_plan(mock_db, user, new_plan.id, mock_toss_client)
        
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("결제 수단이 없습니다", cm.exception.detail)

if __name__ == "__main__":
    unittest.main()
