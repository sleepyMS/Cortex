import sys
import os
import asyncio
from unittest.mock import MagicMock, AsyncMock
import pandas as pd
from datetime import datetime
import uuid

# Add backend to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.live_bot_service import LiveBotService
from app.models import LiveBot
from app import schemas

async def run_test():
    print("Starting Paper Trading Manual Test...")
    
    # Mocks
    mock_market_data_service = AsyncMock()
    mock_signal_service = MagicMock()
    
    # Mock Data
    ohlcv_data = {
        'time': [datetime.now()],
        'open': [100.0], 'high': [110.0], 'low': [90.0], 'close': [105.0], 'volume': [1000.0]
    }
    df = pd.DataFrame(ohlcv_data)
    df.set_index('time', inplace=True)
    
    mock_market_data_service.get_latest_data.return_value = df
    
    # Signal: Long Entry
    signals_data = ohlcv_data.copy()
    signals_data['signal'] = ['long_entry']
    signals_df = pd.DataFrame(signals_data)
    signals_df.set_index('time', inplace=True)
    
    mock_signal_service.generate_signals_from_dataframe.return_value = signals_df
    
    # Service Instance with mocks
    service = LiveBotService()
    service.market_data_service = mock_market_data_service
    service.signal_service = mock_signal_service
    
    # Mock DB Session
    mock_db = AsyncMock()
    
    # Mock Strategy Data (Valid Pydantic Object)
    strategy_id = uuid.uuid4()
    author_id = uuid.uuid4()
    
    strategy_data = {
        "id": strategy_id,
        "author_id": author_id,
        "name": "Test Strategy",
        "is_public": False,
        "created_at": datetime.now(),
        "target_coins": [{"ticker": "BTCUSDT", "allocation_pct": 100.0}],
        "long_entry_rules": {"logic_operator": "OR", "blocks": []},
        "long_exit_rules": None,
        "short_entry_rules": None,
        "short_exit_rules": None,
        "tpsl_logic": None,
        "paid_feature_level": "basic"
    }
    
    # Create a dummy object that behaves like the SQLAlchemy model
    class DummyStrategy:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def to_dict(self):
            return self.__dict__

    strategy_model_obj = DummyStrategy(**strategy_data)

    # Mock Bot
    bot = LiveBot(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        strategy_id=strategy_id,
        api_key_id=uuid.uuid4(),
        status="active",
        mode="paper",
        initial_capital=10000.0,
        current_balance=10000.0,
        position_size=0.0,
        execution_interval="1h",
        strategy=strategy_model_obj # Assign the dummy object
    )
    
    # We don't need to monkeypatch model_validate if we provide a valid object that can be validated
    # But LiveBotService calls schemas.Strategy.model_validate(bot.strategy)
    # schemas.Strategy.model_validate works with objects that have attributes matching the schema.
    
    print("Executing bot cycle...")
    try:
        await service.execute_bot_cycle(mock_db, bot)
        print("Execution successful!")
        
        # Verify updates
        print(f"Bot Balance: {bot.current_balance}")
        print(f"Bot Position: {bot.position_size}")
        
        # Since we had a long_entry signal and 0 position, it should have bought.
        # Logic: 
        # 1. PaperTradingEngine initialized with balance 10000.
        # 2. process_single_step sees 'long_entry'.
        # 3. Executes buy.
        # 4. Returns updated state.
        # 5. Service updates bot.
        
        if bot.position_size > 0:
            print("PASS: Bot entered long position as expected.")
        else:
            print("FAIL: Bot did not enter position.")
            
    except Exception as e:
        print(f"Execution failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
