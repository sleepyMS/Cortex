# file: backend/app/routers/backtests.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import logging
from typing import List, Optional, Dict, Any

from .. import schemas, models, security
from ..database import get_db
from ..services.backtest_service import backtest_service # 👈 백테스트 서비스 임포트

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backtests", tags=["Backtesting"])

# --- 백테스팅 관련 엔드포인트 ---

@router.post("/", response_model=schemas.Backtest, status_code=status.HTTP_202_ACCEPTED, summary="Request a new backtest job")
async def create_backtest(
    backtest_create: schemas.BacktestCreate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    새로운 백테스팅 작업을 요청합니다. 작업은 비동기적으로 처리되며,
    요청 성공 시 백테스트 작업 정보가 즉시 반환됩니다.
    플랜별 제한 및 전략 규칙 유효성 검사가 수행됩니다.
    """
    try:
        new_backtest = backtest_service.create_backtest_job(db, current_user, backtest_create)
        db.commit() # 서비스에서 flush 후 여기서 커밋
        db.refresh(new_backtest) # Celery task ID 등의 정보가 반영될 수 있음
        logger.info(f"Backtest job (ID: {new_backtest.id}) requested for user {current_user.email} with strategy ID: {new_backtest.strategy_id}. Celery Task ID: {new_backtest.id} (assumed).") # Assuming backtest.id is Celery ID
        return new_backtest
    except HTTPException as e: # 서비스에서 발생한 HTTP 오류 (예: 제한 초과, 권한 없음)
        db.rollback()
        logger.warning(f"Failed to create backtest for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e: # 예상치 못한 오류
        db.rollback()
        logger.error(f"An unexpected error occurred while creating backtest for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="백테스트 작업 생성 중 서버 오류가 발생했습니다."
        )


@router.get("/", response_model=List[schemas.Backtest], summary="Get list of user's backtest records")
async def get_backtests(
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by backtest status (e.g., 'pending', 'running', 'completed', 'failed', 'canceled')"),
    strategy_id_filter: Optional[int] = Query(None, description="Filter by strategy ID")
):
    """
    현재 로그인된 사용자의 백테스팅 기록 목록을 조회합니다.
    상태 및 전략 ID로 필터링할 수 있으며, 페이지네이션을 지원합니다.
    """
    backtests = backtest_service.get_backtests(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        status_filter=status_filter,
        strategy_id_filter=strategy_id_filter
    )
    logger.info(f"User {current_user.email} fetched {len(backtests)} backtest records.")
    return backtests


@router.get("/{backtest_id}", response_model=schemas.Backtest, summary="Get details and result of a specific backtest")
async def get_backtest_by_id(
    backtest_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 백테스팅 작업 상세 정보 및 결과를 조회합니다.
    """
    backtest = backtest_service.get_backtest_by_id(db, backtest_id)
    if not backtest:
        logger.warning(f"Backtest ID {backtest_id} not found for user {current_user.email}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="백테스트 기록을 찾을 수 없습니다.")
    
    if backtest.user_id != current_user.id:
        logger.warning(f"User {current_user.email} (ID: {current_user.id}) attempted to access backtest {backtest_id} not owned by them.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 백테스트 기록에 접근할 권한이 없습니다.")
    
    logger.info(f"User {current_user.email} accessed backtest: {backtest.id}.")
    return backtest


@router.get("/{backtest_id}/trade_logs", response_model=List[schemas.TradeLogEntry], summary="Get trade logs for a specific backtest")
async def get_backtest_trade_logs(
    backtest_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 백테스트의 상세 거래 기록 목록을 조회합니다.
    """
    backtest = backtest_service.get_backtest_by_id(db, backtest_id) # 소유권 검증을 위해 재사용
    if not backtest:
        logger.warning(f"Backtest ID {backtest_id} not found for user {current_user.email}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="백테스트 기록을 찾을 수 없습니다.")
    
    if backtest.user_id != current_user.id:
        logger.warning(f"User {current_user.email} (ID: {current_user.id}) attempted to access trade logs for backtest {backtest_id} not owned by them.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 백테스트 기록의 거래 로그에 접근할 권한이 없습니다.")

    trade_logs = backtest_service.get_trade_logs_for_backtest(db, backtest_id)
    logger.info(f"User {current_user.email} fetched {len(trade_logs)} trade logs for backtest {backtest_id}.")
    return trade_logs


@router.post("/{backtest_id}/cancel", status_code=status.HTTP_202_ACCEPTED, summary="Request to cancel a running backtest job")
async def cancel_backtest(
    backtest_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    진행 중인 백테스팅 작업을 취소하도록 요청합니다.
    """
    try:
        success = backtest_service.cancel_backtest_job(db, backtest_id, current_user.id)
        if not success:
            logger.warning(f"Backtest ID {backtest_id} not found or user {current_user.email} has no permission to cancel.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="백테스트를 찾을 수 없거나 취소할 권한이 없습니다.")
        
        db.commit() # 서비스에서 상태 변경 후 여기서 커밋
        logger.info(f"Backtest ID {backtest_id} cancellation requested by user {current_user.email}.")
        return {"message": "백테스트 취소 요청이 접수되었습니다."}
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to cancel backtest {backtest_id} for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while canceling backtest {backtest_id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="백테스트 취소 중 서버 오류가 발생했습니다."
        )