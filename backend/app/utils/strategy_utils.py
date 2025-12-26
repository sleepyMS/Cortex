# file: backend/app/utils/strategy_utils.py

from typing import Any, Dict, List, Set, Union, Optional
import json
import logging
from datetime import timedelta
import pandas as pd
from .. import schemas

logger = logging.getLogger(__name__)

# Constants (moved from signal_service.py)
BASE_OHLCV_KEYS = {'open', 'high', 'low', 'close', 'volume'}

INDICATOR_KIND_MAP = {
    "STOCHASTIC": "stoch",
    "PARABOLICSAR": "psar",
    "KELTNERCHANNEL": "kc",
    "ICHIMOKU": "ichimoku",
}

def timeframe_to_minutes(tf_str: str) -> int:
    """
    타임프레임 문자열을 분 단위 정수로 변환합니다.
    (1h -> 60, 1d -> 1440 등)
    """
    if not tf_str: return float('inf')
    if 'm' in tf_str: return int(tf_str.replace('m', ''))
    if 'h' in tf_str: return int(tf_str.replace('h', '')) * 60
    if 'd' in tf_str: return int(tf_str.replace('d', '')) * 1440
    if 'w' in tf_str: return int(tf_str.replace('w', '')) * 10080
    if 'M' in tf_str: return int(tf_str.replace('M', '')) * 43200
    return float('inf')

def convert_minutes_to_timeframe_string(minutes: int) -> str:
    """
    분(minute) 단위 정수를 Cortex 표준 타임프레임 문자열로 변환합니다.
    (예: 60 -> '1h', 1440 -> '1d').
    매핑되지 않는 값은 가장 가까운 하위 표준 타임프레임(보수적 접근) 또는 기본값 '1h'를 반환합니다.
    """
    # Cortex / CCXT Standard Timeframes
    mapping = {
        1: '1m', 3: '3m', 5: '5m', 15: '15m', 30: '30m',
        60: '1h', 240: '4h', 720: '12h', 1440: '1d', 10080: '1w', 43200: '1M'
    }
    if minutes in mapping:
        return mapping[minutes]
        
    return '1h'

def extract_all_timeframes_from_strategy(strategy: Union[schemas.StrategyCreate, schemas.Strategy, Dict[str, Any], schemas.SignalCalculationRequest]) -> Set[str]:
    """
    전략 객체(또는 딕셔너리)를 순회하며 사용된 모든 타임프레임을 추출합니다.
    """
    unique_indicators_timeframes = set()

    def find_timeframes_recursively(obj: Any):
        # 1. LogicBlock (Pydantic Model)
        if hasattr(obj, 'operand_a'): find_timeframes_recursively(obj.operand_a)
        if hasattr(obj, 'operand_b'): find_timeframes_recursively(obj.operand_b)
        if hasattr(obj, 'main_line'): find_timeframes_recursively(obj.main_line)
        if hasattr(obj, 'signal_line'): find_timeframes_recursively(obj.signal_line)
        if hasattr(obj, 'indicator'): find_timeframes_recursively(obj.indicator)
        
        # 2. LogicBlock (Dict)
        if isinstance(obj, dict):
            if 'operand_a' in obj: find_timeframes_recursively(obj['operand_a'])
            if 'operand_b' in obj: find_timeframes_recursively(obj['operand_b'])
            if 'main_line' in obj: find_timeframes_recursively(obj['main_line'])
            if 'signal_line' in obj: find_timeframes_recursively(obj['signal_line'])
            if 'indicator' in obj: find_timeframes_recursively(obj['indicator'])
            if 'children' in obj and obj['children']:
                for child in obj['children']: find_timeframes_recursively(child)
            
            # IndicatorValue as Dict
            if 'indicator_key' in obj:
                tf = obj.get('timeframe')
                if tf: unique_indicators_timeframes.add(tf)

        # 3. Children (Pydantic)
        if hasattr(obj, 'children') and obj.children:
            for child in obj.children: find_timeframes_recursively(child)

        # 4. IndicatorValue (Pydantic)
        if hasattr(obj, 'indicator_key'): # It is IndicatorValue-like
            # Pydantic model access
            tf = getattr(obj, 'timeframe', None)
            if tf: unique_indicators_timeframes.add(tf)
    
    # 전략의 진입/청산 규칙 순회
    rules_sources = []
    
    # Dict support
    if isinstance(strategy, dict):
        rules_sources = [
            strategy.get('long_entry_rules'),
            strategy.get('long_exit_rules'),
            strategy.get('short_entry_rules'),
            strategy.get('short_exit_rules')
        ]
    # Pydantic Model support
    else:
        rules_sources = [
            getattr(strategy, 'long_entry_rules', None),
            getattr(strategy, 'long_exit_rules', None),
            getattr(strategy, 'short_entry_rules', None),
            getattr(strategy, 'short_exit_rules', None)
        ]

    for rules in rules_sources:
        if not rules: continue
        
        # Pydantic 'blocks'
        if hasattr(rules, 'blocks'):
            for block in rules.blocks:
                find_timeframes_recursively(block)
        # Dict 'blocks'
        elif isinstance(rules, dict) and 'blocks' in rules:
             for block in rules['blocks']:
                find_timeframes_recursively(block)

    return unique_indicators_timeframes

