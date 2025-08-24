# file: backend/app/routers/backtests.py

from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid

from .. import schemas, models, security
from ..dependencies import get_async_db, get_current_active_user, create_owner_verifier
from ..services.backtest_service import backtest_service
from ..limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backtests", tags=["Backtesting"])

get_verified_backtest = create_owner_verifier(models.Backtest)

@router.post("/", response_model=schemas.Backtest, status_code=status.HTTP_202_ACCEPTED, summary="Request a new backtest job")
@limiter.limit("5/minute")
async def create_backtest(
    backtest_create: schemas.BacktestCreate,
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    새로운 백테스팅 작업을 요청합니다. 작업은 비동기적으로 처리됩니다.
    """
    try:
        new_backtest = await backtest_service.create_backtest_job(db, current_user, backtest_create)
        await db.commit()
        # Eager Loading을 위해 ID로 다시 조회
        created_backtest = await backtest_service.get_backtest_by_id(db, new_backtest.id)
        logger.info(f"Backtest job (ID: {created_backtest.id}) requested for user {current_user.email}.")
        return created_backtest
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating backtest job for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="백테스트 작업 생성 중 서버 오류가 발생했습니다.")

@router.get("/", response_model=List[schemas.Backtest], summary="Get list of user's backtest records")
async def get_backtests(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by backtest status"),
    strategy_id_filter: Optional[uuid.UUID] = Query(None, description="Filter by strategy ID")
):
    """
    현재 로그인된 사용자의 백테스팅 기록 목록을 비동기로 조회합니다.
    """
    backtests = await backtest_service.get_backtests(
        db, user_id=current_user.id, skip=skip, limit=limit,
        status_filter=status_filter, strategy_id_filter=strategy_id_filter
    )
    logger.info(f"User {current_user.email} fetched {len(backtests)} backtest records.")
    return backtests

@router.get("/{backtest_id}", response_model=schemas.Backtest, summary="Get details and result of a specific backtest")
async def get_backtest_by_id(
    backtest: models.Backtest = Depends(get_verified_backtest)
):
    """
    특정 ID의 백테스팅 작업 상세 정보 및 결과를 조회합니다. (소유권 자동 검증)
    """
    logger.info(f"User (ID: {backtest.user_id}) accessed backtest: {backtest.id}.")
    return backtest

@router.get("/{backtest_id}/trade_logs", response_model=List[schemas.TradeLogEntry], summary="Get trade logs for a specific backtest")
async def get_backtest_trade_logs(
    backtest: models.Backtest = Depends(get_verified_backtest),
    db: AsyncSession = Depends(get_async_db)
):
    """
    특정 백테스트의 상세 거래 기록 목록을 조회합니다. (소유권 자동 검증)
    """
    trade_logs = await backtest_service.get_trade_logs_for_backtest(db, backtest.id)
    logger.info(f"User (ID: {backtest.user_id}) fetched {len(trade_logs)} trade logs for backtest {backtest.id}.")
    return trade_logs

@router.post("/{backtest_id}/cancel", status_code=status.HTTP_202_ACCEPTED, summary="Request to cancel a running backtest job")
async def cancel_backtest(
    backtest_to_cancel: models.Backtest = Depends(get_verified_backtest),
    db: AsyncSession = Depends(get_async_db)
):
    """
    진행 중인 백테스팅 작업을 취소하도록 요청합니다. (소유권 자동 검증)
    """
    try:
        await backtest_service.cancel_backtest_job(db, backtest_to_cancel)
        await db.commit()
        logger.info(f"Backtest ID {backtest_to_cancel.id} cancellation requested by user (ID: {backtest_to_cancel.user_id}).")
        return {"message": "백테스트 취소 요청이 접수되었습니다."}
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error canceling backtest {backtest_to_cancel.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="백테스트 취소 중 서버 오류가 발생했습니다.")