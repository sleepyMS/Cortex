# file: backend/app/services/signal_service.py

import pandas as pd
import pandas_ta as ta
from typing import List, Dict, Any, Optional, Union, Tuple
import json
import logging
import numpy as np
from functools import reduce

from sqlalchemy.ext.asyncio import AsyncSession
from .. import schemas
# [중요] 비동기 세션 생성을 위한 임포트 재확인
from ..database import AsyncSessionLocal
from ..services.market_data_service import market_data_service

logger = logging.getLogger(__name__)

# ==============================================================================
# 상수 정의
# ==============================================================================

# [중요] 여러 메서드에서 공통으로 사용되는 핵심 키를 전역 상수로 정의하여 누락 방지
BASE_OHLCV_KEYS = {'open', 'high', 'low', 'close', 'volume'}

INDICATOR_KIND_MAP = {
    "STOCHASTIC": "stoch",
    "PARABOLICSAR": "psar",
    "KELTNERCHANNEL": "kc",
    "ICHIMOKU": "ichimoku",
}

OUTPUT_PREFIX_MAP = {
    "SMA": ["SMA"], "EMA": ["EMA"], "HMA": ["HMA"],
    "MACD": ["MACD", "MACDH", "MACDS"],
    "PARABOLICSAR": ["PSARL", "PSARS"],
    "SUPERTREND": ["SUPERT", "SUPERTD", "SUPERTL", "SUPERTS"],
    "ICHIMOKU": ["ITS", "IKS", "ISA", "ISB", "ICS"],
    "ADX": ["ADX", "DMP", "DMN"],
    "RSI": ["RSI"],
    "STOCHASTIC": ["STOCHK", "STOCHD"],
    "CCI": ["CCI"],
    "RVI": ["RVI", "RVIS"],
    "BBANDS": ["BBU", "BBM", "BBL", "BBB", "BBP"],
    "ATR": ["ATR"],
    "KELTNERCHANNEL": ["KCBE", "KCLE", "KCUE"],
    "OBV": ["OBV"],
    "VWAP": ["VWAP"],
}

def timeframe_to_minutes(tf_str: str) -> int:
    """타임프레임 문자열을 분 단위 정수로 변환합니다."""
    if 'm' in tf_str: return int(tf_str.replace('m', ''))
    if 'h' in tf_str: return int(tf_str.replace('h', '')) * 60
    if 'd' in tf_str: return int(tf_str.replace('d', '')) * 1440
    if 'w' in tf_str: return int(tf_str.replace('w', '')) * 10080
    if 'M' in tf_str: return int(tf_str.replace('M', '')) * 43200
    return float('inf')


