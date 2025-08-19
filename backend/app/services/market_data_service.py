# file: backend/app/services/market_data_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException, status
import logging
from typing import Optional
from datetime import datetime
import pandas as pd

logger = logging.getLogger(__name__)

# 허용된 타임프레임 목록 (SQL 인젝션 방지용)
ALLOWED_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"]

class MarketDataService:
    """
    데이터베이스에서 OHLCV 시세 데이터를 조회하고 처리하는 역할을 담당하는 비동기 서비스 클래스.
    """

    async def _fetch_ohlcv(
        self,
        db: AsyncSession,
        ticker: str,
        timeframe: str,
        limit: int,
        since: Optional[datetime] = None,
        order_desc: bool = False
    ) -> pd.DataFrame:
        """
        OHLCV 데이터 조회의 핵심 로직을 담당하는 내부 헬퍼 함수.
        """
        if timeframe not in ALLOWED_TIMEFRAMES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported timeframe.")

        table_name = f"ohlcv_{timeframe}"
        
        query_params = {"ticker": ticker, "limit": limit}
        since_clause = ""
        if since:
            since_clause = "AND time >= :since"
            query_params["since"] = since

        order_clause = "DESC" if order_desc else "ASC"

        sql_query = text(f"""
            SELECT time, open, high, low, close, volume
            FROM {table_name}
            WHERE ticker = :ticker {since_clause}
            ORDER BY time {order_clause}
            LIMIT :limit
        """)
        
        try:
            result = await db.execute(sql_query, query_params)
            rows = result.mappings().all()
            if not rows:
                return pd.DataFrame()
            
            df = pd.DataFrame(rows)
            
            # 후속 처리를 위해 datetime 객체로 변환
            df['time_dt'] = pd.to_datetime(df['time'])
            # API 응답 및 신호 계산을 위한 Unix timestamp (초) 컬럼 추가
            df['time'] = df['time_dt'].astype('int64') // 10**9
            
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV data for {ticker} ({timeframe}): {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching market data.")

    async def get_ohlcv_data(
        self,
        db: AsyncSession,
        ticker: str,
        timeframe: str,
        limit: int = 500,
        since: Optional[datetime] = None,
    ) -> pd.DataFrame:
        """
        과거 특정 시점부터(since가 있는 경우) 또는 가장 최신 데이터부터(since가 없는 경우)
        시간 오름차순으로 OHLCV 데이터를 조회합니다.
        """
        # 'since'가 없으면 최신 데이터를 가져오도록 order_desc=True로 설정
        df = await self._fetch_ohlcv(db, ticker, timeframe, limit, since, order_desc=not since)
        
        # 최신부터 가져왔을 경우(order_desc=True), 차트에 맞게 시간 오름차순으로 다시 정렬
        if not since:
            return df.sort_values(by='time', ascending=True).reset_index(drop=True)
        
        return df

    async def get_latest_data(
        self,
        db: AsyncSession,
        ticker: str,
        timeframe: str,
        limit: int = 1000,
    ) -> pd.DataFrame:
        """
        가장 최신 시점부터 데이터를 조회한 후, 시간 오름차순으로 정렬하여 반환합니다. 
        실시간 신호 계산 등에서 명시적으로 사용됩니다.
        """
        df = await self._fetch_ohlcv(db, ticker, timeframe, limit, order_desc=True)
        return df.sort_values(by='time', ascending=True).reset_index(drop=True)

# 다른 서비스에서 쉽게 임포트하여 사용할 수 있도록 인스턴스 생성
market_data_service = MarketDataService()