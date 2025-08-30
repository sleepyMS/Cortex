# file: backend/app/routers/indicators.py

from fastapi import APIRouter
from typing import List, Dict, Any

from ..services.indicator_service import indicator_service

router = APIRouter(prefix="/indicators", tags=["Indicators"])

@router.get("/metadata", response_model=List[Dict[str, Any]], summary="Get metadata for all supported indicators")
def get_indicator_metadata():
    """
    프론트엔드 전략 빌더 UI를 구성하는 데 필요한 모든 지표의 상세 메타데이터를 반환합니다.
    이 데이터는 앱 로딩 시 한 번만 호출하면 됩니다.
    """
    return indicator_service.get_all_metadata()