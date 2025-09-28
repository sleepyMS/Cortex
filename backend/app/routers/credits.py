# file: backend/app/routers/credits.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import uuid

from .. import schemas, models
from ..dependencies import get_async_db, get_current_active_user
from ..services.cost_calculator import cost_calculator_service
from ..services.credit_service import credit_service

logger = logging.getLogger(__name__)

# 새로운 'Credits' 태그를 가진 라우터를 생성합니다.
router = APIRouter(prefix="/credits", tags=["Credits"])


@router.post(
    "/estimate-cost",
    response_model=schemas.CostEstimationResponse,
    summary="Estimate credit cost for a backtest"
)
async def estimate_cost(
    params: schemas.CostEstimationRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    백테스트 파라미터를 기반으로 예상 소모 크레딧을 계산합니다.
    사용자의 현재 구독 플랜에 따른 할인율이 자동으로 적용됩니다.
    """
    try:
        # 준비된 cost_calculator_service의 함수를 호출하여 결과를 반환합니다.
        estimation_result = await cost_calculator_service.calculate_credit_cost(
            db=db, user=current_user, params=params
        )
        return estimation_result
    except Exception as e:
        logger.error(
            f"Error estimating cost for user {current_user.email} with params {params.model_dump()}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="비용을 계산하는 중 오류가 발생했습니다."
        )

@router.get(
    "/transactions/{transaction_id}",
    response_model=schemas.CreditTransactionResponse,
    summary="Get details of a single credit transaction"
)
async def get_transaction_details(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user),
):
    """
    특정 크레딧 '사용' 거래의 상세 내역(어떤 원장에서 얼마씩 차감되었는지)을 조회합니다.
    """
    transaction = await credit_service.get_transaction_by_id(db, transaction_id)
    
    if not transaction or transaction['user_id'] != current_user.id:
        raise HTTPException(status_code=404, detail="거래 내역을 찾을 수 없습니다.")
    
    return transaction