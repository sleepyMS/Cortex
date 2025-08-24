# file: backend/app/engine/backtesting_engine.py

import pandas as pd
import pandas_ta as ta
import numpy as np
from typing import Dict, List, Tuple

class BacktestingEngine:
    """
    상태를 가지는(Stateful) 백테스팅 시뮬레이터의 최종 완성 버전입니다.
    롱/숏 포지션, 레버리지, 고급 TP/SL, 다양한 성과 지표를 모두 지원하여
    현실적이고 깊이 있는 백테스팅 결과를 제공합니다.
    """

    def __init__(self,
                 ohlcv_df: pd.DataFrame,
                 signals_df: pd.DataFrame,
                 parameters: dict):
        """
        백테스팅 엔진을 초기화하고 필요한 데이터를 사전 계산합니다.
        """
        # --- 1. 데이터 및 파라미터 준비 ---
        self.data = ohlcv_df.join(signals_df).sort_index()
        self.params = parameters
        self.strategy_params = self.params.get('parameters', {})
        self.tpsl_logic = self.strategy_params.get('tpslLogic', {})

        # --- 2. ATR 기반 TP/SL을 위한 지표 사전 계산 ---
        if self.tpsl_logic and self.tpsl_logic.get('atrPeriod'):
            atr_period = self.tpsl_logic['atrPeriod']
            self.data.ta.atr(length=atr_period, append=True)

        # --- 3. 핵심 파라미터 설정 ---
        self.initial_capital = self.params.get('initialCapital', 10000.0)
        self.leverage = self.strategy_params.get('leverage', 1.0)
        self.fee_pct = self.strategy_params.get('fee', 0.04) / 100
        self.slippage_pct = self.strategy_params.get('slippage', 0.01) / 100

        # --- 4. 시뮬레이션 상태 변수 초기화 ---
        self.balance = self.initial_capital
        self.position_size = 0.0      # 현재 보유 수량 (+: long, -: short)
        self.position_avg_price = 0.0 # 진입 평균 단가
        self.position_type = None     # 'long' 또는 'short'
        self.entry_price = 0.0        # TP/SL 계산을 위한 마지막 진입 가격

        # --- 5. 결과 분석용 변수 초기화 ---
        self.equity_curve = []
        self.trade_logs = []
        self.winning_trades = 0
        self.losing_trades = 0
        self.gross_profit = 0.0
        self.gross_loss = 0.0

    def run(self) -> Tuple[Dict, List[Dict]]:
        """메인 시뮬레이션 루프를 실행합니다."""
        if self.data.empty:
            return self._calculate_summary_stats(), self.trade_logs

        for timestamp, row in self.data.iterrows():
            # 시뮬레이션 루프 내 실행 순서가 매우 중요합니다.
            # 1. TP/SL 체크 -> 2. 신호 처리 -> 3. 최종 자산 기록
            self._check_tp_sl(timestamp, row)
            self._process_signals(timestamp, row)
            self._update_equity(timestamp, row['close'])

        summary = self._calculate_summary_stats()
        return summary, self.trade_logs

    def _process_signals(self, timestamp, row: pd.Series):
        """새로운 매매 신호를 확인하고 거래를 실행합니다."""
        signal = row.get('signal')
        if not signal:
            return

        # 진입 신호 처리
        if self.position_size == 0:
            if signal == 'long_entry':
                self._execute_trade(timestamp, row['close'], 'buy', is_entry=True)
            elif signal == 'short_entry':
                self._execute_trade(timestamp, row['close'], 'sell', is_entry=True)
        # 청산 신호 처리
        else:
            if signal == 'long_exit' and self.position_type == 'long':
                self._execute_trade(timestamp, row['close'], 'sell', is_entry=False)
            elif signal == 'short_exit' and self.position_type == 'short':
                self._execute_trade(timestamp, row['close'], 'buy', is_entry=False)

    def _check_tp_sl(self, timestamp, row: pd.Series):
        """TP/SL 발동 여부를 확인하고, 발동 시 포지션을 청산합니다."""
        if not self.position_type:
            return

        atr_period = self.tpsl_logic.get('atrPeriod')
        atr_sl_multiplier = self.tpsl_logic.get('atrStopLossMultiplier')
        atr_tp_multiplier = self.tpsl_logic.get('atrTakeProfitMultiplier')
        
        sl_price, tp_price = None, None
        atr_value = row.get(f'ATRr_{atr_period}') if atr_period else None

        if self.position_type == 'long':
            # (기존 롱 포지션 로직은 그대로 유지)
            if atr_sl_multiplier and not pd.isna(atr_value):
                sl_price = self.entry_price - (atr_value * atr_sl_multiplier)
            elif self.tpsl_logic.get('stopLossPct'):
                sl_price = self.entry_price * (1 - self.tpsl_logic['stopLossPct'] / 100)

            if atr_tp_multiplier and not pd.isna(atr_value):
                tp_price = self.entry_price + (atr_value * atr_tp_multiplier)
            elif self.tpsl_logic.get('takeProfitPct'):
                tp_price = self.entry_price * (1 + self.tpsl_logic['takeProfitPct'] / 100)
            
            if sl_price and row['low'] <= sl_price:
                self._execute_trade(timestamp, sl_price, 'sell', is_entry=False, reason="Stop Loss")
            elif tp_price and row['high'] >= tp_price:
                self._execute_trade(timestamp, tp_price, 'sell', is_entry=False, reason="Take Profit")

        elif self.position_type == 'short':
            # 숏 포지션의 손절은 가격 상승 시 발동
            if atr_sl_multiplier and not pd.isna(atr_value):
                sl_price = self.entry_price + (atr_value * atr_sl_multiplier)
            elif self.tpsl_logic.get('stopLossPct'):
                sl_price = self.entry_price * (1 + self.tpsl_logic['stopLossPct'] / 100)
            
            # 숏 포지션의 익절은 가격 하락 시 발동
            if atr_tp_multiplier and not pd.isna(atr_value):
                tp_price = self.entry_price - (atr_value * atr_tp_multiplier)
            elif self.tpsl_logic.get('takeProfitPct'):
                tp_price = self.entry_price * (1 - self.tpsl_logic['takeProfitPct'] / 100)

            # SL/TP 가격 도달 시 청산 (매수로 숏 커버)
            if sl_price and row['high'] >= sl_price:
                self._execute_trade(timestamp, sl_price, 'buy', is_entry=False, reason="Stop Loss")
            elif tp_price and row['low'] <= tp_price:
                self._execute_trade(timestamp, tp_price, 'buy', is_entry=False, reason="Take Profit")


    def _execute_trade(self, timestamp, price: float, side: str, is_entry: bool, reason: str = "Signal"):
        """거래를 실행하고 모든 상태 변수를 업데이트합니다. (숏 포지션 청산 로직 추가)"""
        # --- 1. 포지션 진입 로직 ---
        if is_entry:
            if self.position_size != 0: return # 이미 포지션이 있으면 진입 불가

            trade_price = price * (1 + self.slippage_pct if side == 'buy' else 1 - self.slippage_pct)
            invest_amount = self.balance * self.leverage * 0.99
            quantity = invest_amount / trade_price
            
            commission = invest_amount * self.fee_pct
            if self.balance < commission: return

            self.balance -= commission
            self.position_size = quantity if side == 'buy' else -quantity
            self.position_avg_price = trade_price
            self.entry_price = trade_price
            self.position_type = 'long' if side == 'buy' else 'short'
            pnl = None

        # --- 2. 포지션 청산 로직 ---
        else: # is_entry == False
            if self.position_size == 0: return

            pnl = 0.0
            
            # --- [핵심 수정] ---
            # 롱 포지션 청산 (매도)과 숏 포지션 청산 (매수)을 명확히 분리
            if side == 'sell' and self.position_type == 'long':
                # --- 2-1. 롱 포지션 청산 ---
                trade_price = price * (1 - self.slippage_pct)
                quantity = self.position_size
                pnl = (trade_price - self.position_avg_price) * quantity
                
                self.balance += quantity * self.position_avg_price + pnl
            
            elif side == 'buy' and self.position_type == 'short':
                # --- 2-2. 숏 포지션 청산 ---
                trade_price = price * (1 + self.slippage_pct)
                quantity = abs(self.position_size)
                pnl = (self.position_avg_price - trade_price) * quantity

                self.balance += quantity * self.position_avg_price + pnl
            
            else: # 잘못된 청산 요청 (e.g. 롱 포지션인데 매수 청산)
                return

            # --- 2-3. 공통 청산 후 처리 ---
            commission = abs(self.position_size * trade_price) * self.fee_pct
            pnl -= commission
            self.balance -= commission

            # 통계 업데이트
            self.gross_profit += max(0, pnl)
            self.gross_loss += min(0, pnl)
            if pnl > 0: self.winning_trades += 1
            else: self.losing_trades += 1

            # 포지션 상태 초기화
            self.position_size, self.position_avg_price, self.position_type = 0.0, 0.0, None

        # --- 3. 거래 로그 기록 ---
        log = {
            "timestamp": timestamp, "side": side, "price": trade_price, "quantity": quantity,
            "commission": commission, "pnl": pnl, "current_balance": self.balance, "reason": reason,
        }
        self.trade_logs.append(log)

    def _update_equity(self, timestamp, current_price: float):
        """매 캔들마다 현재 총 자산(Equity)을 계산하여 기록합니다."""
        position_value = self.position_size * current_price
        equity = self.balance + position_value
        self.equity_curve.append({'time': timestamp.isoformat(), 'value': equity})

    def _calculate_summary_stats(self) -> Dict:
        """최종 성과 지표를 계산합니다."""
        if not self.equity_curve:
            return {} # 거래가 없으면 빈 dict 반환

        equity_df = pd.DataFrame(self.equity_curve).set_index('time')
        equity_df.index = pd.to_datetime(equity_df.index)
        
        # 기본 지표
        final_equity = equity_df['value'].iloc[-1]
        total_return_pct = ((final_equity - self.initial_capital) / self.initial_capital) * 100
        
        peak = equity_df['value'].expanding(min_periods=1).max()
        drawdown = (equity_df['value'] - peak) / peak
        mdd_pct = drawdown.min() * 100 if not drawdown.empty else 0.0
        
        total_trades = self.winning_trades + self.losing_trades
        win_rate_pct = (self.winning_trades / total_trades) * 100 if total_trades > 0 else 0.0
        
        # 고급 지표
        profit_factor = self.gross_profit / abs(self.gross_loss) if self.gross_loss != 0 else float('inf')
        
        daily_returns = equity_df['value'].resample('D').last().pct_change().dropna()
        
        cagr = 0.0
        if not daily_returns.empty:
            days = (daily_returns.index[-1] - daily_returns.index[0]).days
            if days > 0:
                cagr = ((final_equity / self.initial_capital) ** (365.0 / days) - 1) * 100

        downside_returns = daily_returns[daily_returns < 0]
        downside_std = downside_returns.std()
        
        sortino_ratio = 0.0
        if downside_std > 0:
            annualized_return = daily_returns.mean() * 365
            annualized_downside_std = downside_std * np.sqrt(365)
            sortino_ratio = annualized_return / annualized_downside_std

        return {
            "total_return_pct": round(total_return_pct, 2),
            "mdd_pct": round(mdd_pct, 2),
            "win_rate_pct": round(win_rate_pct, 2),
            "profit_factor": round(profit_factor, 2),
            "sortino_ratio": round(sortino_ratio, 2),
            "cagr_pct": round(cagr, 2),
            "total_trades": total_trades,
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "pnl_curve_json": self.equity_curve,
        }