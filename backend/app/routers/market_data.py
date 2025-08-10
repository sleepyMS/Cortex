# file: backend/app/routers/market_data.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from .. import schemas
from ..database import get_db
from ..services import market_data_service

router = APIRouter(
    prefix="/market",
    tags=["Market Data"]
)

@router.get("/ohlcv", response_model=List[schemas.OHLCVData])
def get_ohlcv(
    ticker: str = Query(..., description="코인 티커 (예: BTC/USDT)"),
    timeframe: str = Query(..., description="타임프레임 (예: 1h, 4h, 1d)"),
    limit: int = Query(500, ge=1, le=2000, description="데이터 개수 제한"),
    since: Optional[datetime] = Query(None, description="데이터 시작 시점 (ISO 형식)"),
    db: Session = Depends(get_db)
):
    """
    지정된 티커와 타임프레임에 대한 OHLCV 시세 데이터를 반환합니다.
    """
    return market_data_service.get_ohlcv_data(
        db=db,
        ticker=ticker,
        timeframe=timeframe,
        limit=limit,
        since=since
    )

@router.post("/calculate-indicators", response_model=schemas.IndicatorCalculationResponse)
def calculate_indicators(
    request: schemas.IndicatorCalculationRequest,
    db: Session = Depends(get_db)
):
    """
    주어진 시세 데이터와 지표 설정에 따라 기술적 분석 지표를 계산하여 반환합니다.
    """
    calculated_data = market_data_service.calculate_indicators(db, request)
    return schemas.IndicatorCalculationResponse(results=calculated_data)