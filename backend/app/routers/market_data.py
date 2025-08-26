# file: backend/app/routers/market_data.py

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime
import logging

# ▼▼▼ [수정] 비동기 의존성 및 서비스 임포트 정리 ▼▼▼
from .. import schemas
from ..dependencies import get_async_db
from ..services.market_data_service import market_data_service
# ▲▲▲ [수정] ▲▲▲

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/market",
    tags=["Market Data"]
)

@router.get("/ohlcv", response_model=List[schemas.OHLCVData])
async def get_ohlcv(
    ticker: str = Query(..., description="코인 티커 (예: BTC/USDT)"),
    timeframe: str = Query(..., description="타임프레임 (예: 1h, 4h, 1d)"),
    limit: int = Query(500, ge=1, le=2000, description="데이터 개수 제한"),
    since: Optional[datetime] = Query(None, description="데이터 시작 시점 (ISO 형식)"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    지정된 티커와 타임프레임에 대한 OHLCV 시세 데이터를 비동기로 반환합니다.
    """
    try:
        df = await market_data_service.get_ohlcv_data(
            db=db,
            ticker=ticker,
            timeframe=timeframe,
            limit=limit,
            since=since
        )
        if df.empty:
            return []

        # 2. 인덱스를 'time' 컬럼으로 되돌립니다.
        df_api = df.reset_index()
        # 3. 'time' 컬럼을 UNIX 타임스탬프로 변환합니다.
        df_api['time'] = (df_api['time'].astype('int64') // 10**9)
        # 4. Pydantic 모델이 기대하는 딕셔너리 리스트로 변환하여 반환합니다.
        return df_api.to_dict('records')
    
    except Exception as e:
        logger.error(f"Error fetching OHLCV for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="시세 정보 조회 중 서버 오류가 발생했습니다.")