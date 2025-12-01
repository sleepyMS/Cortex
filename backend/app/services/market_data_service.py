# file: backend/app/services/market_data_service.py

import asyncio
from datetime import datetime, timezone
from typing import Optional, List

import pandas as pd
from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
import logging
from ..utils.async_utils import run_async
from ..database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# 허용된 타임프레임 목록 (SQL 인젝션 방지용)
ALLOWED_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"]


class MarketDataService:
    """
    데이터베이스에서 OHLCV 시세 데이터를 조회하고 처리하는 역할을 담당하는 비동기 서비스 클래스.
    내부적으로는 DatetimeIndex를 가진 DataFrame을 표준으로 사용합니다.
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
        [데이터 조회 및 내부 표준 형식 변환의 유일한 책임자]
        DB에서 데이터를 조회하여 DatetimeIndex를 가진 DataFrame으로 반환합니다.
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
            SELECT time, "open", high, low, "close", volume
            FROM {table_name}
            WHERE ticker = :ticker {since_clause}
            ORDER BY time {order_clause}
            LIMIT :limit
        """)
        
        try:
            result = await db.execute(sql_query, query_params)
            rows = result.mappings().all()
            if not rows:
                logger.warning(f"No data found for {ticker} in {table_name}.")
                return pd.DataFrame()
            
            df = pd.DataFrame(rows)
            
            # 서비스의 '내부 표준'인 DatetimeIndex 형식으로 변환합니다.
            df['time'] = pd.to_datetime(df['time'])
            df = df.set_index('time')
            
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV data for {ticker} ({timeframe}): {e}", exc_info=True)
            return pd.DataFrame()

    async def get_ohlcv_data(
        self,
        db: AsyncSession,
        ticker: str,
        timeframe: str,
        limit: int = 500,
        since: Optional[datetime] = None,
    ) -> pd.DataFrame:
        """
        과거 특정 시점부터 또는 최신 데이터부터 시간 오름차순으로 OHLCV 데이터를 조회합니다.
        내부 표준 형식(DatetimeIndex DataFrame)으로 반환합니다.
        """
        df = await self._fetch_ohlcv(db, ticker, timeframe, limit, since, order_desc=not since)
        if df.empty:
            return df

        # 인덱스(시간) 기준으로 정렬 및 중복 제거
        df_sorted = df.sort_index(ascending=True)
        df_unique = df_sorted[~df_sorted.index.duplicated(keep='last')]
        
        return df_unique

    async def get_latest_data(self, db: AsyncSession, ticker: str, timeframe: str, limit: int = 1000) -> pd.DataFrame:
        """
        실시간 신호 계산 등을 위해 최신 데이터를 조회합니다.
        내부 표준 형식(DatetimeIndex DataFrame)으로 반환합니다.
        """
        df = await self._fetch_ohlcv(db, ticker, timeframe, limit, order_desc=True)
        if df.empty:
            return df

        df_sorted = df.sort_index(ascending=True)
        df_unique = df_sorted[~df_sorted.index.duplicated(keep='last')]

        table_name = f"ohlcv_{timeframe}"
        # logger.warning(f"Successfully fetched and deduplicated {len(df_unique)} rows for {ticker} from {table_name}.")
        return df_unique

    def get_historical_data_sync(
        self,
        ticker: str,
        timeframe: str,
        start_date: datetime,
        end_date: datetime
    ) -> pd.DataFrame:
        """
        [동기 래퍼] Celery 같은 동기 환경에서 전체 기간의 OHLCV 데이터를 조회하기 위한 함수.
        내부 표준 형식(DatetimeIndex DataFrame)으로 반환합니다.
        """
        logger.info(f"Synchronous request for historical data: {ticker} ({timeframe}) from {start_date} to {end_date}")

        async def _fetch_and_filter():
            """비동기 로직을 실행하기 위한 내부 async 함수"""
            async with AsyncSessionLocal() as session:
                # 기간 내 모든 데이터를 가져오기 위해 충분히 큰 limit 값을 설정합니다.
                limit = 50000 
                
                df = await self.get_ohlcv_data(
                    db=session,
                    ticker=ticker,
                    timeframe=timeframe,
                    limit=limit,
                    since=start_date
                )
                
                if df.empty:
                    return df

                # DatetimeIndex를 기준으로 정확한 기간을 필터링합니다.
                mask = (df.index >= start_date) & (df.index <= end_date)
                return df.loc[mask]

        try:
            return run_async(_fetch_and_filter())
        except Exception as e:
            logger.error(f"Error in asyncio.run for historical data fetch: {e}", exc_info=True)
            return pd.DataFrame()
        
    def save_ohlcv_data_sync(self, db: Session, ticker: str, timeframe: str, ohlcv_data: List[list]):
        """
        [동기] 수집한 OHLCV 데이터를 DB에 저장(Upsert)합니다.
        Celery 태스크에서 재사용하기 위해 서비스 계층으로 이동했습니다.
        """
        if not ohlcv_data:
            return 0

        table_name = f"ohlcv_{timeframe}"
        # TimescaleDB(PostgreSQL)에 최적화된 Upsert 쿼리
        sql_query = text(f"""
            INSERT INTO {table_name} (time, ticker, open, high, low, close, volume)
            VALUES (:time, :ticker, :open, :high, :low, :close, :volume)
            ON CONFLICT (time, ticker) DO UPDATE SET
                open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
                close = EXCLUDED.close, volume = EXCLUDED.volume;
        """)
        
        data_to_insert = [
            {
                "time": datetime.fromtimestamp(item[0] / 1000, tz=timezone.utc),
                "ticker": ticker,
                "open": item[1], "high": item[2], "low": item[3], "close": item[4], "volume": item[5]
            }
            for item in ohlcv_data
        ]

        db.execute(sql_query, data_to_insert)
        db.commit()
        return len(data_to_insert)


market_data_service = MarketDataService()