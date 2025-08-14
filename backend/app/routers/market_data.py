# 파일 경로: backend/app/routers/market_data.py (최종 수정 버전)

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

# 프로젝트 구조에 따라 스키마, 데이터베이스, 서비스를 정확히 임포트합니다.
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
    df = market_data_service.get_ohlcv_data(
        db=db,
        ticker=ticker,
        timeframe=timeframe,
        limit=limit,
        since=since
    )
    if df.empty:
        return []
    return df.to_dict('records')


@router.post("/calculate-indicators", response_model=schemas.IndicatorCalculationResponse)
def calculate_indicators(
    request: schemas.IndicatorCalculationRequest,
    db: Session = Depends(get_db)
):
    """
    주어진 시세 데이터와 지표 설정에 따라 기술적 분석 지표를 계산하여 반환합니다.
    """
    # 단순하고 명확한 'calculate_indicators' 함수를 호출합니다.
    calculated_data = market_data_service.calculate_indicators(db=db, request=request)
    
    return schemas.IndicatorCalculationResponse(results=calculated_data)