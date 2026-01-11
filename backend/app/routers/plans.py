# file: backend/app/routers/plans.py

from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List

from .. import schemas, models
from ..dependencies import get_async_db
from ..services.plan_service import plan_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/plans", tags=["Subscription Plans"])

@router.get("", response_model=List[schemas.PlanSchema], summary="Get all available subscription plans")
async def get_all_plans(
    db: AsyncSession = Depends(get_async_db)
):
    """
    서비스에서 제공하는 모든 구독 플랜의 목록과 상세 정보를 비동기로 조회합니다.
    이 엔드포인트는 인증이 필요하지 않습니다.
    """
    try:
        plans = await plan_service.get_all_plans(db)
        logger.info(f"Fetched {len(plans)} subscription plans.")
        return plans
    except Exception as e:
        logger.error(f"Error fetching subscription plans: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="플랜 정보를 불러오는 중 서버 오류가 발생했습니다.")