def get_min_timeframe_minutes(strategy: Any, default_timeframe: str = '1h') -> int:
    """
    전략에서 사용된 가장 작은 타임프레임을 분 단위로 반환합니다.
    발견된 타임프레임이 없으면 default_timeframe을 사용합니다.
    """
    found_timeframes = extract_all_timeframes_from_strategy(strategy)
    
    if not found_timeframes:
        # 전략 내에 명시적 타임프레임이 없으면 기본값 사용
        return timeframe_to_minutes(default_timeframe)
    
    # 추출된 타임프레임 중 가장 작은(분 단위) 값 찾기
    min_minutes = float('inf')
    for tf in found_timeframes:
        minutes = timeframe_to_minutes(tf)
        if minutes < min_minutes:
            min_minutes = minutes
            
    return int(min_minutes)

def merge_dataframes_on_close_time(
    base_df: pd.DataFrame, 
    base_tf_str: str, 
    higher_df: pd.DataFrame, 
    higher_tf_str: str
) -> pd.DataFrame:
    """
    [User Logic Implementation] Close Time 기준 데이터 병합
    
    1. Base DF와 Higher DF 모두 'close_time'을 계산합니다.
       (Close Time = Open Time(Index) + Timeframe Delta)
    2. pd.merge_asof를 사용하여 Close Time 기준으로 병합합니다.
       (direction='backward', 즉 같거나 가장 가까운 과거의 Close Time 데이터를 매핑)
    3. Higher DF의 컬럼에는 '_{higher_tf_str}' 접미사가 붙습니다.
    
    주의: 이 로직은 Look-ahead Bias를 방지하며, '동시 마감'되는 캔들(예: 19:00 마감) 간의
    데이터 정합성을 보장합니다.
    """
    # 1. Close Time 계산
    base_minutes = timeframe_to_minutes(base_tf_str)
    higher_minutes = timeframe_to_minutes(higher_tf_str)
    
    # 원본 보존을 위해 복사
    df_base = base_df.copy()
    df_higher = higher_df.copy()
    
    df_base['_close_time'] = df_base.index + timedelta(minutes=base_minutes)
    df_higher['_close_time'] = df_higher.index + timedelta(minutes=higher_minutes)
    
    # 2. 컬럼 리네이밍 (Higher DF) - _close_time 제외
    cols_to_rename = {col: f"{col}_{higher_tf_str}" for col in df_higher.columns if col != '_close_time'}
    df_higher = df_higher.rename(columns=cols_to_rename)
    
    # 3. Merge Asof 실행
    # on='_close_time'으로 병합. Base DF의 인덱스는 유지됨.
    merged_df = pd.merge_asof(
        df_base.sort_values('_close_time'),
        df_higher.sort_values('_close_time'),
        on='_close_time',
        direction='backward',
        allow_exact_matches=True
    )
    
    # 4. 인덱스 복구 (merge_asof는 on 컬럼을 제외하고 인덱스를 리셋할 수 있음)
    # merge_asof의 left_index=True 옵션은 on과 함께 사용 불가(Pandas 버전에 따라 다름).
    # 따라서 _close_time으로 병합 후, 원본 df_base의 인덱스(Open Time)를 되살려야 함.
    # 하지만 여기서는 df_base가 이미 Index가 Open Time이므로, 병합된 merged_df의 순서가 df_base와 같다면
    # 인덱스를 재할당하면 됨. sort_values를 했으므로 주의 필요.
    
    merged_df.index = df_base.sort_values('_close_time').index
    merged_df = merged_df.sort_index()
    
    # 5. 검증 테이블(Trace Table) 출력 (로그) - 주석 처리됨 (Noise reduction)
    # try:
    #     sample_times = ["18:30:00", "18:45:00", "19:00:00"]
    #     log_msg = f"\n[Data Merge Verification: {base_tf_str} + {higher_tf_str}]\n"
    #     # ... (Logging logic removed for clean output)
    #     # logger.info(log_msg)
    # except Exception as e:
    #     pass

    # 6. 임시 컬럼 삭제
    merged_df = merged_df.drop(columns=['_close_time'])
    
    # 주의사항 주석 (User 요청)
    # "이 데이터프레임 구조에서 `18:45` 행은 19:00 시점의 상태를 의미합니다.
    # 만약 18:45:00 **시가(Open)**에 진입하는 전략을 테스트한다면, 반드시 `.shift(1)`을 하거나
    # 직전 행(`18:30`)을 참조해야 미래 참조 오류를 피할 수 있습니다."

    return merged_df


