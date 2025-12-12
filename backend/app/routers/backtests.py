# file: backend/app/routers/backtests.py

from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid
from datetime import datetime, timedelta

from .. import schemas, models
from ..dependencies import get_async_db, get_current_active_user, create_owner_verifier
from ..services.backtest_service import backtest_service
from ..limiter import limiter
from ..tasks import run_backtest
from ..services.cost_calculator import cost_calculator_service
from ..services.credit_service import credit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backtests", tags=["Backtesting"])

get_verified_backtest = create_owner_verifier(models.Backtest)


@router.post(
    "/estimate-cost", 
    response_model=schemas.CostEstimationResponse, 
    summary="Estimate backtest credit cost"
)
async def estimate_backtest_cost(
    estimation_request: schemas.BacktestCostEstimationRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """백테스트 실행에 필요한 크레딧 비용을 미리 계산하여 반환합니다."""
    try:
        # 이제 라우터는 비용 계산 방식에 대해 전혀 알 필요가 없습니다.
        # 단순히 요청 데이터를 서비스에 전달하고 결과를 반환합니다.
        return await cost_calculator_service.calculate_cost_from_api_request(
            db, current_user, estimation_request
        )
    except Exception as e:
        logger.error(f"Error estimating backtest cost for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="비용 예측 중 서버 오류가 발생했습니다.")

@router.post(
    "",
    response_model=schemas.BacktestInCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request a new backtest job"
)
async def create_backtest(
    backtest_create: schemas.BacktestCreate,
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    # [개선] 예외 발생 시 안전한 로깅을 위해 이메일 정보를 미리 변수에 저장합니다.
    user_email_for_logging = current_user.email

    try:
        created_backtest = await backtest_service.request_backtest_transactional(
            db, user=current_user, backtest_create=backtest_create
        )
        
        try:
            task = run_backtest.delay(backtest_id=str(created_backtest.id))
            created_backtest.celery_task_id = task.id
            await db.flush()
        except Exception as celery_error:
            logger.error(f"Celery task dispatch failed for user {user_email_for_logging}: {celery_error}", exc_info=True)
            await db.rollback()
            raise HTTPException(status_code=500, detail="백테스트 작업 생성에 실패했습니다.")

        await db.commit()
        
        logger.info(f"Backtest job (ID: {created_backtest.id}) for user {user_email_for_logging} successfully created and dispatched.")

        return schemas.BacktestInCreateResponse.model_validate(created_backtest)
        
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        # [수정] 미리 저장해둔 변수를 사용하여 안전하게 로깅합니다.
        logger.error(f"Error processing backtest request for user {user_email_for_logging}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="백테스트 요청 처리 중 서버 오류가 발생했습니다.")




@router.get("", response_model=List[schemas.BacktestInList], summary="Get list of user's backtest records")
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

# --- [성능 최적화] 차트 데이터 제외한 핵심 정보만 반환 ---
@router.get("/{backtest_id}", response_model=schemas.BacktestCore, summary="Get core details of a specific backtest (without chart data)")
async def get_backtest_by_id(
    backtest_id: uuid.UUID, 
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    특정 ID의 백테스팅 작업 상세 정보 및 결과를 조회합니다.
    차트 데이터(pnlCurveJson, drawdownCurveJson)는 제외됩니다.
    차트 데이터는 별도 /charts 엔드포인트에서 조회하세요.
    """
    backtest = await backtest_service.get_backtest_by_id_for_user(
        db, backtest_id=backtest_id, user_id=current_user.id
    )
    logger.info(f"User (ID: {backtest.user_id}) accessed backtest: {backtest.id}.")
    return backtest

# --- [성능 최적화] 차트 데이터 전용 엔드포인트 ---
@router.get(
    "/{backtest_id}/charts", 
    response_model=schemas.BacktestChartData,
    response_model_by_alias=True,
    summary="Get chart data for a specific backtest"
)
async def get_backtest_charts(
    backtest_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    백테스트의 차트 데이터(PnL 곡선, 드로우다운 곡선)만 조회합니다.
    성능 최적화를 위해 핵심 정보와 분리하여 제공합니다.
    """
    chart_data = await backtest_service.get_chart_data_for_backtest(
        db, backtest_id=backtest_id, user_id=current_user.id
    )
    logger.info(f"User (ID: {current_user.id}) fetched chart data for backtest {backtest_id}.")
    return chart_data


# --- [성능 최적화] 페이지네이션 + 정렬 지원 거래 로그 엔드포인트 ---
@router.get(
    "/{backtest_id}/trade_logs", 
    response_model=schemas.PaginatedTradeLogs,
    response_model_by_alias=True,
    summary="Get paginated and sorted trade logs for a specific backtest"
)
async def get_backtest_trade_logs(
    backtest: models.Backtest = Depends(get_verified_backtest),
    db: AsyncSession = Depends(get_async_db),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(10, ge=1, le=200, description="Number of items per page"),
    sort_by: str = Query("timestamp", description="Sort field: timestamp, pnl"),
    sort_order: str = Query("desc", description="Sort order: asc, desc")
):
    """
    특정 백테스트의 상세 거래 기록을 페이지네이션+정렬하여 조회합니다. (소유권 자동 검증)
    """
    result = await backtest_service.get_trade_logs_paginated(
        db, backtest.id, page, limit, sort_by, sort_order
    )
    logger.info(f"User (ID: {backtest.user_id}) fetched page {page} of trade logs (sort: {sort_by} {sort_order}) for backtest {backtest.id}.")
    return result

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
    # [개선] 오류 발생 시 안전한 로깅을 위해 ID를 미리 변수에 저장
    backtest_id_for_logging = backtest_to_delete.id
    try:
        await backtest_service.delete_backtest(db, backtest_to_delete)
        # 수동 commit/rollback은 이미 제거된 상태여야 합니다.
    except Exception as e:
        # [개선] 실패한 객체 대신 미리 저장해둔 ID를 사용하여 안전하게 로깅
        logger.error(f"Error deleting backtest {backtest_id_for_logging}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="백테스트 기록 삭제 중 서버 오류가 발생했습니다.")