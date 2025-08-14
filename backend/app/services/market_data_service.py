# 파일 경로: backend/app/services/market_data_service.py (최종 수정 버전)

from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status
import logging
from typing import List, Optional, Dict
from datetime import datetime
import pandas as pd
import pandas_ta as ta

from .. import schemas

logger = logging.getLogger(__name__)

# 허용된 타임프레임 목록
ALLOWED_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"]

# (핵심 수정) 프론트엔드 key를 pandas-ta의 kind로 변환하는 규칙
INDICATOR_KIND_MAP = {
    "STOCHASTIC": "stoch",
    "PARABOLICSAR": "psar",
    "KELTNERCHANNEL": "kc",
    # key와 kind가 동일한 경우(예: "RSI": "rsi")는 여기에 추가할 필요 없음
}

# 출력 컬럼을 찾기 위한 접두사 규칙
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

def get_ohlcv_data(
    db: Session,
    ticker: str,
    timeframe: str,
    limit: int = 500,
    since: Optional[datetime] = None,
) -> pd.DataFrame:
    """[데이터 조회 함수] OHLCV 데이터를 조회하여 Pandas DataFrame으로 반환합니다."""
    if timeframe not in ALLOWED_TIMEFRAMES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported timeframe.")
    
    table_name = f"ohlcv_{timeframe}"
    
    query_params = {"ticker": ticker, "limit": limit}
    since_clause = ""
    if since:
        since_clause = "AND time >= :since"
        query_params["since"] = since

    sql_query = text(f"""
        SELECT time, open, high, low, close, volume
        FROM {table_name} WHERE ticker = :ticker {since_clause} ORDER BY time ASC LIMIT :limit
    """)
    
    try:
        result = db.execute(sql_query, query_params)
        df = pd.DataFrame(result.mappings())
        if df.empty:
            return df
            
        df.set_index(pd.to_datetime(df['time']), inplace=True)
        df['time'] = (df.index.astype('int64') // 10**9).astype('int')
        df.rename(columns=str.lower, inplace=True)
        return df
    except Exception as e:
        logger.error(f"Error fetching OHLCV data for {ticker} ({timeframe}): {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching OHLCV data.")

def calculate_indicators(
    db: Session, 
    request: schemas.IndicatorCalculationRequest, 
    limit: int = 500
) -> Dict[str, List[schemas.IndicatorDataPoint]]:
    """[지표 계산 함수] 요청된 지표들의 '모든' 관련 데이터를 계산하여 반환합니다."""
    df = get_ohlcv_data(db, request.ticker, request.timeframe, limit=limit)
    if df.empty:
        return {}

    non_indicator_keys = ['open', 'high', 'low', 'close', 'volume']
    
    strategy_list = []
    for indicator in request.indicators:
        indicator_key_lower = indicator.indicator_key.lower()
        if indicator_key_lower not in non_indicator_keys:
            key_upper = indicator.indicator_key.upper()
            
            # (핵심 수정) KIND_MAP에서 실제 함수 이름을 찾고, 없으면 key를 그대로 사용
            kind_name = INDICATOR_KIND_MAP.get(key_upper, indicator_key_lower)
            
            strategy_list.append(
                {"kind": kind_name, **indicator.values}
            )
    
    if strategy_list:
        df.ta.strategy(ta.Strategy(name="CustomStrategy", ta=strategy_list), unknown_params="drop")

    results = {}
    processed_columns = set()
    
    for indicator_config in request.indicators:
        indicator_key_upper = indicator_config.indicator_key.upper()
        known_prefixes = OUTPUT_PREFIX_MAP.get(indicator_key_upper, [])
        if not known_prefixes:
            continue
            
        for col_name in df.columns:
            if col_name in processed_columns:
                continue
            
            if any(col_name.upper().startswith(p + '_') for p in known_prefixes):
                series = df[[col_name, 'time']].dropna()
                results[col_name] = [
                    schemas.IndicatorDataPoint(time=row['time'], value=row[col_name])
                    for _, row in series.iterrows()
                ]
                processed_columns.add(col_name)
    return results