def extract_ai_blocks_from_strategy(
    strategy: Union[schemas.StrategyCreate, schemas.Strategy, Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    전략에서 모든 AI 신호 블록을 추출합니다.
    
    Returns:
        AI 블록 목록 [{model_id, signal_type, min_confidence}, ...]
    """
    ai_blocks = []
    
    def find_ai_blocks_recursively(obj: Any):
        # Check if this is an AI signal block
        block_type = None
        if hasattr(obj, 'type'):
            block_type = obj.type
        elif isinstance(obj, dict):
            block_type = obj.get('type')
        
        if block_type == 'ai_signal':
            if hasattr(obj, 'model_id'):
                ai_blocks.append({
                    'model_id': obj.model_id,
                    'signal_type': getattr(obj, 'signal_type', 'buy'),
                    'min_confidence': getattr(obj, 'min_confidence', 0.5)
                })
            elif isinstance(obj, dict):
                ai_blocks.append({
                    'model_id': obj.get('model_id'),
                    'signal_type': obj.get('signal_type', 'buy'),
                    'min_confidence': obj.get('min_confidence', 0.5)
                })
        
        # Recurse into nested structures
        # Pydantic model
        if hasattr(obj, 'children') and obj.children:
            for child in obj.children:
                find_ai_blocks_recursively(child)
        
        # Dict
        if isinstance(obj, dict) and 'children' in obj and obj['children']:
            for child in obj['children']:
                find_ai_blocks_recursively(child)
    
    # Traverse strategy rules
    rules_sources = []
    
    if isinstance(strategy, dict):
        rules_sources = [
            strategy.get('long_entry_rules'),
            strategy.get('long_exit_rules'),
            strategy.get('short_entry_rules'),
            strategy.get('short_exit_rules')
        ]
    else:
        rules_sources = [
            getattr(strategy, 'long_entry_rules', None),
            getattr(strategy, 'long_exit_rules', None),
            getattr(strategy, 'short_entry_rules', None),
            getattr(strategy, 'short_exit_rules', None)
        ]
    
    for rules in rules_sources:
        if not rules:
            continue
        
        blocks = []
        if hasattr(rules, 'blocks'):
            blocks = rules.blocks
        elif isinstance(rules, dict) and 'blocks' in rules:
            blocks = rules['blocks']
        
        for block in blocks:
            find_ai_blocks_recursively(block)
    
    return ai_blocks


class LookaheadBiasError(Exception):
    """AI 모델의 미래 참조 오류를 나타내는 예외"""
    def __init__(self, message: str, model_id: str = None, model_name: str = None):
        super().__init__(message)
        self.model_id = model_id
        self.model_name = model_name


def validate_ai_lookahead_bias(
    strategy: Union[schemas.StrategyCreate, schemas.Strategy, Dict[str, Any]],
    backtest_start_date,
    db_session = None
) -> List[Dict[str, Any]]:
    """
    전략 내 AI 모델이 백테스트 시작일 이후에 학습된 경우 미래 참조 오류를 반환합니다.
    
    Args:
        strategy: 전략 객체
        backtest_start_date: 백테스트 시작일 (datetime)
        db_session: DB 세션 (SyncSession 또는 None)
        
    Returns:
        위반 목록: [{model_id, model_name, training_end_date, backtest_start_date}, ...]
        
    Raises:
        LookaheadBiasError: 심각한 미래 참조 위반 시
    """
    from datetime import datetime
    
    ai_blocks = extract_ai_blocks_from_strategy(strategy)
    
    if not ai_blocks:
        return []
    
    violations = []
    
    if db_session is None:
        # DB 세션이 없으면 검증 스킵 (프론트엔드에서 표시용으로만 사용)
        return []
    
    # DB에서 AI 모델 정보 조회
    from ..models import AIModel
    
    for ai_block in ai_blocks:
        model_id = ai_block.get('model_id')
        if not model_id:
            continue
        
        try:
            ai_model = db_session.query(AIModel).filter(AIModel.id == model_id).first()
            
            if ai_model is None:
                logger.warning(f"AI model not found: {model_id}")
                continue
            
            # training_end_date가 backtest_start_date 이후인지 확인
            training_end = ai_model.training_end_date
            
            # datetime 타입 통일
            if isinstance(backtest_start_date, str):
                backtest_start_date = datetime.fromisoformat(backtest_start_date.replace('Z', '+00:00'))
            
            if training_end and training_end >= backtest_start_date:
                violations.append({
                    'model_id': str(model_id),
                    'model_name': ai_model.name,
                    'training_end_date': training_end.isoformat(),
                    'backtest_start_date': backtest_start_date.isoformat(),
                })
                
        except Exception as e:
            logger.error(f"Error validating AI model {model_id}: {e}")
    
    return violations


def extract_ai_training_periods(
    strategy: Union[schemas.StrategyCreate, schemas.Strategy, Dict[str, Any]],
    db_session
) -> List[Dict[str, Any]]:
    """
    전략 내 모든 AI 모델의 학습 기간(시작~종료)을 추출합니다.
    백테스트/최적화 시 해당 기간을 제외하기 위해 사용됩니다.
    
    Returns:
        [{ 'start': datetime, 'end': datetime, 'model_name': str, 'reason': str }, ...]
    """
    ai_blocks = extract_ai_blocks_from_strategy(strategy)
    
    if not ai_blocks:
        return []
    
    periods = []
    
    if db_session is None:
        return []
    
    # DB에서 AI 모델 정보 조회
    from ..models import AIModel
    
    for ai_block in ai_blocks:
        model_id = ai_block.get('model_id')
        if not model_id:
            continue
        
        try:
            ai_model = db_session.query(AIModel).filter(AIModel.id == model_id).first()
            
            if ai_model is None:
                continue
            
            if ai_model.training_start_date and ai_model.training_end_date:
                periods.append({
                    'start': ai_model.training_start_date,
                    'end': ai_model.training_end_date,
                    'model_name': ai_model.name,
                    'reason': f"AI Model '{ai_model.name}' Training Period"
                })
                
        except Exception as e:
            logger.error(f"Error extracting AI model period {model_id}: {e}")
            
    return periods