class SignalService:
    """
    OHLCV 데이터와 전략 규칙을 기반으로 기술적 지표를 계산하고 매매 신호를 생성하는 서비스.
    최적화를 위한 순수 CPU 연산 메서드가 포함되어 있습니다.
    """

    # ==========================================================================
    # 1. Public Methods (API & Task Entry Points)
    # ==========================================================================

    async def calculate_indicators(
        self,
        db: AsyncSession,
        request: schemas.IndicatorCalculationRequest
    ) -> Dict[str, List[schemas.IndicatorDataPoint]]:
        """
        [UI용] 요청된 기술적 지표와 관련된 모든 출력값을 계산하여 반환합니다.
        (기존 로직 100% 유지)
        """
        df = await market_data_service.get_latest_data(
            db=db, ticker=request.ticker, timeframe=request.timeframe, limit=500
        )
        if df.empty:
            return {}
        
        df.columns = df.columns.str.lower()

        # UI 요청에 맞게 지표 계산
        indicators_to_calc = []
        for indicator in request.indicators:
            # [수정] 전역 상수 BASE_OHLCV_KEYS 사용으로 안전성 확보
            if indicator.indicator_key.lower() not in BASE_OHLCV_KEYS:
                kind = INDICATOR_KIND_MAP.get(indicator.indicator_key.upper(), indicator.indicator_key.lower())
                indicators_to_calc.append({"kind": kind, **indicator.values})
        
        if indicators_to_calc:
            df.ta.strategy(ta.Strategy(name="indicator_calc", ta=indicators_to_calc), append=True)

        # 결과 포맷팅
        results = {}
        processed_columns = set()
        df = df.reset_index()
        df['time'] = (df['time'].astype('int64') // 10**9)

        for indicator_config in request.indicators:
            key_upper = indicator_config.indicator_key.upper()
            key_lower = indicator_config.indicator_key.lower()
            
            if key_lower in BASE_OHLCV_KEYS:
                if key_lower in df.columns:
                    series_data = df[[key_lower, 'time']].dropna()
                    results[key_lower] = [
                        schemas.IndicatorDataPoint(time=row['time'], value=row[key_lower])
                        for row in series_data.to_dict('records')
                    ]
                continue
            
            known_prefixes = OUTPUT_PREFIX_MAP.get(key_upper, [])
            if not known_prefixes: continue

            for col_name in df.columns:
                if col_name in processed_columns: continue
                is_supert_col = col_name.upper().startswith('SUPERT_')
                if any(col_name.upper().startswith(p + '_') or col_name.upper() == p for p in known_prefixes):
                    series_data = df[[col_name, 'time']]
                    results[col_name.lower()] = [
                        schemas.IndicatorDataPoint(
                            time=row['time'],
                            value=(
                                None if is_supert_col and row[col_name] == 0 else
                                None if row[col_name] is None or np.isnan(row[col_name]) or np.isinf(row[col_name])
                                else row[col_name]
                            )
                        )
                        for row in series_data.to_dict('records')
                    ]
                    processed_columns.add(col_name)
        return results

    async def generate_signals(
        self, request: Union[schemas.SignalCalculationRequest, schemas.StrategyCreate]
    ) -> Tuple[pd.DataFrame, str]:
        """
        [ASYNC/I-O Bound] 기존의 단일 백테스트용 진입점입니다.
        DB에서 데이터를 로드하고 신호를 생성하는 전체 과정을 담당합니다.
        """
        ticker = request.target_coins[0].ticker if isinstance(request, schemas.StrategyCreate) and request.target_coins else getattr(request, 'ticker', "BTCUSDT")
        base_timeframe = getattr(request, 'timeframe', '1h')

        # [확인] AsyncSessionLocal을 사용하여 독립적인 DB 세션 생성
        async with AsyncSessionLocal() as db:
            configs = self._get_required_timeframes_and_indicators(request, base_timeframe=base_timeframe)
            # _get_resampled_dataframe 내부에서 DB 로드 및 지표 계산 수행
            df_merged, calculation_tf = await self._get_resampled_dataframe(db, ticker, configs)

        if df_merged.empty:
            logger.warning(f"{ticker} 시세 데이터를 가져오지 못했습니다.")
            return pd.DataFrame(columns=['signal']), '1h'

        # [핵심] 계산된 데이터프레임을 넘겨 순수 로직 평가만 수행 (공통 메서드 사용)
        return self._compute_signals_on_dataframe(df_merged, request), calculation_tf

    def generate_signals_from_dataframe(
        self,
        base_df: pd.DataFrame,
        strategy_snapshot: schemas.StrategyCreate,
        timeframe: str = '1h'
    ) -> pd.DataFrame:
        """
        [SYNC/CPU-Bound] 최적화 루프용 신규 메서드.
        """
        # 1. 원본 데이터 보존을 위해 복사
        df = base_df.copy()

        # [핵심 수정] DatetimeIndex를 'time' 컬럼(Unix Timestamp)으로 변환
        # MarketDataService는 DatetimeIndex를 반환하므로, 이를 다시 컬럼으로 만들어줘야 합니다.
        if 'time' not in df.columns and isinstance(df.index, pd.DatetimeIndex):
             df = df.reset_index()
             # 컬럼명이 'index'나 다른 이름일 수 있으므로 확인 후 'time'으로 통일
             if 'index' in df.columns:
                 df = df.rename(columns={'index': 'time'})
             
             # Unix Timestamp(초 단위)로 변환
             if 'time' in df.columns:
                 df['time'] = df['time'].astype('int64') // 10**9

        # 2. 전략에서 필요한 지표 설정 추출
        configs = self._get_required_timeframes_and_indicators(strategy_snapshot, base_timeframe=timeframe)
        
        # 3. 기본 타임프레임 지표 계산 (인메모리)
        base_indicators = configs['indicators'].get(timeframe, [])
        self._apply_indicators(df, base_indicators)

        # 4. 로직 평가 및 신호 생성
        return self._compute_signals_on_dataframe(df, strategy_snapshot)

    # ==========================================================================
    # 2. Core Logic Methods (Internal, Pure Functional, Shared)
    # ==========================================================================

    def _apply_indicators(self, df: pd.DataFrame, indicators: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        [Helper] DataFrame에 지표를 계산하여 컬럼으로 추가합니다.
        기존 _get_resampled_dataframe에 있던 지표 계산 로직을 완벽하게 이곳으로 옮겨
        백테스트와 최적화가 동일한 지표 계산 방식을 사용하도록 보장합니다.
        """
        if df.empty or not indicators:
            return df

        ichimoku_config = None
        kc_config = None
        other_indicators = []
        
        for indicator in indicators:
            kind = indicator.get("kind")
            if kind == "ichimoku": ichimoku_config = indicator
            elif kind == "kc": kc_config = indicator
            else: other_indicators.append(indicator)

        # 1. 일목균형표 직접 계산 (기존 로직 유지)
        if ichimoku_config:
            params = {k: v for k, v in ichimoku_config.items() if k != 'kind'}
            df.ta.ichimoku(append=True, **params)
        
        # 2. 켈트너 채널 직접 계산 (기존 로직 유지)
        if kc_config:
            params = {k: v for k, v in kc_config.items() if k != 'kind'}
            if 'atr_length' in params: params['atr'] = params.pop('atr_length')
            df.ta.kc(append=True, **params)

        # 3. 기타 지표 일괄 계산 (기존 로직 유지)
        if other_indicators:
            df.ta.strategy(ta.Strategy(name="batch_calc", ta=other_indicators), append=True)
            
        return df

    def _compute_signals_on_dataframe(
        self,
        df: pd.DataFrame,
        rules_source: Union[schemas.SignalCalculationRequest, schemas.StrategyCreate]
    ) -> pd.DataFrame:
        """
        [Helper] 준비된 DataFrame과 규칙을 받아 최종 매매 신호를 계산합니다.
        기존 generate_signals의 하단부 로직을 그대로 옮겨왔습니다.
        """
        final_signals: List[schemas.SignalDataPoint] = []

        def process_rules(rules: Optional[schemas.PositionRules], signal_type: str):
            if not rules or not rules.blocks: return
            # _parse_logic_block_to_series는 기존과 100% 동일하게 동작함
            block_results = [self._parse_logic_block_to_series(df, block) for block in rules.blocks]
            op = any if rules.logic_operator == "OR" else all
            final_series = pd.DataFrame(block_results).transpose().apply(op, axis=1)
            signal_points = df[final_series]
            for _, row in signal_points.iterrows():
                final_signals.append(schemas.SignalDataPoint(time=int(row['time']), signal_type=signal_type))

        process_rules(rules_source.long_entry_rules, "long_entry")
        process_rules(rules_source.long_exit_rules, "long_exit")
        process_rules(rules_source.short_entry_rules, "short_entry")
        process_rules(rules_source.short_exit_rules, "short_exit")
        
        if not final_signals:
            return pd.DataFrame(columns=['signal'])

        signals_df = pd.DataFrame([s.model_dump() for s in final_signals])
        signals_df['time_dt'] = pd.to_datetime(signals_df['time'], unit='s', utc=True)
        signals_df = signals_df.set_index('time_dt').sort_index()
        signals_df = signals_df.rename(columns={'signal_type': 'signal'})
        
        return signals_df[['signal']]

    def _get_indicator_column_name(
    self,
    df_columns: List[str],
    indicator_value: Union[schemas.IndicatorValue, float, int]
    ) -> Optional[Union[str, float, int]]:
        """
        [Refactored] 데이터프레임에서 지표 컬럼명을 찾습니다.
        pandas_ta의 컬럼 명명 규칙(파라미터 순서, float 포맷팅 등)을 명시적으로 처리합니다.
        """
        if indicator_value is None: return None
        if isinstance(indicator_value, (int, float)): return indicator_value

        key_raw = indicator_value.indicator_key
        # [확인] BASE_OHLCV_KEYS 전역 상수 사용
        if key_raw.lower() in BASE_OHLCV_KEYS: return key_raw.lower()

        kind = INDICATOR_KIND_MAP.get(key_raw.upper(), key_raw.lower())
        values = indicator_value.values
        output_key = indicator_value.outputs[0].lower() if indicator_value.outputs else ""
        params_str, target_prefix = "", ""

        # --- Indicator Specific Naming Logic ---
        
        if kind == 'macd':
            # MACD_12_26_9
            fast = values.get('fast', 12)
            slow = values.get('slow', 26)
            signal = values.get('signal', 9)
            params_str = f"{fast}_{slow}_{signal}"
            
            prefix_map = {
                'macd': 'macd', 'histogram': 'macdh', 'signal': 'macds',
                'macdh': 'macdh', 'macds': 'macds' 
            }
            target_prefix = prefix_map.get(output_key, 'macd')

        elif kind == 'stoch':
            # STOCHk_14_3_3
            k = values.get('k', 14)
            d = values.get('d', 3)
            smooth_k = values.get('smooth_k', 3)
            params_str = f"{k}_{d}_{smooth_k}"
            
            if output_key in ['k', 'stochk', 'k_line']: target_prefix = "stochk"
            elif output_key in ['d', 'stochd', 'd_line']: target_prefix = "stochd"
            else: target_prefix = "stochk"

        elif kind == 'supertrend':
            # SUPERT_7_3.0
            length = values.get('length', 7)
            multiplier = values.get('multiplier', 3.0)
            params_str = f"{length}_{float(multiplier)}"
            
            prefix_map = {
                'supertrend': 'supert', 'direction': 'supertd', 'long': 'supertl', 'short': 'superts',
                'supertd': 'supertd', 'supertl': 'supertl', 'superts': 'superts'
            }
            target_prefix = prefix_map.get(output_key, 'supert')

        elif kind == 'ichimoku':
            # Ichimoku is complex, usually no params in suffix for some cols, or specific ones
            # pandas_ta: ISA_9, ISB_26, ITS_9, IKS_26, ICS_26
            tenkan = values.get('tenkan', 9)
            kijun = values.get('kijun', 26)
            chikou = values.get('chikou', 26)
            
            if output_key == 'tenkan_sen': target_prefix, params_str = 'its', str(tenkan)
            elif output_key == 'kijun_sen': target_prefix, params_str = 'iks', str(kijun)
            elif output_key in ['span_a', 'upper']: target_prefix, params_str = 'isa', str(tenkan)
            elif output_key in ['span_b', 'lower']: target_prefix, params_str = 'isb', str(kijun)
            elif output_key == 'lagging': target_prefix, params_str = 'ics', str(chikou)
            else: target_prefix, params_str = 'its', str(tenkan)

        elif kind == 'kc':
            # KCLe_20_2.0
            length = values.get('length', 20)
            scalar = values.get('scalar', 2.0)
            params_str = f"{length}_{float(scalar)}"
            target_prefix = {'upper': 'kcue', 'middle': 'kcbe', 'lower': 'kcle'}.get(output_key, 'kcbe')

        elif kind == 'bbands':
            # BBU_5_2.0
            length = values.get('length', 5)
            std = values.get('std', 2.0)
            params_str = f"{length}_{float(std)}" 
            target_prefix = {'upper': 'bbu', 'middle': 'bbm', 'lower': 'bbl', 'width': 'bbb', 'percent': 'bbp'}.get(output_key, 'bbu')

        elif kind == 'cci':
            # CCI_14_0.015
            length = values.get('length', 14)
            c = values.get('c', 0.015)
            params_str = f"{length}_{c}" # c is usually float 0.015
            target_prefix = "cci"

        elif kind == 'atr':
            # ATRr_14 (default)
            length = values.get('length', 14)
            params_str = str(length)
            target_prefix = "atrr" # Default to ATRr

        elif kind == 'psar':
            # PSARl_0.02_0.2
            af0 = values.get('af0', 0.02)
            max_af = values.get('max_af', 0.2)
            # pandas_ta naming might vary, but usually af0_max_af
            params_str = f"{af0}_{max_af}"
            target_prefix = {'long': 'psarl', 'short': 'psars', 'af': 'psaraf', 'r': 'psarr'}.get(output_key, 'psarl')

        elif kind == 'sma':
            length = values.get('length', 10)
            params_str = str(length)
            target_prefix = "sma"
            
        elif kind == 'ema':
            length = values.get('length', 10)
            params_str = str(length)
            target_prefix = "ema"
            
        elif kind == 'hma':
            length = values.get('length', 10)
            params_str = str(length)
            target_prefix = "hma"

        elif kind == 'rsi':
            length = values.get('length', 14)
            params_str = str(length)
            target_prefix = "rsi"

        elif kind == 'adx':
            length = values.get('length', 14)
            params_str = str(length)
            target_prefix = {'adx': 'adx', 'dmp': 'dmp', 'dmn': 'dmn'}.get(output_key, 'adx')
            
        elif kind == 'obv':
            params_str = ""
            target_prefix = "obv"
            
        elif kind == 'vwap':
            params_str = ""
            target_prefix = "vwap"

        else:
            # Fallback for unknown indicators
            possible_prefixes = [p.lower() for p in OUTPUT_PREFIX_MAP.get(key_raw.upper(), [])]
            if possible_prefixes:
                found = False
                for p in possible_prefixes:
                    if output_key and p.endswith(output_key):
                        target_prefix, found = p, True
                        break
                if not found: target_prefix = possible_prefixes[0]
            else:
                target_prefix = kind
            if values: params_str = "_".join([f"{v}" for k, v in sorted(values.items())])

        expected_col_base = f"{target_prefix}_{params_str}".lower() if params_str else target_prefix.lower()
        
        # Exact match attempt
        for col in df_columns:
            if col.lower() == expected_col_base: return col
            
        # Fallback: Try matching without specific float formatting if failed (e.g. 0.015 vs 0.0150)
        # or partial match if strict match fails (risky but helpful)
        
        return None

    def _parse_logic_block_to_series(self, df: pd.DataFrame, block: schemas.LogicBlock, depth=0) -> pd.Series:
        """
        단일 LogicBlock을 평가하여 boolean Series를 반환합니다.
        """
        parent_series = pd.Series(True, index=df.index)
        block_type = block.type
        
        if block_type == "comparison":
            op_a_name = self._get_indicator_column_name(df.columns, block.operand_a)
            op_b_name = self._get_indicator_column_name(df.columns, block.operand_b)
            if op_a_name is None or op_b_name is None: return pd.Series(False, index=df.index)
            series_a = df[op_a_name] if isinstance(op_a_name, str) else pd.Series(op_a_name, index=df.index)
            series_b = df[op_b_name] if isinstance(op_b_name, str) else pd.Series(op_b_name, index=df.index)
            op_map = {">": series_a > series_b, "<": series_a < series_b, "==": series_a == series_b, "!=": series_a != series_b}
            parent_series = op_map.get(block.operator, pd.Series(False, index=df.index))

        elif block_type == "crossover":
            main_col = self._get_indicator_column_name(df.columns, block.main_line)
            signal_col = self._get_indicator_column_name(df.columns, block.signal_line)
            if main_col is None or signal_col is None: return pd.Series(False, index=df.index)
            series_main = df[main_col] if isinstance(main_col, str) else pd.Series(main_col, index=df.index)
            series_signal = df[signal_col] if isinstance(signal_col, str) else pd.Series(signal_col, index=df.index)
            parent_series = ta.cross(series_main, series_signal, above=block.cross_direction == "above").fillna(False)

        elif block_type == "state":
            indicator_col = self._get_indicator_column_name(df.columns, block.indicator)
            if indicator_col is None: return pd.Series(False, index=df.index)
            indicator_series = df[indicator_col] if isinstance(indicator_col, str) else pd.Series(indicator_col, index=df.index)
            lower_bound = block.lower_bound if block.lower_bound is not None else -np.inf
            upper_bound = block.upper_bound if block.upper_bound is not None else np.inf
            is_within = (indicator_series >= lower_bound) & (indicator_series <= upper_bound)
            was_within = is_within.shift(1).fillna(False).infer_objects(copy=False)
            if block.state_action == "within": parent_series = is_within
            elif block.state_action == "enter": parent_series = ~was_within & is_within
            elif block.state_action == "exit": parent_series = was_within & ~is_within

        elif block_type == "trend_signal":
            params = "_".join(map(str, block.indicator.values.values()))
            direction_col = f"supertd_{params}"
            indicator_series = df.get(direction_col, pd.Series(0, index=df.index))
            if block.signal == "buy": parent_series = indicator_series == 1
            elif block.signal == "sell": parent_series = indicator_series == -1

        elif block_type == "channel":
            close_series = df['close']
            indicator = block.indicator
            is_ichimoku = indicator and indicator.indicator_key == 'Ichimoku'
            upper_col, lower_col = None, None

            if is_ichimoku:
                tenkan = indicator.values.get('tenkan', 9)
                kijun = indicator.values.get('kijun', 26)
                upper_col_name = f"isa_{tenkan}"
                lower_col_name = f"isb_{kijun}"
                if upper_col_name in df.columns: upper_col = upper_col_name
                if lower_col_name in df.columns: lower_col = lower_col_name
            else:
                # Channel Zone에 따른 상/하단 경계 동적 설정
                # 기본값: 전체 채널 (upper ~ lower)
                upper_key = "upper"
                lower_key = "lower"

                if block.channel_zone == "upper":     # 상단 채널: Upper ~ Middle
                    upper_key = "upper"
                    lower_key = "middle"
                elif block.channel_zone == "lower":   # 하단 채널: Middle ~ Lower
                    upper_key = "middle"
                    lower_key = "lower"
                
                # 설정된 키로 컬럼 찾기
                upper_ind_val = schemas.IndicatorValue(**{**indicator.model_dump(), "outputs": [upper_key]})
                lower_ind_val = schemas.IndicatorValue(**{**indicator.model_dump(), "outputs": [lower_key]})
                upper_col = self._get_indicator_column_name(df.columns, upper_ind_val)
                lower_col = self._get_indicator_column_name(df.columns, lower_ind_val)
            
            if upper_col is None or lower_col is None: return pd.Series(False, index=df.index)

            series_upper_raw = df[upper_col]
            series_lower_raw = df[lower_col]

            if is_ichimoku:
                series_upper = pd.concat([series_upper_raw, series_lower_raw], axis=1).max(axis=1)
                series_lower = pd.concat([series_upper_raw, series_lower_raw], axis=1).min(axis=1)
            else:
                series_upper = series_upper_raw
                series_lower = series_lower_raw
                
            is_within = (close_series >= series_lower) & (close_series <= series_upper)
            was_within = is_within.shift(1).fillna(False).infer_objects(copy=False)
            
            if block.action == "within": parent_series = is_within
            elif block.action == "enter": parent_series = ~was_within & is_within
            elif block.action == "exit": parent_series = was_within & ~is_within

        elif block_type == "divergence":
            base_ind_col = self._get_indicator_column_name(df.columns, block.indicator)
            if base_ind_col:
                divergence_col = f"{base_ind_col}_divergence"
                if divergence_col in df.columns:
                    div_series = df[divergence_col]
                    if block.divergence_type in ["bullish", "hidden_bullish"]: parent_series = div_series > 0
                    elif block.divergence_type in ["bearish", "hidden_bearish"]: parent_series = div_series < 0
        
        elif block_type == "pattern":
            pattern_col = f"cdl_{block.pattern_key.lower()}"
            if pattern_col in df.columns:
                pattern_series = df[pattern_col]
                if block.direction == "bullish": parent_series = pattern_series > 0
                elif block.direction == "bearish": parent_series = pattern_series < 0
                elif block.direction == "any": parent_series = pattern_series != 0

        if block.children and len(block.children) > 0:
            children_series_list = [self._parse_logic_block_to_series(df, child, depth + 1) for child in block.children]
            all_series_in_group = [parent_series] + children_series_list
            op_func = np.logical_and if block.logic_operator == "AND" else np.logical_or
            final_series = reduce(op_func, all_series_in_group)
        else:
            final_series = parent_series
        
        return final_series.fillna(False)

    def _get_required_timeframes_and_indicators(self, request: Union[schemas.SignalCalculationRequest, schemas.StrategyCreate], base_timeframe: str) -> Dict[str, Any]:
        """[기존 로직 100% 유지] 전략 규칙에서 필요한 타임프레임과 지표 추출"""
        unique_indicators = set()
        def find_indicators_recursively(obj: Any):
            if isinstance(obj, schemas.BaseLogicBlock):
                for field in ['operand_a', 'operand_b', 'main_line', 'signal_line', 'indicator']:
                    if hasattr(obj, field): find_indicators_recursively(getattr(obj, field))
                if obj.children:
                    for child in obj.children: find_indicators_recursively(child)
            elif isinstance(obj, schemas.IndicatorValue):
                tf = obj.timeframe if obj.timeframe else base_timeframe
                unique_indicators.add(f"{obj.indicator_key}|{tf}|{json.dumps(obj.values, sort_keys=True)}")

        for rules in [request.long_entry_rules, request.long_exit_rules, request.short_entry_rules, request.short_exit_rules]:
            if rules:
                for block in rules.blocks: find_indicators_recursively(block)

        indicators_by_tf = {base_timeframe: {}}
        timeframes = {base_timeframe}
        
        for indicator_str in unique_indicators:
            key, tf, values_str = indicator_str.split('|', 2)
            if key.lower() in BASE_OHLCV_KEYS: continue
            values = json.loads(values_str)
            timeframes.add(tf)
            if tf not in indicators_by_tf: indicators_by_tf[tf] = {}
            kind = INDICATOR_KIND_MAP.get(key.upper(), key.lower())
            config = {"kind": kind, **values}
            config_id = json.dumps(config, sort_keys=True)
            if config_id not in indicators_by_tf[tf]: indicators_by_tf[tf][config_id] = config

        for tf in indicators_by_tf: indicators_by_tf[tf] = list(indicators_by_tf[tf].values())
        return {"timeframes": sorted(list(timeframes), key=timeframe_to_minutes), "indicators": indicators_by_tf}
    
    def _get_calculation_base_timeframe(self, required_timeframes: List[str]) -> str:
        return min(required_timeframes, key=timeframe_to_minutes) if required_timeframes else '1h'

    async def _get_resampled_dataframe(self, db: AsyncSession, ticker: str, configs: Dict[str, Any]) -> Tuple[pd.DataFrame, str]:
        """
        [기존 로직 유지 + 리팩토링 적용] DB에서 데이터를 로드하고 리샘플링합니다.
        내부 지표 계산 로직은 _apply_indicators로 위임하여 중복을 제거했습니다.
        """
        all_timeframes = configs['timeframes']
        if not all_timeframes: return pd.DataFrame(), '1h'

        calc_base_tf = self._get_calculation_base_timeframe(all_timeframes)
        base_df = await market_data_service.get_latest_data(db, ticker, calc_base_tf, limit=2000)
        if base_df.empty: return pd.DataFrame(), calc_base_tf
        
        # [중요] 기존의 인라인 지표 계산 로직을 대체하지만, 
        # _apply_indicators가 완전히 동일한 동작을 보장하므로 안전합니다.
        self._apply_indicators(base_df, configs['indicators'].get(calc_base_tf, []))

        for tf in all_timeframes:
            if tf == calc_base_tf: continue
            df_higher = await market_data_service.get_latest_data(db, ticker, tf, limit=2000)
            if df_higher.empty: continue
            
            self._apply_indicators(df_higher, configs['indicators'].get(tf, []))
            
            indicator_cols = [c for c in df_higher.columns if c.lower() not in ['open', 'high', 'low', 'close', 'volume']]
            if indicator_cols:
                resampled = df_higher[indicator_cols].reindex(base_df.index, method='ffill')
                resampled = resampled.rename(columns={col: f"{col}_{tf}" for col in indicator_cols})
                base_df = base_df.join(resampled)
        
        base_df = base_df.reset_index()
        base_df.columns = base_df.columns.str.lower()
        base_df['time'] = (base_df['time'].astype('int64') // 10**9)
        return base_df.dropna(subset=['time', 'open', 'high', 'low', 'close', 'volume']), calc_base_tf

signal_service = SignalService()