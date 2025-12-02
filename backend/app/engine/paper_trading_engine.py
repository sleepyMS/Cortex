import pandas as pd
import logging
from typing import Dict, Any, Optional
from .. import schemas, models
from .backtesting_engine import BacktestingEngine

logger = logging.getLogger(__name__)

class PaperTradingEngine(BacktestingEngine):
    """
    BacktestingEngine을 상속받아 Paper Trading(모의 투자)을 수행하는 엔진.
    DB에 저장된 LiveBot 상태를 불러와서 초기화하고,
    새로운 캔들 데이터에 대해 1스텝 시뮬레이션을 수행한 후 업데이트된 상태를 반환합니다.
    """

    def __init__(self, 
                 live_bot: models.LiveBot, 
                 ohlcv_df: pd.DataFrame, 
                 signals_df: pd.DataFrame, 
                 strategy_params: schemas.StrategyCreate):
        
        # LiveBot에는 실행 파라미터(수수료, 슬리피지 등)가 별도로 저장되어 있지 않을 수 있음.
        # 기본값 또는 전략 설정에서 가져와야 함.
        # 여기서는 보수적인 기본값 설정
        execution_params = schemas.BacktestExecutionParameters(
            initial_capital=live_bot.initial_capital,
            leverage=1.0, # 추후 LiveBot 모델에 leverage 필드 추가 고려
            fee=0.1,      # 기본 수수료 0.1%
            slippage=0.05 # 기본 슬리피지 0.05%
        )

        super().__init__(ohlcv_df, signals_df, live_bot.initial_capital, execution_params, strategy_params)

        # --- DB 상태 복원 ---
        # BacktestingEngine은 __init__에서 초기 자본금으로 balance를 초기화하므로,
        # 현재 LiveBot의 상태로 덮어씌워야 합니다.
        if live_bot.current_balance is not None:
            self.balance = live_bot.current_balance
        
        self.position_size = live_bot.position_size
        self.entry_price = live_bot.entry_price if live_bot.entry_price else 0.0
        
        # 포지션 방향 설정
        if self.position_size > 0:
            self.position_type = 'long'
        elif self.position_size < 0:
            self.position_type = 'short'
        else:
            self.position_type = None
            
        # 평균 진입 단가는 entry_price와 동일하다고 가정 (부분 청산/진입이 없는 단순 모델)
        self.position_avg_price = self.entry_price
        
        # 투자 원금 계산 (대략적)
        if self.position_type:
            self.invested_capital = abs(self.position_size) * self.entry_price
        else:
            self.invested_capital = 0.0

        # 임시 보완: 포지션이 있는데 SL/TP가 없다면, 현재가 기준으로라도 설정 시도?
        # 아니면 전략 파라미터의 고정 %가 있다면 그것으로 복구 가능.
        if self.position_type:
            # ========== DB에서 먼저 복구 시도 ==========
            if live_bot.sl_price:
                self.sl_price = live_bot.sl_price
                logger.info(f"Restored SL price from DB: {self.sl_price}")
            elif self.tpsl_logic.stop_loss_pct:
                # 고정 % 방식이라면 복구 가능
                self.sl_price = self.entry_price * (1 - self.tpsl_logic.stop_loss_pct / 100) if self.position_type == 'long' else self.entry_price * (1 + self.tpsl_logic.stop_loss_pct / 100)
            
            if live_bot.tp_price:
                self.tp_price = live_bot.tp_price
                logger.info(f"Restored TP price from DB: {self.tp_price}")
            elif self.tpsl_logic.take_profit_pct:
                self.tp_price = self.entry_price * (1 + self.tpsl_logic.take_profit_pct / 100) if self.position_type == 'long' else self.entry_price * (1 - self.tpsl_logic.take_profit_pct / 100)
            # ================================================

    def execute_single_step(self, timestamp) -> Dict[str, Any]:
        """
        특정 타임스탬프(일반적으로 가장 최근 캔들)에 대해 1스텝 시뮬레이션을 수행하고
        업데이트된 상태를 반환합니다.
        """
        if timestamp not in self.data.index:
            raise ValueError(f"Timestamp {timestamp} not found in data.")

        # 해당 타임스탬프의 데이터 그룹 가져오기
        group = self.data.loc[[timestamp]]
        
        # 1스텝 실행
        self.process_single_step(timestamp, group)
        
        # 현재가 가져오기
        current_price = group.iloc[-1]['close']
        
        # Equity 계산 (총 자산 = 현금 + 포지션 평가 금액)
        equity = self.balance
        if self.position_type:
            position_value = abs(self.position_size) * current_price
            equity += position_value
        
        # 업데이트된 상태 반환
        return {
            "current_balance": equity,  # ✅ 총 자산(equity) 반환
            "position_size": self.position_size,
            "entry_price": self.entry_price if self.position_type else None,
            "last_signal": group.iloc[-1].get('signal'),
            "trades": self.trade_logs
        }
