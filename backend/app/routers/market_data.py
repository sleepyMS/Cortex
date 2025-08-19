# file: backend/app/routers/market_data.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from .. import schemas
from ..database import get_db
from ..services.market_data_service import market_data_service

router = APIRouter(
    prefix="/market",
    tags=["Market Data"]
)

@router.get("/ohlcv", response_model=List[schemas.OHLCVData])
def get_ohlcv(
    ticker: str = Query(..., description="코인 티커 (예: BTC/USDT)"),
    timeframe: str = Query(..., description="타임프레임 (예: 1h, 4h, 1d)"),
    limit: int = Query(1000, ge=1, le=2000, description="데이터 개수 제한"),
    since: Optional[datetime] = Query(None, description="데이터 시작 시점 (ISO 형식)"),
    db: Session = Depends(get_db)
):
    """
    지정된 티커와 타임프레임에 대한 순수 OHLCV 시세 데이터를 반환합니다.
    """
    df = market_data_service.get_ohlcv_data(
        db=db,
        ticker=ticker,
        timeframe=timeframe,
        limit=limit,
        since=since
    )
    if df.empty:
        return []
    # DataFrame을 API 응답 형식(dict list)으로 변환
    return df.to_dict('records')