from fastapi import APIRouter, Depends
from .. import schemas
from ..dependencies import get_current_user # 현재 사용자 정보를 가져오는 의존성 함수 (이미 구현되어 있어야 함)
from ..models import User # User 모델 임포트

router = APIRouter(
    prefix="/dashboard", # 이 파일의 모든 경로는 /dashboard 로 시작
    tags=["dashboard"]    # API 문서에서 그룹화할 태그 이름
)

@router.get("/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(current_user: User = Depends(get_current_user)):
    """
    로그인한 사용자의 대시보드 요약 정보를 반환합니다.
    """
    # TODO: 데이터베이스에서 실제 데이터를 조회하는 로직 구현 필요
    
    # 지금은 프론트엔드 테스트를 위한 임시 목업 데이터를 반환합니다.
    mock_data = {
        "activeBotsCount": 5,
        "totalProfitLoss": 1250.75
    }
    return mock_data