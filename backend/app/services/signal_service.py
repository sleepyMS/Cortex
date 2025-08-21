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

logger.critical("<<<<< [SIGNAL SERVICE] 최신 버전 signal_service.py 로드 완료 >>>>>")


INDICATOR_KIND_MAP = {
    "STOCHASTIC": "stoch",
    "PARABOLICSAR": "psar",
    "KELTNERCHANNEL": "kc",
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
        요청된 기술적 지표와 관련된 모든 출력값을 계산하여 반환합니다.
        """
        df = await market_data_service.get_latest_data(
            db=db, ticker=request.ticker, timeframe=request.timeframe, limit=1000
        )
        if df.empty:
            return {}
        
        df.columns = df.columns.str.lower()

        # 1. 계산할 지표 목록 생성
        indicators_to_calc = []
        base_ohlcv_keys = {'open', 'high', 'low', 'close', 'volume'}
        for indicator in request.indicators:
            if indicator.indicator_key.lower() not in base_ohlcv_keys:
                kind = INDICATOR_KIND_MAP.get(indicator.indicator_key.upper(), indicator.indicator_key.lower())
                indicators_to_calc.append({"kind": kind, **indicator.values})
        
        # 2. 지표 계산
        if indicators_to_calc:
            df.ta.strategy(ta.Strategy(name="indicator_calc", ta=indicators_to_calc), append=True)

        # 3. 결과 포맷팅
        results = {}
        processed_columns = set()
        
        if 'time' not in df.columns or not pd.api.types.is_integer_dtype(df['time']):
             df['time'] = pd.to_datetime(df.get('time_dt', df.index)).astype('int64') // 10**9

        # ▼▼▼ [핵심 개선 로직] ▼▼▼
        # 요청된 각 지표에 대해, OUTPUT_PREFIX_MAP을 사용하여 모든 관련 컬럼을 찾아 결과에 추가합니다.
        for indicator_config in request.indicators:
            key_upper = indicator_config.indicator_key.upper()
            key_lower = indicator_config.indicator_key.lower()
            
            # OHLCV 기본값 직접 처리
            if key_lower in base_ohlcv_keys:
                if key_lower in df.columns:
                    series_data = df[[key_lower, 'time']].dropna()
                    results[key_lower] = [
                        schemas.IndicatorDataPoint(time=row['time'], value=row[key_lower])
                        for row in series_data.to_dict('records')
                    ]
                continue
            
            # 계산된 지표 처리
            known_prefixes = OUTPUT_PREFIX_MAP.get(key_upper, [])
            if not known_prefixes:
                continue

            for col_name in df.columns:
                if col_name in processed_columns:
                    continue
                
                # 컬럼 이름이 알려진 접두사 중 하나로 시작하는지 확인 (대소문자 무시)
                if any(col_name.upper().startswith(p + '_') or col_name.upper() == p for p in known_prefixes):
                    series_data = df[[col_name, 'time']].dropna()
                    results[col_name.lower()] = [
                        schemas.IndicatorDataPoint(time=row['time'], value=row[col_name])
                        for row in series_data.to_dict('records')
                    ]
                    processed_columns.add(col_name)
        
        return results

    def _get_indicator_column_name(
        self,
        df_columns: List[str],
        indicator_value: Union[schemas.IndicatorValue, float, int]
    ) -> Optional[Union[str, float, int]]:
        """
        IndicatorValue 객체로부터 DataFrame에 실제 생성된 소문자 컬럼 이름을 안정적으로 찾아 반환합니다.
        (개선된 버전)
        """

        if indicator_value is None:
            return None
        
        # 1. 숫자 값은 그대로 반환
        if isinstance(indicator_value, (int, float)):
            return indicator_value

        # 2. OHLCV 같은 기본 값 처리
        key_raw = indicator_value.indicator_key
        if key_raw.lower() in ['close', 'open', 'high', 'low', 'volume']:
            return key_raw.lower()

        # 3. `INDICATOR_KIND_MAP`을 사용하여 계산 시 사용된 실제 `kind`를 가져옴 (핵심 수정)
        # 예: 'STOCHASTIC' -> 'stoch'
        kind = INDICATOR_KIND_MAP.get(key_raw.upper(), key_raw.lower())

        params_str = "_".join(map(str, indicator_value.values.values()))
        output_key = indicator_value.outputs[0].lower() if indicator_value.outputs else ""

        # 4. `OUTPUT_PREFIX_MAP`을 기반으로 가능한 모든 접두사를 찾음
        # 예: 'ICHIMOKU' -> ['its', 'iks', 'isa', 'isb', 'ics']
        possible_prefixes = [p.lower() for p in OUTPUT_PREFIX_MAP.get(key_raw.upper(), [])]
        
        target_prefix = ""

        # 5. 사용자가 요청한 특정 output에 해당하는 접두사를 결정 (하드코딩 최소화)
        # 예: 'MACD'의 'histogram' output은 'macdh' 접두사를 가짐
        # 참고: 이 로직은 pandas-ta 라이브러리의 명명 규칙을 따릅니다.
        if kind == 'macd' and output_key in ['macd', 'histogram', 'signal']:
            prefix_map = {'macd': 'macd', 'histogram': 'macdh', 'signal': 'macds'}
            target_prefix = prefix_map.get(output_key, 'macd')
        elif kind == 'stoch' and output_key in ['k', 'd']:
             target_prefix = f"stoch{output_key}"
        elif kind == 'supertrend' and output_key in ['supertrend', 'direction']:
            prefix_map = {'supertrend': 'supert', 'direction': 'supertd'}
            target_prefix = prefix_map.get(output_key, 'supert')
        else:
            # 대부분의 지표는 첫 번째 접두사가 메인 값임
            if possible_prefixes:
                target_prefix = possible_prefixes[0]
            else:
                # 맵에 없는 간단한 지표 (예: rsi, ema 등)
                target_prefix = kind

        # 6. 최종 컬럼 이름을 조합하고 DataFrame 컬럼 목록에서 검색
        # 예: 'macdh' + '_' + '12_26_9' -> 'macdh_12_26_9'
        expected_col = f"{target_prefix}_{params_str}" if params_str else target_prefix

        # DataFrame의 모든 컬럼은 이미 소문자로 변환되었으므로, 직접 비교 가능
        if expected_col in df_columns:
            return expected_col
        
        # 만약 위에서 못찾았다면, 접두사로 시작하는 컬럼을 다시 한번 탐색 (더 유연한 방식)
        for col in df_columns:
            if col.startswith(f"{target_prefix}_"):
                 # 파라미터 순서가 다를 수 있음을 대비하여, 모든 파라미터가 포함되었는지 확인
                col_params = set(col.split('_')[1:])
                req_params = set(params_str.split('_'))
                if req_params.issubset(col_params):
                    return col

        logger.warning(f"신호 계산 실패: 지표 컬럼을 찾을 수 없습니다. 요청 정보: {indicator_value.model_dump()}, 예상 컬럼명: '{expected_col}'")
        return None

    def _parse_logic_block_to_series(self, df: pd.DataFrame, block: schemas.LogicBlock, depth=0) -> pd.Series:
        """
        단일 LogicBlock을 평가하여 boolean Series (True/False)를 반환하는 재귀 함수.
        (로깅 기능이 추가된 버전)
        """
        indent = "  " * depth
        logger.debug(f"{indent}블록 처리 시작 (ID: {block.id}, Type: {block.type}, Depth: {depth})")

        # 1. 부모 블록 자체의 조건을 먼저 계산합니다.
        # 이 부분은 자식(children)이 없는 단일 블록처럼 먼저 평가합니다.
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
            was_within = is_within.shift(1).fillna(False)
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
            upper_ind_val = schemas.IndicatorValue(**{**block.indicator.model_dump(), "outputs": ["upper"]})
            lower_ind_val = schemas.IndicatorValue(**{**block.indicator.model_dump(), "outputs": ["lower"]})
            upper_col = self._get_indicator_column_name(df.columns, upper_ind_val)
            lower_col = self._get_indicator_column_name(df.columns, lower_ind_val)
            if upper_col is None or lower_col is None: return pd.Series(False, index=df.index)
            series_upper = df.get(upper_col, pd.Series(np.inf, index=df.index))
            series_lower = df.get(lower_col, pd.Series(-np.inf, index=df.index))
            is_within = (close_series >= series_lower) & (close_series <= series_upper)
            was_within = is_within.shift(1).fillna(False)
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

        
        # --- [로그 추가 6] --- 부모 블록 자체의 조건 평가 결과 로깅
        parent_true_count = parent_series.sum() if parent_series is not None else 0
        logger.debug(f"{indent} -> 부모 블록 자체 조건 만족 횟수: {parent_true_count} / {len(df)}")

        # 2. 자식 블록이 있는지 확인하고, 그에 따라 최종 결과를 조합합니다.
        if block.children and len(block.children) > 0:
            # ▼▼▼ [새로운 디버깅 로그] 아래 4줄을 여기에 추가해주세요 ▼▼▼
            logger.debug(f"{indent}--- 객체 검사 시작 ---")
            logger.debug(f"{indent}블록 ID: {block.id}")
            logger.debug(f"{indent}블록의 실제 타입: {type(block)}")
            logger.debug(f"{indent}블록의 모든 속성(dict): {block.__dict__}")
            # ▲▲▲ 여기까지 추가 ▲▲▲

            logger.debug(f"{indent} -> 자식 블록 {len(block.children)}개 처리 시작 (Operator: {block.logic_operator})")
            children_series_list = [self._parse_logic_block_to_series(df, child, depth + 1) for child in block.children]
            
            all_series_in_group = [parent_series] + children_series_list
            
            op_func = np.logical_and if block.logic_operator == "AND" else np.logical_or
            final_series = reduce(op_func, all_series_in_group)
        else:
            final_series = parent_series

        # --- [로그 추가 7] --- 현재 블록의 최종 결과 로깅
        final_true_count = final_series.sum() if final_series is not None else 0
        logger.debug(f"{indent}블록 처리 완료 (ID: {block.id}): 최종 조건 만족 횟수: {final_true_count} / {len(df)}")
        
        return final_series.fillna(False)

    def _get_required_timeframes_and_indicators(self, request: schemas.SignalCalculationRequest) -> Dict[str, Any]:
        """전략 규칙을 재귀적으로 분석하여, '계산이 필요한' 모든 지표 목록을 안정적으로 추출합니다."""
        
        unique_indicators = set()
        
        def find_indicators_recursively(obj: Any):
            # --- [핵심 수정] --- 복잡한 Union(LogicBlock) 대신, 공통 부모 클래스(BaseLogicBlock)로 타입 체크
            if isinstance(obj, schemas.BaseLogicBlock):
                indicator_fields = ['operand_a', 'operand_b', 'main_line', 'signal_line', 'indicator']
                for field in indicator_fields:
                    if hasattr(obj, field):
                        find_indicators_recursively(getattr(obj, field))
                if obj.children:
                    for child in obj.children:
                        find_indicators_recursively(child)
            
            elif isinstance(obj, schemas.IndicatorValue):
                identifier = f"{obj.indicator_key}_{obj.timeframe}_{json.dumps(obj.values, sort_keys=True)}"
                unique_indicators.add(identifier)

        rules_sets = [request.long_entry_rules, request.long_exit_rules, request.short_entry_rules, request.short_exit_rules]
        for rules in rules_sets:
            if rules:
                for block in rules.blocks:
                    find_indicators_recursively(block)

        timeframes = set([request.timeframe])
        indicators_by_tf = {request.timeframe: {}}
        
        base_ohlcv_keys = {'open', 'high', 'low', 'close', 'volume'}

        for indicator_str in unique_indicators:
            key, tf, values_str = indicator_str.split('_', 2)
            
            if key.lower() in base_ohlcv_keys:
                continue
                
            values = json.loads(values_str)
            
            timeframes.add(tf)
            if tf not in indicators_by_tf:
                indicators_by_tf[tf] = {}
            
            kind = INDICATOR_KIND_MAP.get(key.upper(), key.lower())
            indicator_config = {"kind": kind, **values}
            
            config_identifier = json.dumps(indicator_config, sort_keys=True)
            if config_identifier not in indicators_by_tf[tf]:
                 indicators_by_tf[tf][config_identifier] = indicator_config

        for tf in indicators_by_tf:
            indicators_by_tf[tf] = list(indicators_by_tf[tf].values())

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

    async def generate_signals(self, db: AsyncSession, request: schemas.SignalCalculationRequest) -> schemas.SignalCalculationResponse:
        """다중 타임프레임을 고려하여 최종 신호 목록을 생성합니다."""
        # --- [로그 추가 1] --- 함수 시작 및 요청 정보 로깅
        logger.debug(f"--- 신호 생성 시작: Ticker={request.ticker}, Timeframe={request.timeframe} ---")
        logger.debug(f"요청된 규칙: long_entry_rules={'존재' if request.long_entry_rules else '없음'}, long_exit_rules={'존재' if request.long_exit_rules else '없음'}")

        configs = self._get_required_timeframes_and_indicators(request)
        df_merged = await self._get_resampled_dataframe(db, request.ticker, configs)
        
        # --- [로그 추가 2] --- 데이터프레임 상태 로깅
        if df_merged.empty:
            logger.warning("DB에서 데이터를 가져오지 못했거나 지표 계산 후 데이터프레임이 비어있습니다.")
            return schemas.SignalCalculationResponse(signals=[])
        
        logger.debug(f"데이터프레임 정보: {df_merged.shape[0]}개의 행, {df_merged.shape[1]}개의 열")
        logger.debug(f"데이터프레임 컬럼 목록: {df_merged.columns.tolist()}")
        logger.debug("데이터프레임 상위 5개 행:\n" + df_merged.head().to_string())
        logger.debug("데이터프레임 하위 5개 행:\n" + df_merged.tail().to_string())
        
        final_signals: List[schemas.SignalDataPoint] = []
        def process_rules(rules: Optional[schemas.PositionRules], signal_type: str):
            if not rules or not rules.blocks: return

            # --- [로그 추가 3] --- 어떤 규칙을 처리하는지 로깅
            logger.debug(f"--- '{signal_type}' 규칙 처리 시작 ---")
            
            block_results = [self._parse_logic_block_to_series(df_merged, block) for block in rules.blocks]
            op = all if rules.logic_operator == "AND" else any
            final_series = pd.DataFrame(block_results).transpose().apply(op, axis=1)

            # --- [로그 추가 4] --- 최종 조건 만족 횟수 로깅
            true_count = final_series.sum()
            logger.debug(f"'{signal_type}' 규칙의 최종 조건 만족 횟수: {true_count} / {len(df_merged)}")

            signal_points = df_merged[final_series]
            for _, row in signal_points.iterrows():
                final_signals.append(schemas.SignalDataPoint(time=int(row['time']), signal_type=signal_type))

        process_rules(request.long_entry_rules, "long_entry")
        process_rules(request.long_exit_rules, "long_exit")
        process_rules(request.short_entry_rules, "short_entry")
        process_rules(request.short_exit_rules, "short_exit")

        # --- [로그 추가 5] --- 최종 생성된 신호 개수 로깅
        logger.debug(f"--- 신호 생성 완료: 총 {len(final_signals)}개의 신호 생성됨 ---")
        
        return schemas.SignalCalculationResponse(signals=sorted(final_signals, key=lambda x: x.time))

signal_service = SignalService()