# file: backend/app/routers/plans.py

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
import logging
from typing import List

from .. import schemas, models
from ..database import get_db
from ..services.plan_service import plan_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plans", tags=["Plans"])

# --- 구독 플랜 관련 엔드포인트 ---

@router.get("/", response_model=List[schemas.PlanSchema], summary="Get all available subscription plans")
async def get_all_plans(
    db: Session = Depends(get_db)
):
    """
    서비스에서 제공하는 모든 구독 플랜의 목록과 상세 정보를 조회합니다.
    이 엔드포인트는 인증이 필요하지 않습니다.
    """
    try:
        plans = plan_service.get_all_plans(db)
        logger.info(f"Successfully retrieved {len(plans)} subscription plans.")
        return plans
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching plans: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="플랜 정보를 불러오는 중 서버 오류가 발생했습니다."
        )