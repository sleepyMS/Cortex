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
    (모든 데이터 조회 로직이 안정화된 최종 버전)
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
        [데이터 조회 및 변환의 유일한 책임자]
        OHLCV 데이터 조회의 핵심 로직을 담당하며, 프론트엔드가 요구하는 UNIX 타임스탬프로 변환까지 완료합니다.
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
            
            # --- [핵심 수정] ---
            # 시간 변환 로직은 이 곳에서만 유일하게 수행합니다.
            df['time'] = pd.to_datetime(df['time'])
            df['time'] = (df['time'].astype('int64') // 10**9)
            
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV data for {ticker} ({timeframe}): {e}", exc_info=True)
            # 운영 중 예외 발생 시 서버 다운 대신 빈 데이터프레임 반환
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
        """
        # 1. 데이터 조회 및 기본 변환은 _fetch_ohlcv에 위임
        df = await self._fetch_ohlcv(db, ticker, timeframe, limit, since, order_desc=not since)
        
        if df.empty:
            return df

        # --- [핵심 수정] ---
        # 이 함수는 정렬과 중복 제거만 책임집니다. (시간 형식 변환 코드 제거)
        df_sorted = df.sort_values(by='time', ascending=True)
        df_unique = df_sorted.drop_duplicates(subset=['time'], keep='last').reset_index(drop=True)
        
        return df_unique

    async def get_latest_data(self, db: AsyncSession, ticker: str, timeframe: str, limit: int = 1000) -> pd.DataFrame:
        """
        실시간 신호 계산 등을 위해 최신 데이터를 조회합니다.
        """
        # 1. 데이터 조회 및 기본 변환은 _fetch_ohlcv에 위임 (항상 최신부터)
        df = await self._fetch_ohlcv(db, ticker, timeframe, limit, order_desc=True)
        
        if df.empty:
            return df
        
        # --- [핵심 수정] ---
        # 이 함수는 정렬과 중복 제거만 책임집니다. (시간 형식 변환 코드 제거)
        df_sorted = df.sort_values(by='time', ascending=True)
        df_unique = df_sorted.drop_duplicates(subset=['time'], keep='last').reset_index(drop=True)

        table_name = f"ohlcv_{timeframe}"
            
        logger.debug(f"Successfully fetched and deduplicated {len(df_unique)} rows for {ticker} from {table_name}.")
        return df_unique

market_data_service = MarketDataService()