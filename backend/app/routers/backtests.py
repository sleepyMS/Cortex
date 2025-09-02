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
from ..tasks import run_backtest

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
    user_email_for_log = current_user.email
    
    try:
        # 1. 서비스 호출: DB 객체만 생성 (아직 미커밋)
        new_backtest = await backtest_service.create_backtest_job(db, current_user, backtest_create)
        
        # 2. [핵심 수정] DB 트랜잭션을 먼저 커밋합니다.
        await db.commit()
        await db.refresh(new_backtest) # 커밋 후 최신 상태를 DB에서 다시 로드

        # 3. [핵심 수정] 커밋이 성공한 후에 Celery 작업을 전송합니다.
        try:
            async_result = run_backtest.delay(backtest_id=str(new_backtest.id))
            # Task ID를 DB에 업데이트하고 다시 커밋합니다.
            new_backtest.celery_task_id = async_result.id
            await db.commit()
            logger.info(f"Celery task dispatched for Backtest ID: {new_backtest.id} with Celery Task ID: {async_result.id}.")
        except Exception as e:
            logger.error(f"Failed to dispatch Celery task for Backtest ID {new_backtest.id}: {e}", exc_info=True)
            new_backtest.status = 'failed_dispatch'
            await db.commit() # 실패 상태도 커밋
            raise HTTPException(status_code=500, detail="백테스트 작업 시작에 실패했습니다.")
        
        created_backtest = await backtest_service.get_backtest_by_id(db, new_backtest.id)
        logger.info(f"Backtest job (ID: {created_backtest.id}) requested for user {user_email_for_log}.")
        return created_backtest

    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating backtest job for user {user_email_for_log}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="백테스트 작업 생성 중 서버 오류가 발생했습니다.")

@router.get("/", response_model=List[schemas.BacktestInList], summary="Get list of user's backtest records")
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
    backtest_id: uuid.UUID, 
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    특정 ID의 백테스팅 작업 상세 정보 및 결과를 조회합니다.
    (소유권 검증 및 모든 연관 데이터 Eager Loading 포함)
    """
    # 1. [핵심] 우리가 수정한, Eager Loading 로직이 포함된 서비스 함수를 직접 호출합니다.
    backtest = await backtest_service.get_backtest_by_id(db, backtest_id)

    # 2. 서비스 함수 호출 후, 소유권을 수동으로 검증합니다.
    if not backtest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="백테스트를 찾을 수 없습니다.")
    if backtest.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 백테스트에 접근할 권한이 없습니다.")

    logger.warning(f"User (ID: {backtest.user_id}) accessed backtest: {backtest.id}.")
    logger.warning("[API] Returning backtest detail: %s", backtest)

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
    
@router.delete("/{backtest_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific backtest record")
async def delete_backtest_record(
    backtest_to_delete: models.Backtest = Depends(get_verified_backtest),
    db: AsyncSession = Depends(get_async_db)
):
    """
    특정 ID의 백테스트 기록을 삭제합니다. (소유권 자동 검증)
    성공 시 204 No Content를 반환합니다.
    """
    try:
        await backtest_service.delete_backtest(db, backtest_to_delete)
        await db.commit()
        # 성공 시에는 내용(content)이 없는 응답을 보내는 것이 RESTful API 표준입니다.
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting backtest {backtest_to_delete.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="백테스트 기록 삭제 중 서버 오류가 발생했습니다.")