# file: backend/app/engine/backtesting_engine.py

import pandas as pd
import pandas_ta as ta
import numpy as np
from typing import Dict, List, Tuple, Optional
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
                 execution_params: dict,
                 strategy_params: schemas.StrategyCreate):
        """
        [최종 완성 버전] 백테스팅 엔진을 초기화하고 필요한 모든 변수를 설정합니다.
        """
        # --- 1. 데이터 준비 ---
        self.data = ohlcv_df.join(signals_df)
        if not self.data.index.is_monotonic_increasing:
             self.data = self.data.sort_index()

        # --- 2. 파라미터 분리 및 설정 ---
        self.exec_params = execution_params
        strategy_dict = strategy_params.model_dump(by_alias=True)
        self.tpsl_logic = strategy_dict.get('tpslLogic') or {}
        
        # --- 3. ATR 기반 TP/SL을 위한 지표 사전 계산 ---
        if self.tpsl_logic and self.tpsl_logic.get('atrPeriod'):
            atr_period = self.tpsl_logic['atrPeriod']
            self.data.ta.atr(
                high=self.data['high'], 
                low=self.data['low'], 
                close=self.data['close'], 
                length=atr_period, 
                append=True
            )

        # --- 4. 핵심 파라미터 설정 ---
        self.initial_capital = self.exec_params.get('initial_capital', 10000.0)
        inner_params = self.exec_params.get('parameters', {})
        self.leverage = inner_params.get('leverage', 1.0)
        self.fee_pct = inner_params.get('fee', 0.04) / 100
        self.slippage_pct = inner_params.get('slippage', 0.01) / 100

        # --- 5. 시뮬레이션 상태 변수 초기화 ---
        self.balance = self.initial_capital
        self.position_size = 0.0      # 현재 보유 수량 (+: long, -: short)
        self.position_avg_price = 0.0 # 진입 평균 단가
        self.position_type = None     # 'long' 또는 'short'
        self.entry_price = 0.0        # TP/SL 계산을 위한 마지막 진입 가격
        self.invested_capital = 0.0   # 포지션에 투입된 원금을 추적할 변수
        self.sl_price = None
        self.tp_price = None

        # 진입 후 최고/최저가를 추적하기 위한 변수
        self.highest_price_since_entry = 0.0
        self.lowest_price_since_entry = float('inf')

        # --- 6. 결과 분석용 변수 초기화 ---
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

    def _calculate_initial_tp_sl(self, row: pd.Series) -> Tuple[Optional[float], Optional[float]]:
        """[신규 헬퍼] 포지션 진입 시점의 데이터를 기반으로 최초 TP/SL 가격을 계산합니다."""
        sl_price, tp_price = None, None
        
        atr_period = self.tpsl_logic.get('atrPeriod')
        atr_value = row.get(f'ATR_{atr_period}') if atr_period and f'ATR_{atr_period}' in row else None

        # --- SL 가격 계산 ---
        atr_sl_multiplier = self.tpsl_logic.get('atrStopLossMultiplier')
        stop_loss_pct = self.tpsl_logic.get('stopLossPct')
        
        if atr_sl_multiplier and atr_value:
            sl_price = self.entry_price - (atr_value * atr_sl_multiplier) if self.position_type == 'long' else self.entry_price + (atr_value * atr_sl_multiplier)
        elif stop_loss_pct:
            sl_price = self.entry_price * (1 - stop_loss_pct / 100) if self.position_type == 'long' else self.entry_price * (1 + stop_loss_pct / 100)

        # --- TP 가격 계산 ---
        atr_tp_multiplier = self.tpsl_logic.get('atrTakeProfitMultiplier')
        take_profit_pct = self.tpsl_logic.get('takeProfitPct')
        
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
        if not self.tpsl_logic.get('trailingStopEnabled'):
            return

        # 2-1. 고점/저점 갱신
        if self.position_type == 'long':
            self.highest_price_since_entry = max(self.highest_price_since_entry, row['high'])
        elif self.position_type == 'short':
            self.lowest_price_since_entry = min(self.lowest_price_since_entry, row['low'])
        
        # 2-2. 트레일링 스탑 발동 조건 확인 (수익률이 활성화 수익률 이상일 때)
        activation_pct = self.tpsl_logic.get('trailingStopActivationPct', 0)
        current_return_pct = ((self.highest_price_since_entry / self.entry_price - 1) * 100) if self.position_type == 'long' else ((self.entry_price / self.lowest_price_since_entry - 1) * 100)

        if current_return_pct < activation_pct:
            return # 아직 발동 조건 미충족

        # 2-3. 새로운 트레일링 스탑 가격 계산
        new_sl_price = None
        callback_pct = self.tpsl_logic.get('trailingStopCallbackPct')
        atr_sl_multiplier = self.tpsl_logic.get('atrStopLossMultiplier')
        atr_period = self.tpsl_logic.get('atrPeriod')

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
        [최종 수정 버전] 거래를 실행하고 모든 상태 변수를 업데이트합니다.
        포지션 진입/청산 시 현금 흐름을 정확하게 반영합니다.
        """
        # --- 1. 포지션 진입 로직 ---
        if is_entry:
            if self.position_size != 0: return

            trade_price = price * (1 + self.slippage_pct if side == 'buy' else 1 - self.slippage_pct)
            invest_amount = self.balance * self.leverage * 0.99
            quantity = invest_amount / trade_price
            
            commission = invest_amount * self.fee_pct
            if self.balance < commission: return

            self.balance -= commission

            # 포지션에 투입된 원금(비용)을 현금 잔고에서 반드시 차감
            position_cost = quantity * trade_price
            self.balance -= position_cost
            self.invested_capital = position_cost
            
            self.position_size = quantity if side == 'buy' else -quantity
            self.position_avg_price = trade_price
            self.entry_price = trade_price
            self.position_type = 'long' if side == 'buy' else 'short'

            pnl = None

            self.sl_price, self.tp_price = self._calculate_initial_tp_sl(self.data.loc[timestamp])
        
            if self.position_type == 'long':
                self.highest_price_since_entry = self.entry_price
            elif self.position_type == 'short':
                self.lowest_price_since_entry = self.entry_price

        # --- 2. 포지션 청산 로직 ---
        else: # is_entry == False
            if self.position_size == 0: return

            pnl = 0.0
            
            if side == 'sell' and self.position_type == 'long':
                trade_price = price * (1 - self.slippage_pct)
                quantity = self.position_size
                raw_pnl = (trade_price - self.position_avg_price) * quantity
                
                # 청산으로 회수된 총 현금 = 투입했던 원금 + 실현 손익
                cash_returned = self.invested_capital + raw_pnl
                self.balance += cash_returned
            
            elif side == 'buy' and self.position_type == 'short':
                trade_price = price * (1 + self.slippage_pct)
                quantity = abs(self.position_size)
                raw_pnl = (self.position_avg_price - trade_price) * quantity

                cash_returned = self.invested_capital + raw_pnl
                self.balance += cash_returned
            
            else:
                return

            exit_value = quantity * trade_price
            commission = exit_value * self.fee_pct
            self.balance -= commission
            pnl = raw_pnl - commission

            self.gross_profit += max(0, pnl)
            self.gross_loss += min(0, pnl)
            if pnl > 0: self.winning_trades += 1
            else: self.losing_trades += 1

            self.position_size, self.position_avg_price, self.position_type, self.invested_capital = 0.0, 0.0, None, 0.0

            self.sl_price, self.tp_price = None, None

            self.highest_price_since_entry = 0.0
            self.lowest_price_since_entry = float('inf')

        # --- 3. 거래 로그 기록 ---
        # 로그의 currentBalance는 총자산(현금 + 투자 중인 자산 가치)을 의미합니다.
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

        # 총자산 = 현재 보유 현금 + 투입된 원금 + 현재 미실현 손익
        equity = self.balance + self.invested_capital + unrealized_pnl
        
        # timestamp는 pandas의 Timestamp 객체이므로 .timestamp() 메서드를 사용하고 정수(int)로 변환합니다.
        unix_timestamp = int(timestamp.timestamp())
        self.equity_curve.append({'time': unix_timestamp, 'value': equity})


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

        sharpe_ratio = 0.0
        # 일별 수익률 데이터가 충분할 때만 계산 (예: 10개 이상)
        if not daily_returns.empty and len(daily_returns) > 10 and daily_returns.std() > 0:
            # 리스크 프리 이자율을 0으로 가정
            annualized_return = daily_returns.mean() * 365
            annualized_std = daily_returns.std() * np.sqrt(365)
            sharpe_ratio = annualized_return / annualized_std
        
        cagr = 0.0
        # 기간이 30일 미만이거나, 연수가 0일 경우 CAGR을 0으로 처리
        if not daily_returns.empty:
            days = (daily_returns.index[-1] - daily_returns.index[0]).days
            if days > 30: # 최소 한 달 이상의 데이터로만 계산
                years = days / 365.0
                if years > 0:
                    cagr = ((final_equity / self.initial_capital) ** (1 / years) - 1) * 100

        downside_returns = daily_returns[daily_returns < 0]
        downside_std = downside_returns.std()
        
        sortino_ratio = 0.0
        # 일별 수익률 데이터가 충분할 때만 계산 (예: 10개 이상) 
        if downside_std > 0 and len(daily_returns) > 2:
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
            "sharpe_ratio": round(sharpe_ratio, 2),
        }