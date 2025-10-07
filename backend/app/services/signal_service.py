# file: backend/app/services/signal_service.py

import pandas as pd
import pandas_ta as ta
from typing import List, Dict, Any, Optional, Union, Tuple
import json
import logging
import numpy as np
from functools import reduce

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from .. import schemas
from ..database import AsyncSessionLocal

from ..services.market_data_service import market_data_service

logger = logging.getLogger(__name__)

logger.critical("<<<<< [SIGNAL SERVICE] 최신 버전 signal_service.py 로드 완료 >>>>>")


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
            db=db, ticker=request.ticker, timeframe=request.timeframe, limit=500
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
        
        df = df.reset_index()
        df['time'] = (df['time'].astype('int64') // 10**9)

        for indicator_config in request.indicators:
            key_upper = indicator_config.indicator_key.upper()
            key_lower = indicator_config.indicator_key.lower()
            
            if key_lower in base_ohlcv_keys:
                if key_lower in df.columns:
                    series_data = df[[key_lower, 'time']].dropna()
                    results[key_lower] = [
                        schemas.IndicatorDataPoint(time=row['time'], value=row[key_lower])
                        for row in series_data.to_dict('records')
                    ]
                continue
            
            known_prefixes = OUTPUT_PREFIX_MAP.get(key_upper, [])
            if not known_prefixes:
                continue

            for col_name in df.columns:
                if col_name in processed_columns:
                    continue
                
                is_supert_col = col_name.upper().startswith('SUPERT_')
                
                if any(col_name.upper().startswith(p + '_') or col_name.upper() == p for p in known_prefixes):
                    series_data = df[[col_name, 'time']]
                    results[col_name.lower()] = [
                        schemas.IndicatorDataPoint(
                            time=row['time'],
                            value=(
                                # 슈퍼트렌드 컬럼이고 값이 0이면 None으로, 아니면 기존 로직으로 처리
                                None if is_supert_col and row[col_name] == 0 else
                                None if row[col_name] is None or np.isnan(row[col_name]) or np.isinf(row[col_name])
                                else row[col_name]
                            )
                        )
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
        [최종 완성 버전] 모든 복합 지표의 고유한 이름 규칙을 처리하여 컬럼 이름을 유연하게 찾아 반환합니다.
        """
        if indicator_value is None: return None
        if isinstance(indicator_value, (int, float)): return indicator_value

        key_raw = indicator_value.indicator_key
        if key_raw.lower() in ['close', 'open', 'high', 'low', 'volume']: return key_raw.lower()

        kind = INDICATOR_KIND_MAP.get(key_raw.upper(), key_raw.lower())
        params_str = "_".join(map(str, indicator_value.values.values()))
        output_key = indicator_value.outputs[0].lower() if indicator_value.outputs else ""
        
        possible_prefixes = [p.lower() for p in OUTPUT_PREFIX_MAP.get(key_raw.upper(), [])]
        target_prefix = ""

        # 각 복합 지표의 고유한 이름 규칙 처리
        if kind == 'macd' and output_key in ['macd', 'histogram', 'signal']:
            prefix_map = {'macd': 'macd', 'histogram': 'macdh', 'signal': 'macds'}
            target_prefix = prefix_map.get(output_key, 'macd')
        elif kind == 'stoch' and output_key in ['k', 'd']:
             target_prefix = f"stoch{output_key}"
        elif kind == 'supertrend' and output_key in ['supertrend', 'direction']:
            prefix_map = {'supertrend': 'supert', 'direction': 'supertd'}
            target_prefix = prefix_map.get(output_key, 'supert')
        elif kind == 'ichimoku': # Ichimoku
            # 각 구성요소 계산에 필요한 파라미터를 가져옵니다.
            tenkan = indicator_value.values.get('tenkan', 9)
            kijun = indicator_value.values.get('kijun', 26)
            senkou = indicator_value.values.get('senkou', 52)
            
            # pandas-ta의 실제 이름 생성 규칙을 그대로 적용합니다.
            if output_key == 'tenkan_sen':
                target_prefix = 'its'
                params_str = str(tenkan)
            elif output_key == 'kijun_sen':
                target_prefix = 'iks'
                params_str = str(kijun)
            elif output_key == 'span_a' or output_key == 'upper': # 'upper'는 채널 로직 호환용
                target_prefix = 'isa'
                params_str = f"{tenkan}_{kijun}"
            elif output_key == 'span_b' or output_key == 'lower': # 'lower'는 채널 로직 호환용
                target_prefix = 'isb'
                params_str = str(senkou)
            elif output_key == 'lagging':
                target_prefix = 'ics'
                params_str = str(kijun) # 후행스팬은 기준선(kijun)을 따라갑니다.
            else: # 기본값
                target_prefix = 'its'
                params_str = str(tenkan)
        else:
            if possible_prefixes: target_prefix = possible_prefixes[0]
            else: target_prefix = kind
        
        expected_col_base = f"{target_prefix}_{params_str}" if params_str else target_prefix

        # 유연한 방식으로 컬럼 탐색
        for col in df_columns:
            if col.startswith(expected_col_base):
                remainder = col[len(expected_col_base):]
                if not remainder or remainder.startswith('_') or remainder.startswith('.'):
                     return col

        logger.warning(f"지표 컬럼 탐색 실패: {indicator_value.model_dump()}, 예상 컬럼명 시작: '{expected_col_base}'")
        return None

    def _parse_logic_block_to_series(self, df: pd.DataFrame, block: schemas.LogicBlock, depth=0) -> pd.Series:
        """
        단일 LogicBlock을 평가하여 boolean Series (True/False)를 반환하는 재귀 함수.
        """
        # indent = "  " * depth
        # logger.warning(f"{indent}블록 처리 시작 (ID: {block.id}, Type: {block.type}, Depth: {depth})")

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
                # 파라미터 값을 직접 가져옵니다.
                tenkan = indicator.values.get('tenkan', 9)
                kijun = indicator.values.get('kijun', 26)
                # senkou는 더 이상 컬럼명 생성에 사용되지 않습니다.
                
                # [핵심 수정] 실제 생성된 컬럼명 규칙에 정확히 맞춰줍니다.
                upper_col_name = f"isa_{tenkan}"      # Senkou A는 tenkan 기간을 따름
                lower_col_name = f"isb_{kijun}"       # Senkou B는 kijun 기간을 따름
                
                if upper_col_name in df.columns:
                    upper_col = upper_col_name
                if lower_col_name in df.columns:
                    lower_col = lower_col_name
            else:
                # 다른 채널 지표(볼린저밴드 등)를 위한 기존 로직
                upper_ind_val = schemas.IndicatorValue(**{**indicator.model_dump(), "outputs": ["upper"]})
                lower_ind_val = schemas.IndicatorValue(**{**indicator.model_dump(), "outputs": ["lower"]})
                
                upper_col = self._get_indicator_column_name(df.columns, upper_ind_val)
                lower_col = self._get_indicator_column_name(df.columns, lower_ind_val)
            
            if upper_col is None or lower_col is None:
                logger.warning(f"채널 컬럼 탐색 실패: upper='{upper_col}', lower='{lower_col}'")
                return pd.Series(False, index=df.index)

            # (이후 로직은 이전과 동일하게 유지됩니다)
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

        
        # --- [로그] --- 부모 블록 자체의 조건 평가 결과 로깅
        # parent_true_count = parent_series.sum() if parent_series is not None else 0
        # logger.warning(f"{indent} -> 부모 블록 자체 조건 만족 횟수: {parent_true_count} / {len(df)}")

        # 2. 자식 블록이 있는지 확인하고, 그에 따라 최종 결과를 조합합니다.
        if block.children and len(block.children) > 0:
            # logger.warning(f"{indent}--- 객체 검사 시작 ---")
            # logger.warning(f"{indent}블록 ID: {block.id}")
            # logger.warning(f"{indent}블록의 실제 타입: {type(block)}")
            # logger.warning(f"{indent}블록의 모든 속성(dict): {block.__dict__}")

            # logger.warning(f"{indent} -> 자식 블록 {len(block.children)}개 처리 시작 (Operator: {block.logic_operator})")
            children_series_list = [self._parse_logic_block_to_series(df, child, depth + 1) for child in block.children]
            
            all_series_in_group = [parent_series] + children_series_list
            
            op_func = np.logical_and if block.logic_operator == "AND" else np.logical_or
            final_series = reduce(op_func, all_series_in_group)
        else:
            final_series = parent_series

        # --- [로그] --- 현재 블록의 최종 결과 로깅
        # final_true_count = final_series.sum() if final_series is not None else 0
        # logger.warning(f"{indent}블록 처리 완료 (ID: {block.id}): 최종 조건 만족 횟수: {final_true_count} / {len(df)}")
        
        return final_series.fillna(False)

    def _get_required_timeframes_and_indicators(self, request: Union[schemas.SignalCalculationRequest, schemas.StrategyCreate], base_timeframe: str) -> Dict[str, Any]:
        """전략 규칙을 재귀적으로 분석하여, '계산이 필요한' 모든 지표 목록을 안정적으로 추출합니다."""
        
        unique_indicators = set()
        
        def find_indicators_recursively(obj: Any):
            if isinstance(obj, schemas.BaseLogicBlock):
                indicator_fields = ['operand_a', 'operand_b', 'main_line', 'signal_line', 'indicator']
                for field in indicator_fields:
                    if hasattr(obj, field):
                        find_indicators_recursively(getattr(obj, field))
                if obj.children:
                    for child in obj.children:
                        find_indicators_recursively(child)
            
            elif isinstance(obj, schemas.IndicatorValue):
                tf = obj.timeframe if obj.timeframe else base_timeframe
                identifier = f"{obj.indicator_key}|{tf}|{json.dumps(obj.values, sort_keys=True)}"
                unique_indicators.add(identifier)

        rules_sets = [request.long_entry_rules, request.long_exit_rules, request.short_entry_rules, request.short_exit_rules]
        for rules in rules_sets:
            if rules:
                for block in rules.blocks:
                    find_indicators_recursively(block)

        timeframes = set([base_timeframe])
        indicators_by_tf = {base_timeframe: {}}
        
        base_ohlcv_keys = {'open', 'high', 'low', 'close', 'volume'}

        for indicator_str in unique_indicators:
            key, tf, values_str = indicator_str.split('|', 2)
            
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

        return {"timeframes": sorted(list(timeframes), key=timeframe_to_minutes), "indicators": indicators_by_tf}

    
    def _get_calculation_base_timeframe(self, required_timeframes: List[str]) -> str:
        """
        제공된 타임프레임 목록에서 가장 짧은(가장 해상도가 높은) 타임프레임을 찾아 반환합니다.
        """
        if not required_timeframes:
            return '1h'
        return min(required_timeframes, key=timeframe_to_minutes)

    async def _get_resampled_dataframe(self, db: AsyncSession, ticker: str, configs: Dict[str, Any]) -> Tuple[pd.DataFrame, str]:
        """
        추출된 설정을 기반으로 모든 타임프레임의 데이터를 가져와 리샘플링하고 병합합니다.
        가장 짧은 타임프레임을 '계산 기준'으로 삼아 모든 데이터를 정렬합니다.
        """
        all_timeframes = configs['timeframes']
        if not all_timeframes:
            return pd.DataFrame(), '1h'

        # 1. 계산의 기준이 될 가장 짧은 타임프레임을 결정합니다.
        calculation_base_tf = self._get_calculation_base_timeframe(all_timeframes)
        logger.info(f"계산 기준 타임프레임 결정: {calculation_base_tf}")

        # 2. '계산 기준' 타임프레임의 데이터를 메인 데이터프레임으로 로드합니다.
        base_df = await market_data_service.get_latest_data(db, ticker, calculation_base_tf, limit=2000)

        # --- [디버깅 코드 1단계 추가] ---
        # print("--- [DEBUG] 1. 입력 데이터프레임 정보 ---")
        # if base_df.empty:
        #     print("데이터프레임이 비어있습니다.")
        # else:
        #     print(base_df.info())
        #     print("\n--- [DEBUG] 2. 데이터프레임 상위 5개 행 ---")
        #     print(base_df.head())
        # print("--------------------------------------\n")
        # --- [디버깅 코드 추가 종료] ---

        if base_df.empty: 
            return pd.DataFrame(), calculation_base_tf
        
        # 1. 계산할 지표 목록을 가져옵니다.
        indicators_to_process = configs['indicators'].get(calculation_base_tf, [])
        
        # 2. Ichimoku 지표 설정을 별도로 분리합니다.
        ichimoku_config = None
        other_indicators = []
        for indicator in indicators_to_process:
            if indicator.get("kind") == "ichimoku":
                ichimoku_config = indicator
            else:
                other_indicators.append(indicator)

        # 3. Ichimoku 지표가 있다면, 직접 호출하여 계산합니다. (가장 안정적인 방법)
        if ichimoku_config:
            # kind 키는 실제 ta 함수에 전달되면 안되므로 제거합니다.
            params = {k: v for k, v in ichimoku_config.items() if k != 'kind'}
            base_df.ta.ichimoku(append=True, **params)
            logger.info(f"Ichimoku 지표 직접 계산 완료. Params: {params}")

            # --- [디버깅 코드 2단계 추가] ---
            # print("\n--- [DEBUG] 3. Ichimoku 계산 후 컬럼 목록 ---")
            # print(sorted(base_df.columns))
            # print("-----------------------------------------\n")
            # --- [디버깅 코드 추가 종료] ---

        # 4. 나머지 다른 지표들은 기존처럼 strategy를 통해 계산합니다.
        if other_indicators:
            strategy_name = f"strat_{calculation_base_tf}"
            base_df.ta.strategy(ta.Strategy(name=strategy_name, ta=other_indicators), append=True)
            logger.info(f"'{strategy_name}' 전략의 나머지 지표 {len(other_indicators)}개 계산 완료.")

        # 3. 나머지 (더 긴) 타임프레임들의 데이터를 '계산 기준'에 맞게 다운샘플링하여 병합합니다.
        for tf in all_timeframes:
            if tf == calculation_base_tf:
                continue

            df_higher_tf = await market_data_service.get_latest_data(db, ticker, tf, limit=2000)
            if df_higher_tf.empty: 
                continue
            
            if configs['indicators'].get(tf):
                df_higher_tf.ta.strategy(ta.Strategy(name=f"strat_{tf}", ta=configs['indicators'][tf]), append=True)
            
            indicator_cols = [col for col in df_higher_tf.columns if col.lower() not in ['open', 'high', 'low', 'close', 'volume']]
            if not indicator_cols:
                continue

            resampled_indicators = df_higher_tf[indicator_cols].reindex(base_df.index, method='ffill')
            
            # 컬럼 이름 중복 방지를 위해 접미사 추가
            resampled_indicators = resampled_indicators.rename(columns={col: f"{col}_{tf}" for col in indicator_cols})

            base_df = base_df.join(resampled_indicators)
        
        # 4. 최종 데이터프레임 정리
        base_df = base_df.reset_index()
        base_df.columns = base_df.columns.str.lower()
        base_df['time'] = (base_df['time'].astype('int64') // 10**9)
        
        required_cols = ['time', 'open', 'high', 'low', 'close', 'volume']
        return base_df.dropna(subset=required_cols), calculation_base_tf

    async def generate_signals(
        self, request: Union[schemas.SignalCalculationRequest, schemas.StrategyCreate]
    ) -> Tuple[pd.DataFrame, str]:
        """
        [최종 수정 버전]
        전략 규칙 기반으로 매매 신호 DataFrame과 '계산 기준 타임프레임'을 함께 반환합니다.
        """
        if isinstance(request, schemas.StrategyCreate) and request.target_coins:
            ticker = request.target_coins[0].ticker
        else:
            ticker = getattr(request, 'ticker', "BTC/USDT")

        # backtest_task에서 사용할 timeframe은 snapshot에 없으므로, 기본값을 사용합니다.
        # 어차피 _get_required_timeframes_and_indicators가 올바른 타임프레임을 찾아줍니다.
        base_timeframe = '1h'

        # logger.warning(f"--- 신호 생성 시작 (Backtest): Ticker={ticker} ---")

        async with AsyncSessionLocal() as db:
            configs = self._get_required_timeframes_and_indicators(request, base_timeframe=base_timeframe)
            df_merged, calculation_tf = await self._get_resampled_dataframe(db, ticker, configs)

        if df_merged.empty:
            logger.warning(f"{ticker} 시세 데이터를 가져오지 못했습니다.")
            return pd.DataFrame(columns=['signal']), '1h' # 기본 타임프레임 반환

        final_signals: List[schemas.SignalDataPoint] = []

        def process_rules(rules: Optional[schemas.PositionRules], signal_type: str):
            if not rules or not rules.blocks: return
            block_results = [self._parse_logic_block_to_series(df_merged, block) for block in rules.blocks]
            op = any if rules.logic_operator == "OR" else all
            final_series = pd.DataFrame(block_results).transpose().apply(op, axis=1)
            signal_points = df_merged[final_series]
            for _, row in signal_points.iterrows():
                final_signals.append(schemas.SignalDataPoint(time=int(row['time']), signal_type=signal_type))

        process_rules(request.long_entry_rules, "long_entry")
        process_rules(request.long_exit_rules, "long_exit")
        process_rules(request.short_entry_rules, "short_entry")
        process_rules(request.short_exit_rules, "short_exit")

        # logger.warning(f"--- 신호 생성 완료 ({calculation_tf} 기준): 총 {len(final_signals)}개 신호 생성됨 ---")
        
        if not final_signals:
            return pd.DataFrame(columns=['signal']), calculation_tf

        signals_df = pd.DataFrame([s.model_dump() for s in final_signals])
        signals_df['time_dt'] = pd.to_datetime(signals_df['time'], unit='s', utc=True)
        signals_df = signals_df.set_index('time_dt')
        signals_df = signals_df.rename(columns={'signal_type': 'signal'})
        
        # 단순 중복 제거 대신, 우선순위 기반으로 신호를 선택
        if not signals_df.index.is_unique:
            # 우선순위 맵 정의 (낮은 숫자 = 높은 우선순위)
            priority_map = {
                'long_exit': 1, 'short_exit': 1,
                'long_entry': 2, 'short_entry': 2,
            }
            signals_df['priority'] = signals_df['signal'].map(priority_map)
            
            # 동일 인덱스(시간) 내에서 우선순위가 가장 높은 신호만 선택
            signals_df = signals_df.sort_values('priority').groupby(signals_df.index).first()
            signals_df = signals_df.drop(columns='priority')

        return signals_df[['signal']], calculation_tf

signal_service = SignalService()