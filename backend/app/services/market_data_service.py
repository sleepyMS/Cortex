# file: backend/app/services/market_data_service.py

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

# 허용된 타임프레임 목록 (SQL 인젝션 방지용)
ALLOWED_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"]

def get_ohlcv_data(
    db: Session,
    ticker: str,
    timeframe: str,
    limit: int = 500,
    since: Optional[datetime] = None,
) -> List[Dict]:
    """
    TimescaleDB 하이퍼테이블에서 OHLCV 데이터를 조회하여,
    time을 Unix 타임스탬프(int)로 변환한 dict 리스트로 반환합니다.
    """
    if timeframe not in ALLOWED_TIMEFRAMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported timeframe. Allowed timeframes are: {', '.join(ALLOWED_TIMEFRAMES)}"
        )
    
    table_name = f"ohlcv_{timeframe}"

    query_params = {"ticker": ticker, "limit": limit}
    since_clause = ""
    if since:
        since_clause = "AND time >= :since"
        query_params["since"] = since

    sql_query = text(f"""
        SELECT time, open, high, low, close, volume
        FROM {table_name}
        WHERE ticker = :ticker
        {since_clause}
        ORDER BY time ASC
        LIMIT :limit
    """)

    try:
        result = db.execute(sql_query, query_params)
        
        ohlcv_list = [
            {
                "time": int(row.time.timestamp()),
                "open": row.open,
                "high": row.high,
                "low": row.low,
                "close": row.close,
                "volume": row.volume,
            }
            for row in result.mappings()
        ]
        return ohlcv_list
    except Exception as e:
        logger.error(f"Error fetching OHLCV data for {ticker} ({timeframe}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시세 데이터를 조회하는 중 오류가 발생했습니다."
        )

def calculate_indicators(
    db: Session, 
    request: schemas.IndicatorCalculationRequest, 
    limit: int = 500  # 👈 1. limit 파라미터를 받도록 추가
) -> Dict[str, List[schemas.IndicatorDataPoint]]:
    """
    OHLCV 데이터를 기반으로 요청된 지표들을 계산합니다.
    """
    # 2. 내부에서 OHLCV 데이터를 조회할 때 전달받은 limit을 사용합니다.
    ohlcv_dicts = get_ohlcv_data(db, request.ticker, request.timeframe, limit=limit)
    if not ohlcv_dicts:
        return {}

    df = pd.DataFrame(ohlcv_dicts)
    df['time_dt'] = pd.to_datetime(df['time'], unit='s', utc=True)
    df.set_index('time_dt', inplace=True)
    df.rename(columns=str.lower, inplace=True)

    results = {}

    for indicator_config in request.indicators:
        try:
            indicator_key = indicator_config.indicator_key.lower()
            params = indicator_config.values
            
            strategy = ta.Strategy(
                name=f"Custom_{indicator_key}",
                ta=[{"kind": indicator_key, **params}]
            )
            df.ta.strategy(strategy)

            generated_cols = [col for col in df.columns if col.lower().startswith(indicator_key)]

            for col_name in generated_cols:
                series_key = col_name
                
                indicator_series = df[[col_name]].dropna()
                results[series_key] = [
                    schemas.IndicatorDataPoint(
                        time=int(index.timestamp()),
                        value=row[col_name]
                    )
                    for index, row in indicator_series.iterrows()
                ]
        except Exception as e:
            logger.error(f"Failed to calculate indicator {indicator_config.indicator_key}: {e}", exc_info=True)

    return results