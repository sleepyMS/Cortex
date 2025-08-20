# file: backend/app/services/signal_service.py

import pandas as pd
import pandas_ta as ta
from typing import List, Dict, Any, Optional, Union
import json
import logging
import numpy as np
from functools import reduce

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from .. import schemas
from ..services.market_data_service import market_data_service

logger = logging.getLogger(__name__)

INDICATOR_KIND_MAP = { "STOCHASTIC": "stoch", "PARABOLICSAR": "psar", "KELTNERCHANNEL": "kc" }

class SignalService:
    """
    OHLCV 데이터와 전략 규칙을 기반으로 기술적 지표를 계산하고 매매 신호를 생성하는 서비스.
    """

    async def calculate_indicators(
        self,
        db: AsyncSession,
        request: schemas.IndicatorCalculationRequest
    ) -> Dict[str, List[schemas.IndicatorDataPoint]]:
        """
        요청된 기술적 지표만 정확히 계산하여 반환합니다.
        """
        df = await market_data_service.get_latest_data(
            db=db, ticker=request.ticker, timeframe=request.timeframe, limit=1000
        )
        if df.empty:
            return {}
        
        df.columns = df.columns.str.lower()

        # 1. 계산할 지표 목록만 추출 (기존과 동일)
        indicators_to_calc = []
        for indicator in request.indicators:
            kind = INDICATOR_KIND_MAP.get(indicator.indicator_key.upper(), indicator.indicator_key.lower())
            indicators_to_calc.append({"kind": kind, **indicator.values})
        
        # 2. 지표 계산
        if indicators_to_calc:
            df.ta.strategy(ta.Strategy(name="indicator_calc", ta=indicators_to_calc), append=True)
            df.columns = df.columns.str.lower()

        # 3. 결과 포맷팅
        results = {}
        if 'time' not in df.columns or not pd.api.types.is_integer_dtype(df['time']):
             df['time'] = pd.to_datetime(df.get('time_dt', df.index)).astype('int64') // 10**9

        # 모든 컬럼이 아닌, '계산된 지표 컬럼'만 결과에 포함
        # 원본 OHLCV 컬럼 목록
        original_cols = {'time', 'open', 'high', 'low', 'close', 'volume', 'time_dt'}
        
        # 순수하게 계산을 통해 추가된 지표 컬럼들만 필터링
        calculated_columns = [col for col in df.columns if col not in original_cols]

        for col_name in calculated_columns:
            series_data = df[[col_name, 'time']].dropna()
            results[col_name] = [
                schemas.IndicatorDataPoint(time=row['time'], value=row[col_name])
                for row in series_data.to_dict('records')
            ]
        
        # 만약 프론트엔드가 명시적으로 'Volume'을 요청했다면, 결과에 포함
        if any(ind.indicator_key == "Volume" for ind in request.indicators):
            if 'volume' in df.columns:
                series_data = df[['volume', 'time']].dropna()
                results['volume'] = [
                    schemas.IndicatorDataPoint(time=row['time'], value=row['volume'])
                    for row in series_data.to_dict('records')
                ]
        
        return results

    def _get_indicator_column_name(
        self,
        df_columns: List[str],
        indicator_value: Union[schemas.IndicatorValue, float, int]
    ) -> Optional[Union[str, float, int]]:
        """IndicatorValue 객체로부터 DataFrame에 실제 생성된 소문자 컬럼 이름을 찾아 반환합니다."""
        if isinstance(indicator_value, (int, float)):
            return indicator_value

        key = indicator_value.indicator_key.lower()
        if key in ['close', 'open', 'high', 'low', 'volume']:
            return key

        params = "_".join(map(str, indicator_value.values.values()))
        output = indicator_value.outputs[0].lower() if indicator_value.outputs else ""
        
        prefix_map = { "macd": {"macd": "macd", "histogram": "macdh", "signal": "macds"}, "bbands": {"lower": "bbl", "middle": "bbm", "upper": "bbu"}, "stoch": {"stochk": "stochk", "stochd": "stochd"}, "supertrend": {"supertrend": "supert", "direction": "supertd"}, "kc": {"lower": "kcl", "middle": "kcm", "upper": "kcu"}, }
        
        if key in prefix_map and output in prefix_map[key]:
            prefix = prefix_map[key][output]
            expected_col = f"{prefix}_{params}" if params else prefix
            if expected_col in df_columns: return expected_col

        expected_col = f"{key}_{params}" if params else key
        if expected_col in df_columns: return expected_col
        
        logger.warning(f"Could not find matching column for indicator: {indicator_value.model_dump()}. Expected: {expected_col}")
        return None

    def _parse_logic_block_to_series(self, df: pd.DataFrame, block: schemas.LogicBlock) -> pd.Series:
        """
        단일 LogicBlock을 평가하여 boolean Series (True/False)를 반환하는 재귀 함수.
        모든 규칙 타입에 대한 해석 로직을 포함합니다.
        """
        current_series = pd.Series(True, index=df.index)
        block_type = block.type
        
        if block_type == "comparison":
            op_a_name = self._get_indicator_column_name(df.columns, block.operand_a)
            op_b_name = self._get_indicator_column_name(df.columns, block.operand_b)
            if op_a_name is None or op_b_name is None: return pd.Series(False, index=df.index)
            series_a = df[op_a_name] if isinstance(op_a_name, str) else op_a_name
            series_b = df[op_b_name] if isinstance(op_b_name, str) else op_b_name
            op_map = {">": series_a > series_b, "<": series_a < series_b, "==": series_a == series_b, "!=": series_a != series_b}
            current_series = op_map.get(block.operator, pd.Series(False, index=df.index))

        elif block_type == "crossover":
            main_col = self._get_indicator_column_name(df.columns, block.main_line)
            signal_col = self._get_indicator_column_name(df.columns, block.signal_line)
            if main_col is None or signal_col is None: return pd.Series(False, index=df.index)
            series_main = df[main_col] if isinstance(main_col, str) else main_col
            series_signal = df[signal_col] if isinstance(signal_col, str) else signal_col
            current_series = ta.cross(series_main, series_signal, above=block.cross_direction == "above").fillna(False)

        elif block_type == "state":
            indicator_col = self._get_indicator_column_name(df.columns, block.indicator)
            if indicator_col is None: return pd.Series(False, index=df.index)
            indicator_series = df[indicator_col] if isinstance(indicator_col, str) else pd.Series(indicator_col, index=df.index)
            lower_bound = block.lower_bound if block.lower_bound is not None else -np.inf
            upper_bound = block.upper_bound if block.upper_bound is not None else np.inf
            is_within = (indicator_series >= lower_bound) & (indicator_series <= upper_bound)
            was_within = is_within.shift(1).fillna(False)
            if block.state_action == "within": current_series = is_within
            elif block.state_action == "enter": current_series = ~was_within & is_within
            elif block.state_action == "exit": current_series = was_within & ~is_within

        elif block_type == "trend_signal":
            params = "_".join(map(str, block.indicator.values.values()))
            direction_col = f"supertd_{params}"
            indicator_series = df.get(direction_col, pd.Series(0, index=df.index))
            if block.signal == "buy": current_series = indicator_series == 1
            elif block.signal == "sell": current_series = indicator_series == -1

        elif block_type == "channel":
            close_series = df['close']
            upper_ind_val = schemas.IndicatorValue(**{**block.indicator.model_dump(), "outputs": ["upper"]})
            lower_ind_val = schemas.IndicatorValue(**{**block.indicator.model_dump(), "outputs": ["lower"]})
            upper_col = self._get_indicator_column_name(df.columns, upper_ind_val)
            lower_col = self._get_indicator_column_name(df.columns, lower_ind_val)
            if upper_col is None or lower_col is None: return pd.Series(False, index=df.index)
            series_upper = df.get(upper_col, pd.Series(np.inf, index=df.index))
            series_lower = df.get(lower_col, pd.Series(-np.inf, index=df.index))
            is_within = (close_series >= series_lower) & (close_series <= series_upper)
            was_within = is_within.shift(1).fillna(False)
            if block.action == "within": current_series = is_within
            elif block.action == "enter": current_series = ~was_within & is_within
            elif block.action == "exit": current_series = was_within & ~is_within

        elif block_type == "divergence":
            base_ind_col = self._get_indicator_column_name(df.columns, block.indicator)
            if base_ind_col:
                divergence_col = f"{base_ind_col}_divergence"
                if divergence_col in df.columns:
                    div_series = df[divergence_col]
                    if block.divergence_type in ["bullish", "hidden_bullish"]: current_series = div_series > 0
                    elif block.divergence_type in ["bearish", "hidden_bearish"]: current_series = div_series < 0
        
        elif block_type == "pattern":
            pattern_col = f"cdl_{block.pattern_key.lower()}"
            if pattern_col in df.columns:
                pattern_series = df[pattern_col]
                if block.direction == "bullish": current_series = pattern_series > 0
                elif block.direction == "bearish": current_series = pattern_series < 0
                elif block.direction == "any": current_series = pattern_series != 0

        # 자식(children) 규칙 처리
        if block.children and len(block.children) > 0:
            children_series_list = [self._parse_logic_block_to_series(df, child) for child in block.children]
            op = reduce(np.logical_and, children_series_list) if block.logicOperator == "AND" else reduce(np.logical_or, children_series_list)
            # 현재 블록의 조건과 자식 블록들의 조건을 AND로 결합
            result_series = current_series & op
        else:
            result_series = current_series

        return result_series.fillna(False)

    def _get_required_timeframes_and_indicators(self, request: schemas.SignalCalculationRequest) -> Dict[str, Any]:
        """전략 규칙을 재귀적으로 분석하여, 필요한 모든 타임프레임과 지표 목록을 추출합니다."""
        timeframes = set([request.timeframe])
        indicators_by_tf = {request.timeframe: {}}
        rules_sets = [request.long_entry_rules, request.long_exit_rules, request.short_entry_rules, request.short_exit_rules]

        def recurse_blocks(blocks):
            for block in blocks:
                q = list(block.model_dump().values())
                while q:
                    item = q.pop(0)
                    if isinstance(item, dict):
                        if 'indicatorKey' in item and 'timeframe' in item and 'values' in item:
                            tf = item['timeframe']
                            timeframes.add(tf)
                            if tf not in indicators_by_tf: indicators_by_tf[tf] = {}
                            key = f"{item['indicatorKey']}_{json.dumps(item['values'], sort_keys=True)}"
                            if key not in indicators_by_tf[tf]:
                                kind = INDICATOR_KIND_MAP.get(item['indicatorKey'].upper(), item['indicatorKey'].lower())
                                indicators_by_tf[tf][key] = {"kind": kind, **item['values']}
                        else:
                            q.extend(item.values())
                    elif isinstance(item, list):
                        q.extend(item)
                if block.children:
                    recurse_blocks(block.children)
        
        for rules in rules_sets:
            if rules: recurse_blocks(rules.blocks)
        
        for tf in indicators_by_tf: indicators_by_tf[tf] = list(indicators_by_tf[tf].values())
        
        # 타임프레임 문자열을 분, 시간, 일 단위로 변환하여 정렬하기 위한 헬퍼
        def timeframe_to_minutes(tf_str):
            if 'm' in tf_str: return int(tf_str.replace('m', ''))
            if 'h' in tf_str: return int(tf_str.replace('h', '')) * 60
            if 'd' in tf_str: return int(tf_str.replace('d', '')) * 1440
            return float('inf')

        return {"timeframes": sorted(list(timeframes), key=timeframe_to_minutes), "indicators": indicators_by_tf}

    async def _get_resampled_dataframe(self, db: AsyncSession, ticker: str, configs: Dict[str, Any]) -> pd.DataFrame:
        """추출된 설정을 기반으로 모든 타임프레임의 데이터를 가져와 리샘플링하고 병합합니다."""
        base_tf = configs['timeframes'][0]
        
        base_df = await market_data_service.get_latest_data(db, ticker, base_tf, limit=1000)
        if base_df.empty: return base_df
        
        base_df['time_dt'] = pd.to_datetime(base_df['time'], unit='s', utc=True)
        base_df = base_df.set_index('time_dt')

        if configs['indicators'].get(base_tf):
            base_df.ta.strategy(ta.Strategy(name=f"strat_{base_tf}", ta=configs['indicators'][base_tf]), append=True)

        for tf in configs['timeframes'][1:]:
            df_higher_tf = await market_data_service.get_latest_data(db, ticker, tf, limit=1000)
            if df_higher_tf.empty: continue
            
            df_higher_tf['time_dt'] = pd.to_datetime(df_higher_tf['time'], unit='s', utc=True)
            df_higher_tf = df_higher_tf.set_index('time_dt')
            
            if configs['indicators'].get(tf):
                df_higher_tf.ta.strategy(ta.Strategy(name=f"strat_{tf}", ta=configs['indicators'][tf]), append=True)
            
            indicator_cols = [col for col in df_higher_tf.columns if col.lower() not in ['open', 'high', 'low', 'close', 'volume', 'time', 'time_dt']]
            if indicator_cols:
                resampled_indicators = df_higher_tf[indicator_cols].reindex(base_df.index, method='ffill')
                base_df = base_df.join(resampled_indicators)
        
        base_df = base_df.reset_index()
        base_df.columns = base_df.columns.str.lower()
        return base_df.dropna()

    async def generate_signals(self, db: Session, request: schemas.SignalCalculationRequest) -> schemas.SignalCalculationResponse:
        """다중 타임프레임을 고려하여 최종 신호 목록을 생성합니다."""
        configs = self._get_required_timeframes_and_indicators(request)
        df_merged = await self._get_resampled_dataframe(db, request.ticker, configs)
        if df_merged.empty: return schemas.SignalCalculationResponse(signals=[])
        
        final_signals: List[schemas.SignalDataPoint] = []
        def process_rules(rules: Optional[schemas.PositionRules], signal_type: str):
            if not rules or not rules.blocks: return
            block_results = [self._parse_logic_block_to_series(df_merged, block) for block in rules.blocks]
            op = all if rules.logic_operator == "AND" else any
            final_series = pd.DataFrame(block_results).transpose().apply(op, axis=1)
            signal_points = df_merged[final_series]
            for timestamp in signal_points['time']:
                final_signals.append(schemas.SignalDataPoint(time=int(timestamp), signal_type=signal_type))

        process_rules(request.long_entry_rules, "long_entry")
        process_rules(request.long_exit_rules, "long_exit")
        process_rules(request.short_entry_rules, "short_entry")
        process_rules(request.short_exit_rules, "short_exit")
        
        return schemas.SignalCalculationResponse(signals=sorted(final_signals, key=lambda x: x.time))

signal_service = SignalService()