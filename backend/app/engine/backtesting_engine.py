# file: backend/app/engine/backtesting_engine.py

import pandas as pd
import pandas_ta as ta
import numpy as np
from typing import Dict, List, Tuple, Optional
from scipy.stats import linregress
from datetime import timedelta
from .. import schemas

class BacktestingEngine:
    """
    [최종 완성 버전] 명확한 청산 우선순위와 정확한 데이터 소스를 사용하여
    신뢰도 높은 시뮬레이션 결과를 제공하는 백테스팅 엔진.
    """

    def __init__(self,
                 ohlcv_df: pd.DataFrame,
                 signals_df: pd.DataFrame,
                 initial_capital: float,
                 execution_params: schemas.BacktestExecutionParameters,
                 strategy_params: schemas.StrategyCreate):
        """
        [수정 완료] 엔진 초기화 시, 오직 'strategy_params'(완전한 스냅샷)에서만
        TP/SL 설정을 가져와 데이터 무결성을 보장합니다.
        """
        # --- 1. 데이터 준비 ---
        self.data = ohlcv_df.join(signals_df)
        if not self.data.index.is_monotonic_increasing:
             self.data = self.data.sort_index()

        # --- 2. 파라미터 설정 ---
        self.initial_capital = initial_capital
        self.leverage = execution_params.leverage
        self.fee_pct = execution_params.fee
        self.slippage_pct = execution_params.slippage
        
        # [핵심] 스냅샷에 모든 정보가 있으므로, strategy_params만 참조합니다.
        self.tpsl_logic = strategy_params.tpsl_logic if strategy_params.tpsl_logic else schemas.TpslLogic()

        # --- 3. ATR 기반 TP/SL을 위한 지표 사전 계산 ---
        if self.tpsl_logic and self.tpsl_logic.atr_period:
            atr_period = self.tpsl_logic.atr_period
            ohlcv_lower = ohlcv_df.rename(columns=str.lower)
            self.data.ta.atr(
                high=ohlcv_lower['high'], low=ohlcv_lower['low'], close=ohlcv_lower['close'],
                length=atr_period, append=True
            )
            self.data.rename(columns={f"ATR_{atr_period}": f"atr_{atr_period}"}, inplace=True)

        # --- 4. 시뮬레이션 상태 변수 초기화 ---
        self.balance = self.initial_capital
        self.position_size, self.position_avg_price, self.position_type = 0.0, 0.0, None
        self.entry_price, self.invested_capital = 0.0, 0.0
        self.sl_price, self.tp_price = None, None
        self.highest_price_since_entry, self.lowest_price_since_entry = 0.0, float('inf')
        self.equity_curve, self.trade_logs = [], []
        self.winning_trades, self.losing_trades, self.gross_profit, self.gross_loss = 0, 0, 0.0, 0.0
        self.entry_commission, self.entry_timestamp = 0.0, None
        self.total_holding_period = timedelta(0)


    def run(self) -> Tuple[Dict, List[Dict]]:
        """
        명확한 우선순위(SL > TP > Signal)에 따라 청산 이유와 가격을 결정하는
        통합 로직을 사용하는 메인 시뮬레이션 루프.
        """
        for timestamp, group in self.data.groupby(level=0, sort=False):
            # 그룹 내 마지막 행을 해당 타임스탬프의 대표 OHLCV 값으로 사용
            row_for_ohlc = group.iloc[-1]

            # --- 1. 청산 조건 우선 확인 (포지션 보유 시) ---
            exit_reason, exit_price = None, None
            if self.position_type:
                # 우선순위 1: Stop Loss
                if self.sl_price:
                    if self.position_type == 'long' and row_for_ohlc['low'] <= self.sl_price:
                        exit_reason, exit_price = "Stop Loss", self.sl_price
                    elif self.position_type == 'short' and row_for_ohlc['high'] >= self.sl_price:
                        exit_reason, exit_price = "Stop Loss", self.sl_price
                
                # 우선순위 2: Take Profit
                if not exit_reason and self.tp_price:
                    if self.position_type == 'long' and row_for_ohlc['high'] >= self.tp_price:
                        exit_reason, exit_price = "Take Profit", self.tp_price
                    elif self.position_type == 'short' and row_for_ohlc['low'] <= self.tp_price:
                        exit_reason, exit_price = "Take Profit", self.tp_price

                # 우선순위 3: Exit Signal (그룹 내 모든 신호 확인)
                if not exit_reason:
                    for _, signal_row in group.iterrows():
                        signal = signal_row.get('signal')
                        if signal == 'long_exit' and self.position_type == 'long':
                            exit_reason, exit_price = "Signal", row_for_ohlc['close']
                            break 
                        elif signal == 'short_exit' and self.position_type == 'short':
                            exit_reason, exit_price = "Signal", row_for_ohlc['close']
                            break

            # --- 2. 결정된 행동 실행 ---
            if exit_reason and exit_price:
                # 청산 실행
                self._execute_trade(timestamp, exit_price, 'sell' if self.position_type == 'long' else 'buy', is_entry=False, reason=exit_reason)
            
            # 포지션이 없고, 진입 신호가 있을 경우
            # (청산과 진입이 같은 캔들에서 일어날 수 있으므로 if/else가 아닌 별도 if문 사용)
            if self.position_size == 0:
                for _, signal_row in group.iterrows():
                    signal = signal_row.get('signal')
                    if signal == 'long_entry':
                        self._execute_trade(timestamp, row_for_ohlc['close'], 'buy', is_entry=True, reason="Signal")
                        break # 한 캔들에서 진입은 한 번만
                    elif signal == 'short_entry':
                        self._execute_trade(timestamp, row_for_ohlc['close'], 'sell', is_entry=True, reason="Signal")
                        break # 한 캔들에서 진입은 한 번만

            # --- 3. 후처리 (루프의 마지막) ---
            # 모든 거래 처리가 끝난 후, 해당 타임스탬프의 자산 상태를 "한 번만" 기록
            self._update_equity(timestamp, row_for_ohlc['close'])
            if self.position_type:
                self._update_trailing_stop(row_for_ohlc)
        # ▲▲▲ 여기까지 교체 ▲▲▲

        return self._calculate_summary_stats(), self.trade_logs


    def _calculate_initial_tp_sl(self, row: pd.Series) -> Tuple[Optional[float], Optional[float]]:
        sl_price, tp_price = None, None
        atr_period = self.tpsl_logic.atr_period
        atr_value = row.get(f'atr_{atr_period}') if atr_period else None

        if self.tpsl_logic.atr_stop_loss_multiplier and atr_value:
            sl_price = self.entry_price - (atr_value * self.tpsl_logic.atr_stop_loss_multiplier) if self.position_type == 'long' else self.entry_price + (atr_value * self.tpsl_logic.atr_stop_loss_multiplier)
        elif self.tpsl_logic.stop_loss_pct:
            sl_price = self.entry_price * (1 - self.tpsl_logic.stop_loss_pct / 100) if self.position_type == 'long' else self.entry_price * (1 + self.tpsl_logic.stop_loss_pct / 100)

        if self.tpsl_logic.atr_take_profit_multiplier and atr_value:
            tp_price = self.entry_price + (atr_value * self.tpsl_logic.atr_take_profit_multiplier) if self.position_type == 'long' else self.entry_price - (atr_value * self.tpsl_logic.atr_take_profit_multiplier)
        elif self.tpsl_logic.take_profit_pct:
            tp_price = self.entry_price * (1 + self.tpsl_logic.take_profit_pct / 100) if self.position_type == 'long' else self.entry_price * (1 - self.tpsl_logic.take_profit_pct / 100)

        return sl_price, tp_price


    def _update_trailing_stop(self, row: pd.Series):
        if not self.tpsl_logic.trailing_stop_enabled or not self.position_type: return
        if self.position_type == 'long': self.highest_price_since_entry = max(self.highest_price_since_entry, row['high'])
        else: self.lowest_price_since_entry = min(self.lowest_price_since_entry, row['low'])
        
        activation_pct = self.tpsl_logic.trailing_stop_activation_pct or 0
        current_return_pct = ((self.highest_price_since_entry / self.entry_price - 1) * 100) if self.position_type == 'long' else ((self.entry_price / self.lowest_price_since_entry - 1) * 100)
        if current_return_pct < activation_pct: return

        new_sl_price = None
        if self.tpsl_logic.trailing_stop_callback_pct:
            callback_pct = self.tpsl_logic.trailing_stop_callback_pct
            new_sl_price = self.highest_price_since_entry * (1 - callback_pct / 100) if self.position_type == 'long' else self.lowest_price_since_entry * (1 + callback_pct / 100)

        if new_sl_price is not None:
            if self.position_type == 'long' and (self.sl_price is None or new_sl_price > self.sl_price): self.sl_price = new_sl_price
            elif self.position_type == 'short' and (self.sl_price is None or new_sl_price < self.sl_price): self.sl_price = new_sl_price


    def _execute_trade(self, timestamp, price: float, side: str, is_entry: bool, reason: str):
        trade_price = price * (1 + self.slippage_pct / 100) if side == 'buy' else price * (1 - self.slippage_pct / 100)
        pnl, commission = None, 0.0
        quantity = 0.0

        trade_action_type = ""

        if is_entry:
            if self.position_size != 0: return
            self.position_type = 'long' if side == 'buy' else 'short'
            self.entry_timestamp = timestamp

            #  진입 시점에 trade_action_type 결정
            trade_action_type = "LONG_ENTRY" if self.position_type == 'long' else "SHORT_ENTRY"

            invest_amount = self.balance * self.leverage * 0.99
            quantity = invest_amount / trade_price
            commission = invest_amount * (self.fee_pct / 100)
            if self.balance < commission: return
            
            self.balance -= commission
            self.balance -= (quantity * trade_price)
            self.invested_capital = quantity * trade_price
            self.position_size = quantity if side == 'buy' else -quantity
            self.position_avg_price = self.entry_price = trade_price
            self.entry_commission = commission
            self.sl_price, self.tp_price = self._calculate_initial_tp_sl(self.data.loc[timestamp])
            if self.position_type == 'long': self.highest_price_since_entry = self.entry_price
            else: self.lowest_price_since_entry = self.entry_price
        
        else: # Exit Logic
            if self.position_size == 0: return

            # 청산 시점에 trade_action_type 결정
            trade_action_type = "LONG_EXIT" if self.position_type == 'long' else "SHORT_EXIT"

            quantity = abs(self.position_size)
            raw_pnl = (trade_price - self.position_avg_price) * quantity if self.position_type == 'long' else (self.position_avg_price - trade_price) * quantity
            
            self.balance += (self.invested_capital + raw_pnl)
            exit_value = quantity * trade_price
            commission = exit_value * (self.fee_pct / 100)
            self.balance -= commission
            pnl = raw_pnl - self.entry_commission - commission

            if pnl > 0: self.winning_trades += 1
            else: self.losing_trades += 1
            self.gross_profit += max(0, pnl)
            self.gross_loss += min(0, pnl)
            if self.entry_timestamp: self.total_holding_period += (timestamp - self.entry_timestamp)
            
            # Reset all position-related state variables
            self.position_size, self.position_avg_price, self.position_type, self.invested_capital = 0.0, 0.0, None, 0.0
            self.sl_price, self.tp_price, self.entry_timestamp = None, None, None
            self.highest_price_since_entry, self.lowest_price_since_entry, self.entry_commission = 0.0, float('inf'), 0.0

        self.trade_logs.append({
            "timestamp": timestamp, "side": trade_action_type, "price": trade_price, "quantity": abs(quantity),
            "commission": commission, "pnl": pnl, "current_balance": self.balance + self.invested_capital,
            "reason": reason
        })

    def _update_equity(self, timestamp, current_price: float):
        unrealized_pnl = 0.0
        if self.position_type == 'long': unrealized_pnl = (current_price - self.position_avg_price) * self.position_size
        elif self.position_type == 'short': unrealized_pnl = (self.position_avg_price - current_price) * abs(self.position_size)
        equity = self.balance + self.invested_capital + unrealized_pnl
        self.equity_curve.append({'time': int(timestamp.timestamp()), 'value': equity})

    def _calculate_summary_stats(self) -> Dict:
        # 이 메소드는 이전 버전과 동일하므로 생략합니다.
        # 기존의 상세 지표 계산 로직을 그대로 사용하시면 됩니다.
        if not self.equity_curve: return {}
        equity_df = pd.DataFrame(self.equity_curve).set_index('time')
        equity_df.index = pd.to_datetime(equity_df.index, unit='s')

        final_equity = equity_df['value'].iloc[-1]
        total_return_pct = ((final_equity - self.initial_capital) / self.initial_capital) * 100
        
        peak = equity_df['value'].expanding(min_periods=1).max()
        drawdown = (equity_df['value'] - peak) / peak
        mdd_pct = drawdown.min() * 100 if not drawdown.empty else 0.0
        drawdown_curve_json = [{'time': int(idx.timestamp()), 'value': round(val, 2)} for idx, val in (drawdown * 100).items()]
        
        total_trades = self.winning_trades + self.losing_trades
        win_rate_pct = (self.winning_trades / total_trades) * 100 if total_trades > 0 else 0.0
        profit_factor = self.gross_profit / abs(self.gross_loss) if self.gross_loss != 0 else 0.0
        
        daily_returns = equity_df['value'].resample('D').last().pct_change().dropna()
        sharpe_ratio, cagr, sortino_ratio = 0.0, 0.0, 0.0
        if not daily_returns.empty and len(daily_returns) > 1:
            annualized_return = daily_returns.mean() * 365
            annualized_std = daily_returns.std() * np.sqrt(365)
            if annualized_std > 0: sharpe_ratio = annualized_return / annualized_std
            
            days = (equity_df.index[-1] - equity_df.index[0]).days
            if days > 30: cagr = ((final_equity / self.initial_capital) ** (1 / (days / 365.0)) - 1) * 100
            
            annualized_downside_std = daily_returns[daily_returns < 0].std() * np.sqrt(365)
            if annualized_downside_std > 0: sortino_ratio = annualized_return / annualized_downside_std
        
        mdd_abs = abs(mdd_pct)
        calmar_ratio = cagr / mdd_abs if mdd_abs > 0 and cagr is not None else 0.0
        avg_profit = self.gross_profit / self.winning_trades if self.winning_trades > 0 else 0.0
        avg_loss = abs(self.gross_loss / self.losing_trades) if self.losing_trades > 0 else 0.0
        avg_profit_loss_ratio = avg_profit / avg_loss if avg_loss > 0 else 0.0
        ulcer_index = np.sqrt(np.sum(drawdown**2) / len(drawdown)) * 100 if not drawdown.empty else 0.0
        
        peak_dates = equity_df[equity_df['value'] >= peak]
        longest_flat_days = (peak_dates.index.to_series().diff().max() or timedelta(0)).days
        avg_holding_period_days = (self.total_holding_period.total_seconds() / (24 * 3600)) / total_trades if total_trades > 0 else 0.0
        
        k_ratio = 0.0
        if not daily_returns.empty and len(daily_returns) > 1:
            log_equity = np.log(equity_df['value'])
            x = np.arange(len(log_equity))
            slope, _, _, _, std_err = linregress(x, log_equity)
            if std_err > 0 and len(x) > 0:
                k_ratio = (slope * 365) / (std_err * np.sqrt(len(x))) * (1 / np.sqrt(365))
        
        score_factors = {"profitability": {"metric": "Profit Factor", "value": profit_factor, "target": 2.0, "weight": 30}, "riskAdjusted": {"metric": "Sortino Ratio", "value": sortino_ratio, "target": 3.0, "weight": 30}, "resilience": {"metric": "Calmar Ratio", "value": calmar_ratio, "target": 1.0, "weight": 30}, "consistency": {"metric": "K-Ratio", "value": k_ratio, "target": 1.5, "weight": 10}}
        backtest_score = 0
        for key, factor in score_factors.items():
            score = (factor['value'] / factor['target']) * 100 if factor.get('target') else 0
            score_factors[key]['score'] = max(0, min(150, score))
            backtest_score += score_factors[key]['score'] * (factor['weight'] / 100)

        return {
            "total_return_pct": round(total_return_pct, 2), "mdd_pct": round(mdd_pct, 2),
            "win_rate_pct": round(win_rate_pct, 2), "profit_factor": round(profit_factor, 2),
            "sharpe_ratio": round(sharpe_ratio, 2), "sortino_ratio": round(sortino_ratio, 2),
            "cagr_pct": round(cagr, 2), "total_trades": total_trades, "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades, "pnl_curve_json": self.equity_curve,
            "drawdown_curve_json": drawdown_curve_json, "calmar_ratio": round(calmar_ratio, 2),
            "avg_profit_loss_ratio": round(avg_profit_loss_ratio, 2), "ulcer_index": round(ulcer_index, 2),
            "longest_flat_days": longest_flat_days, "avg_holding_period_days": round(avg_holding_period_days, 2),
            "k_ratio": round(k_ratio, 2), "backtest_score": round(backtest_score, 2), "score_factors": score_factors
        }