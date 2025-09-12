# file: backend/app/engine/backtesting_engine.py

import pandas as pd
import pandas_ta as ta
import numpy as np
from typing import Dict, List, Tuple, Optional
from scipy.stats import linregress # K-Ratio 계산을 위해 import
from datetime import timedelta     # 평균 보유 기간 계산을 위해 import
from .. import schemas

class BacktestingEngine:
    """
    상태를 가지는(Stateful) 백테스팅 시뮬레이터의 최종 완성 버전입니다.
    롱/숏 포지션, 레버리지, 고급 TP/SL, 다양한 성과 지표를 모두 지원하여
    현실적이고 깊이 있는 백테스팅 결과를 제공합니다.
    """

    def __init__(self,
                 ohlcv_df: pd.DataFrame,
                 signals_df: pd.DataFrame,
                 execution_params: schemas.BacktestParametersPayload,
                 strategy_params: schemas.StrategyCreate):
        """
        [최종 완성 버전] 모든 파라미터를 올바른 위치에서 가져오고, 모든 변수를 정확하게 초기화합니다.
        """
        # --- 1. 데이터 준비 ---
        self.data = ohlcv_df.join(signals_df)
        if not self.data.index.is_monotonic_increasing:
             self.data = self.data.sort_index()

        # --- 2. 파라미터 설정 ---
        self.exec_params = execution_params
        
        self.initial_capital = self.exec_params.initial_capital
        inner_params = self.exec_params.parameters
        self.leverage = inner_params.leverage
        self.fee_pct = inner_params.fee
        self.slippage_pct = inner_params.slippage
        
        self.tpsl_logic = strategy_params.tpsl_logic if strategy_params.tpsl_logic else schemas.TpslLogic()
        
        # --- 3. ATR 기반 TP/SL을 위한 지표 사전 계산 ---
        if self.tpsl_logic and self.tpsl_logic.atr_period:
            atr_period = self.tpsl_logic.atr_period
            ohlcv_lower = ohlcv_df.rename(columns=str.lower)
            self.data.ta.atr(
                high=ohlcv_lower['high'],
                low=ohlcv_lower['low'],
                close=ohlcv_lower['close'],
                length=atr_period,
                append=True
            )
            self.data.rename(columns={f"ATR_{atr_period}": f"atr_{atr_period}"}, inplace=True)

        # --- 4. 시뮬레이션 상태 변수 초기화 ---
        self.balance = self.initial_capital
        self.position_size = 0.0
        self.position_avg_price = 0.0
        self.position_type = None
        self.entry_price = 0.0
        self.invested_capital = 0.0
        self.sl_price = None
        self.tp_price = None
        self.highest_price_since_entry = 0.0
        self.lowest_price_since_entry = float('inf')

        # --- 5. 결과 분석용 변수 초기화 ---
        self.equity_curve = []
        self.trade_logs = []
        self.winning_trades = 0
        self.losing_trades = 0
        self.gross_profit = 0.0
        self.gross_loss = 0.0
        self.entry_commission = 0.0

        # 평균 보유 기간 계산을 위한 변수 
        self.entry_timestamp = None
        self.total_holding_period = timedelta(0)

    def run(self) -> Tuple[Dict, List[Dict]]:
        """메인 시뮬레이션 루프를 실행합니다."""
        if self.data.empty:
            return self._calculate_summary_stats(), self.trade_logs

        for timestamp, row in self.data.iterrows():
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

    def _calculate_initial_tp_sl(self, row: pd.Series) -> Tuple[Optional[float], Optional[float]]:
        """Pydantic 객체 속성에 직접 접근하여 최초 TP/SL 가격을 계산합니다."""
        sl_price, tp_price = None, None
        
        atr_period = self.tpsl_logic.atr_period
        atr_value = row.get(f'atr_{atr_period}') if atr_period else None

        # --- SL 가격 계산 ---
        atr_sl_multiplier = self.tpsl_logic.atr_stop_loss_multiplier
        stop_loss_pct = self.tpsl_logic.stop_loss_pct
        
        if atr_sl_multiplier and atr_value:
            sl_price = self.entry_price - (atr_value * atr_sl_multiplier) if self.position_type == 'long' else self.entry_price + (atr_value * atr_sl_multiplier)
        elif stop_loss_pct:
            sl_price = self.entry_price * (1 - stop_loss_pct / 100) if self.position_type == 'long' else self.entry_price * (1 + stop_loss_pct / 100)

        # --- TP 가격 계산 ---
        atr_tp_multiplier = self.tpsl_logic.atr_take_profit_multiplier
        take_profit_pct = self.tpsl_logic.take_profit_pct
        
        if atr_tp_multiplier and atr_value:
            tp_price = self.entry_price + (atr_value * atr_tp_multiplier) if self.position_type == 'long' else self.entry_price - (atr_value * atr_tp_multiplier)
        elif take_profit_pct:
            tp_price = self.entry_price * (1 + take_profit_pct / 100) if self.position_type == 'long' else self.entry_price * (1 - take_profit_pct / 100)
            
        return sl_price, tp_price

    def _check_tp_sl(self, timestamp, row: pd.Series):
        """
        TP/SL 발동 여부를 확인하고, 트레일링 스탑 로직을 적용합니다.
        """
        # --- 0. 가드 조건: 포지션이 없거나, SL/TP가 설정되지 않은 경우 즉시 종료 ---
        if not self.position_type or (self.sl_price is None and self.tp_price is None):
            return

        # --- 1. 청산 조건 확인: 현재 캔들에서 SL/TP 가격에 도달했는지 먼저 확인 ---
        # 이 로직은 정적 손절과 트레일링 손절 모두에 공통으로 적용됩니다.
        if self.position_type == 'long':
            # 익절 조건: 현재 캔들의 고가가 TP 가격보다 높거나 같으면 익절
            if self.tp_price and row['high'] >= self.tp_price:
                self._execute_trade(timestamp, self.tp_price, 'sell', is_entry=False, reason="Take Profit")
                return # 포지션이 청산되었으므로 추가 작업 즉시 중단
            # 손절 조건: 현재 캔들의 저가가 SL 가격보다 낮거나 같으면 손절
            if self.sl_price and row['low'] <= self.sl_price:
                self._execute_trade(timestamp, self.sl_price, 'sell', is_entry=False, reason="Stop Loss")
                return
                
        elif self.position_type == 'short':
            # 익절 조건: 현재 캔들의 저가가 TP 가격보다 낮거나 같으면 익절
            if self.tp_price and row['low'] <= self.tp_price:
                self._execute_trade(timestamp, self.tp_price, 'buy', is_entry=False, reason="Take Profit")
                return
            # 손절 조건: 현재 캔들의 고가가 SL 가격보다 높거나 같으면 손절
            if self.sl_price and row['high'] >= self.sl_price:
                self._execute_trade(timestamp, self.sl_price, 'buy', is_entry=False, reason="Stop Loss")
                return

        # --- 2. 트레일링 스탑 갱신 로직 (설정이 활성화된 경우에만 실행) ---
        if not self.tpsl_logic.trailing_stop_enabled:
            return

        # 2-1. 고점/저점 갱신
        if self.position_type == 'long':
            self.highest_price_since_entry = max(self.highest_price_since_entry, row['high'])
        elif self.position_type == 'short':
            self.lowest_price_since_entry = min(self.lowest_price_since_entry, row['low'])
        
        # 2-2. 트레일링 스탑 발동 조건 확인 (수익률이 활성화 수익률 이상일 때)
        activation_pct = self.tpsl_logic.trailing_stop_activation_pct or 0
        current_return_pct = ((self.highest_price_since_entry / self.entry_price - 1) * 100) if self.position_type == 'long' else ((self.entry_price / self.lowest_price_since_entry - 1) * 100)


        if current_return_pct < activation_pct:
            return # 아직 발동 조건 미충족

        # 2-3. 새로운 트레일링 스탑 가격 계산
        new_sl_price = None
        callback_pct = self.tpsl_logic.trailing_stop_callback_pct
        atr_sl_multiplier = self.tpsl_logic.atr_stop_loss_multiplier
        atr_period = self.tpsl_logic.atr_period

        if callback_pct: # 고정 비율 트레일링 스탑
            if self.position_type == 'long':
                new_sl_price = self.highest_price_since_entry * (1 - callback_pct / 100)
            else: # short
                new_sl_price = self.lowest_price_since_entry * (1 + callback_pct / 100)

        elif atr_sl_multiplier and atr_period: # ATR 기반 트레일링 스탑
            atr_value = row.get(f'ATR_{atr_period}')
            if atr_value and not pd.isna(atr_value):
                if self.position_type == 'long':
                    new_sl_price = row['close'] - (atr_value * atr_sl_multiplier)
                else: # short
                    new_sl_price = row['close'] + (atr_value * atr_sl_multiplier)
        
        # 2-4. 손절 라인 갱신 (오직 유리한 방향으로만 이동)
        if new_sl_price is not None:
            if self.position_type == 'long' and new_sl_price > self.sl_price:
                self.sl_price = new_sl_price
            elif self.position_type == 'short' and new_sl_price < self.sl_price:
                self.sl_price = new_sl_price

    def _execute_trade(self, timestamp, price: float, side: str, is_entry: bool, reason: str = "Signal"):
        """
        [최종 수정 버전] 진입과 청산의 로직과 변수 범위를 명확하게 분리합니다.
        """
        # ... 공통 변수 초기화 ...
        commission = 0.0
        pnl = None
        quantity = 0.0
        trade_price = price

        if side == 'buy': trade_price *= (1 + self.slippage_pct / 100)
        else: trade_price *= (1 - self.slippage_pct / 100)

        # --- 1. 포지션 진입 로직 ---
        if is_entry:
            if self.position_size != 0: return

            self.position_type = 'long' if side == 'buy' else 'short'
            
            self.entry_timestamp = timestamp
            
            self.sl_price, self.tp_price = self._calculate_initial_tp_sl(self.data.loc[timestamp])
            
            invest_amount = self.balance * self.leverage * 0.99
            quantity = invest_amount / trade_price
            
            entry_commission = invest_amount * (self.fee_pct / 100)
            if self.balance < entry_commission: return

            self.entry_commission = entry_commission
            self.balance -= self.entry_commission

            position_cost = quantity * trade_price
            self.balance -= position_cost
            self.invested_capital = position_cost
            
            self.position_size = quantity if side == 'buy' else -quantity
            self.position_avg_price = trade_price
            self.entry_price = trade_price
            
            if self.position_type == 'long':
                self.highest_price_since_entry = self.entry_price
            elif self.position_type == 'short':
                self.lowest_price_since_entry = self.entry_price
            
            commission = self.entry_commission # 로그 기록용

        # --- 2. 포지션 청산 로직 ---
        else:
            if self.position_size == 0: return

            if self.entry_timestamp:
                self.total_holding_period += (timestamp - self.entry_timestamp)
                self.entry_timestamp = None

            raw_pnl = 0.0
            quantity = abs(self.position_size)

            if side == 'sell' and self.position_type == 'long':
                raw_pnl = (trade_price - self.position_avg_price) * quantity
            elif side == 'buy' and self.position_type == 'short':
                raw_pnl = (self.position_avg_price - trade_price) * quantity
            else:
                return # 포지션 타입과 청산 사이드가 맞지 않으면 종료

            cash_returned = self.invested_capital + raw_pnl
            self.balance += cash_returned

            exit_value = quantity * trade_price
            exit_commission = exit_value * (self.fee_pct / 100)
            self.balance -= exit_commission
            
            commission = exit_commission # 로그 기록용
            pnl = raw_pnl - self.entry_commission - exit_commission

            self.gross_profit += max(0, pnl)
            self.gross_loss += min(0, pnl)
            if pnl > 0: self.winning_trades += 1
            else: self.losing_trades += 1

            # 상태 변수 초기화
            self.entry_commission = 0.0
            self.position_size, self.position_avg_price, self.position_type, self.invested_capital = 0.0, 0.0, None, 0.0
            self.sl_price, self.tp_price = None, None
            self.highest_price_since_entry = 0.0
            self.lowest_price_since_entry = float('inf')


        # --- 3. 거래 로그 기록 ---
        log_balance = self.balance + self.invested_capital
        log = {
            "timestamp": timestamp, "side": side, "price": trade_price, "quantity": abs(quantity),
            "commission": commission, "pnl": pnl, "current_balance": log_balance,
            "reason": reason,
        }
        self.trade_logs.append(log)


    def _update_equity(self, timestamp, current_price: float):
        """
        롱/숏 포지션의 미실현 손익을 정확히 계산하여 총자산을 기록합니다.
        """
        unrealized_pnl = 0.0
        if self.position_type == 'long':
            unrealized_pnl = (current_price - self.position_avg_price) * self.position_size
        elif self.position_type == 'short':
            unrealized_pnl = (self.position_avg_price - current_price) * abs(self.position_size)

        equity = self.balance + self.invested_capital + unrealized_pnl
        
        unix_timestamp = int(timestamp.timestamp())
        self.equity_curve.append({'time': unix_timestamp, 'value': equity})


    def _calculate_summary_stats(self) -> Dict:
        """최종 성과 지표를 계산합니다."""
        if not self.equity_curve:
            return {}

        equity_df = pd.DataFrame(self.equity_curve).sort_values('time').set_index('time')
        equity_df.index = pd.to_datetime(equity_df.index, unit='s')
        
        # --- 기본 지표 계산 ---
        final_equity = equity_df['value'].iloc[-1]
        total_return_pct = ((final_equity - self.initial_capital) / self.initial_capital) * 100
        
        peak = equity_df['value'].expanding(min_periods=1).max()
        drawdown = (equity_df['value'] - peak) / peak
        mdd_pct = drawdown.min() * 100 if not drawdown.empty else 0.0
        
        drawdown_curve = (drawdown * 100).round(2)
        drawdown_curve_json = [
            {'time': int(idx.timestamp()), 'value': val}
            for idx, val in drawdown_curve.items()
        ]
        
        total_trades = self.winning_trades + self.losing_trades
        win_rate_pct = (self.winning_trades / total_trades) * 100 if total_trades > 0 else 0.0
        
        profit_factor = self.gross_profit / abs(self.gross_loss) if self.gross_loss != 0 else 0.0
        
        # --- 일간 수익률 기반 지표 계산 ---
        daily_returns = equity_df['value'].resample('D').last().pct_change().dropna()

        sharpe_ratio = 0.0
        cagr = 0.0
        sortino_ratio = 0.0

        if not daily_returns.empty:
            annualized_return = daily_returns.mean() * 365
            annualized_std = daily_returns.std() * np.sqrt(365)
            
            if annualized_std > 0:
                sharpe_ratio = annualized_return / annualized_std

            days = (equity_df.index[-1] - equity_df.index[0]).days
            if days > 30:
                years = days / 365.0
                cagr = ((final_equity / self.initial_capital) ** (1 / years) - 1) * 100

            downside_returns = daily_returns[daily_returns < 0]
            annualized_downside_std = downside_returns.std() * np.sqrt(365)
            if annualized_downside_std > 0:
                sortino_ratio = annualized_return / annualized_downside_std
        
        # Calmar Ratio
        mdd_abs = abs(mdd_pct)
        calmar_ratio = cagr / mdd_abs if mdd_abs > 0 else 0.0

        # Average Profit/Loss Ratio
        avg_profit = self.gross_profit / self.winning_trades if self.winning_trades > 0 else 0.0
        avg_loss = abs(self.gross_loss / self.losing_trades) if self.losing_trades > 0 else 0.0
        avg_profit_loss_ratio = avg_profit / avg_loss if avg_loss > 0 else 0.0

        # Ulcer Index
        ulcer_index = np.sqrt(np.sum(drawdown**2) / len(drawdown)) * 100 if not drawdown.empty else 0.0

        # Longest Flat Days
        peak_dates = equity_df[equity_df['value'] >= peak]
        longest_flat_duration = peak_dates.index.to_series().diff().max() if not peak_dates.empty else timedelta(0)
        longest_flat_days = longest_flat_duration.days

        # Average Holding Period
        avg_holding_period_seconds = self.total_holding_period.total_seconds() / total_trades if total_trades > 0 else 0.0
        avg_holding_period_days = avg_holding_period_seconds / (24 * 3600)

        # K-Ratio
        k_ratio = 0.0
        if not daily_returns.empty and len(daily_returns) > 1:
            log_equity = np.log(equity_df['value'])
            x = np.arange(len(log_equity))
            slope, intercept, r_value, p_value, std_err = linregress(x, log_equity)
            if std_err > 0:
                # 연율화된 기울기 / (표준오차 * 관측치 개수의 제곱근)
                # K-Ratio는 보통 연간 단위로 계산하므로, 일일 데이터의 경우 기울기에 252(거래일) 또는 365(전체일)를 곱해 연율화합니다.
                annual_slope = slope * 365
                k_ratio = (annual_slope / (std_err * np.sqrt(len(x)))) * (1 / np.sqrt(365))

        # 1. 항목별 점수 변환
        profitability_score = (profit_factor / 2.0) * 100 if profit_factor is not None else 0
        risk_adjusted_score = (sortino_ratio / 3.0) * 100 if sortino_ratio is not None else 0
        resilience_score = (calmar_ratio / 1.0) * 100 if calmar_ratio is not None else 0
        consistency_score = (k_ratio / 1.5) * 100 if k_ratio is not None else 0

        # 2. 가중 평균으로 최종 점수 계산
        backtest_score = (
            (profitability_score * 0.3) +
            (risk_adjusted_score * 0.3) +
            (resilience_score * 0.3) +
            (consistency_score * 0.1)
        )

        # 3. API 응답 및 툴팁에 사용할 상세 데이터 구조화
        score_factors = {
            "profitability": {"name": "수익성", "metric": "Profit Factor", "value": profit_factor, "target": 2.0, "score": profitability_score, "weight": 30},
            "riskAdjusted": {"name": "위험 조정 성과", "metric": "Sortino Ratio", "value": sortino_ratio, "target": 3.0, "score": risk_adjusted_score, "weight": 30},
            "resilience": {"name": "회복탄력성", "metric": "Calmar Ratio", "value": calmar_ratio, "target": 1.0, "score": resilience_score, "weight": 30},
            "consistency": {"name": "수익 안정성", "metric": "K-Ratio", "value": k_ratio, "target": 1.5, "score": consistency_score, "weight": 10}
        }

        return {
            "total_return_pct": round(total_return_pct, 2),
            "mdd_pct": round(mdd_pct, 2),
            "win_rate_pct": round(win_rate_pct, 2),
            "profit_factor": round(profit_factor, 2),
            "sharpe_ratio": round(sharpe_ratio, 2),
            "sortino_ratio": round(sortino_ratio, 2),
            "cagr_pct": round(cagr, 2),
            "total_trades": total_trades,
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "pnl_curve_json": self.equity_curve,
            "drawdown_curve_json": drawdown_curve_json,
            "calmar_ratio": round(calmar_ratio, 2),
            "avg_profit_loss_ratio": round(avg_profit_loss_ratio, 2),
            "ulcer_index": round(ulcer_index, 2),
            "longest_flat_days": longest_flat_days,
            "avg_holding_period_days": round(avg_holding_period_days, 2),
            "k_ratio": round(k_ratio, 2),
            "backtest_score": round(backtest_score, 2),
            "score_factors": score_factors
        }