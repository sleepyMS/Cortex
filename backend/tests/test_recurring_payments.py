import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta, timezone
import uuid
import sys
import os

# Ensure backend root is in sys.path
sys.path.append(os.getcwd())

# Need to make sure app is importable. 
# If running from backend root, 'app' should be available.
from app.services.subscription_service import SubscriptionService
from app.models import Subscription, User, Plan, PlanType
from app.gateways.toss_payments_client import TossPaymentsClient

class TestRecurringPayments(unittest.IsolatedAsyncioTestCase):
    async def test_process_recurring_payments_success(self):
        # Setup
        service = SubscriptionService()
        mock_db = AsyncMock()
        mock_toss_client = AsyncMock(spec=TossPaymentsClient)
        
        # Mock Data
        user = User(id=uuid.uuid4(), email="test@example.com")
        plan = Plan(name=PlanType.PRO, price=10000, monthly_credit_reward=100)
        subscription = Subscription(
            id=uuid.uuid4(),
            user=user,
            plan=plan,
            status="active",
            current_period_end=datetime.now(timezone.utc) - timedelta(hours=1),
            payment_gateway_customer_key="billing-key-123"
        )
        
        # Mock DB execute result
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [subscription]
        mock_db.execute.return_value = mock_result
        
        # Mock Payment Service
        with patch("app.services.subscription_service.payment_service") as mock_payment_service:
            mock_payment_service.charge_subscription_renewal = AsyncMock(return_value={"paymentKey": "new-payment-key"})
            
            # Mock Credit Service
            with patch("app.services.subscription_service.credit_service") as mock_credit_service:
                mock_credit_service.grant_subscription_bonus_credits = AsyncMock()
                
                # Execute
                results = await service.process_recurring_payments(mock_db, mock_toss_client)
                
                # Verify
                self.assertEqual(results["success"], 1)
                self.assertEqual(results["failed"], 0)
                self.assertEqual(subscription.payment_gateway_sub_id, "new-payment-key")
                # Check if current_period_end extended (approx check)
                self.assertTrue(subscription.current_period_end > datetime.now(timezone.utc))
                
                mock_payment_service.charge_subscription_renewal.assert_called_once()
                mock_credit_service.grant_subscription_bonus_credits.assert_called_once()

    async def test_process_recurring_payments_failure(self):
        # Setup
        service = SubscriptionService()
        mock_db = AsyncMock()
        mock_toss_client = AsyncMock(spec=TossPaymentsClient)
        
        # Mock Data
        user = User(id=uuid.uuid4(), email="test@example.com")
        plan = Plan(name=PlanType.PRO, price=10000)
        subscription = Subscription(
            id=uuid.uuid4(),
            user=user,
            plan=plan,
            status="active",
            current_period_end=datetime.now(timezone.utc) - timedelta(hours=1),
            payment_gateway_customer_key="billing-key-123"
        )
        
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [subscription]
        mock_db.execute.return_value = mock_result
        
        with patch("app.services.subscription_service.payment_service") as mock_payment_service:
            # Simulate payment failure
            mock_payment_service.charge_subscription_renewal.side_effect = Exception("Payment Failed")
            
            results = await service.process_recurring_payments(mock_db, mock_toss_client)
            
            self.assertEqual(results["success"], 0)
            self.assertEqual(results["failed"], 1)

if __name__ == "__main__":
    unittest.main()
