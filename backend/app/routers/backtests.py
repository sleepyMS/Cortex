# file: backend/app/routers/backtests.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import logging
from typing import List, Optional
import uuid

# 👇 [수정] dependencies에서 get_verified_backtest를 import 합니다.
from .. import schemas, models, security
from ..dependencies import get_verified_backtest, get_verified_strategy
from ..database import get_db
from ..services.backtest_service import backtest_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backtests", tags=["Backtesting"])

# --- 백테스팅 관련 엔드포인트 ---

# [변경 없음] 새로운 백테스트를 '생성'하므로, 기존 객체에 대한 소유권 검증이 필요 없습니다.
@router.post("/", response_model=schemas.Backtest, status_code=status.HTTP_202_ACCEPTED, summary="Request a new backtest job")
async def create_backtest(
    backtest_create: schemas.BacktestCreate,
    current_user: models.User = Depends(security.get_current_active_user),
    strategy_to_use: models.Strategy = Depends(get_verified_strategy),
    db: Session = Depends(get_db)
):
    """
    새로운 백테스팅 작업을 요청합니다. 작업은 비동기적으로 처리됩니다.
    """
    try:
        new_backtest = backtest_service.create_backtest_job(db, current_user, strategy_to_use, backtest_create)
        db.commit()
        db.refresh(new_backtest)
        logger.info(f"Backtest job (ID: {new_backtest.id}) requested for user {current_user.email} with strategy ID: {new_backtest.strategy_id}.")
        return new_backtest
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to create backtest for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while creating backtest for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="백테스트 작업 생성 중 서버 오류가 발생했습니다."
        )

# [변경 없음] 현재 '로그인한 사용자'의 백테스트 목록을 가져오므로, 서비스 레이어에서 user_id로 필터링합니다.
@router.get("/", response_model=List[schemas.Backtest], summary="Get list of user's backtest records")
async def get_backtests(
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by backtest status"),
    # 👇 [수정] strategy_id_filter의 타입도 uuid.UUID로 변경합니다.
    strategy_id_filter: Optional[uuid.UUID] = Query(None, description="Filter by strategy ID")
):
    """
    현재 로그인된 사용자의 백테스팅 기록 목록을 조회합니다.
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

# 👇 [개선] 소유권 검증 로직을 의존성 주입으로 대체
@router.get("/{backtest_id}", response_model=schemas.Backtest, summary="Get details and result of a specific backtest")
async def get_backtest_by_id(
    # ID를 직접 받는 대신, 'get_verified_backtest'가 검증을 마친 Backtest 객체를 주입해줍니다.
    backtest: models.Backtest = Depends(get_verified_backtest)
):
    """
    특정 ID의 백테스팅 작업 상세 정보 및 결과를 조회합니다. (소유권 자동 검증)
    """
    # 수동으로 하던 조회 및 권한 검사 로직이 모두 사라집니다.
    logger.info(f"User (ID: {backtest.user_id}) accessed backtest: {backtest.id}.")
    return backtest

# 👇 [개선] 소유권 검증 로직을 의존성 주입으로 대체
@router.get("/{backtest_id}/trade_logs", response_model=List[schemas.TradeLogEntry], summary="Get trade logs for a specific backtest")
async def get_backtest_trade_logs(
    # trade_logs를 가져올 대상 backtest 객체를 의존성 주입으로 안전하게 가져옵니다.
    backtest: models.Backtest = Depends(get_verified_backtest),
    db: Session = Depends(get_db)
):
    """
    특정 백테스트의 상세 거래 기록 목록을 조회합니다. (소유권 자동 검증)
    """
    # 수동으로 하던 중복된 권한 검사 로직이 사라집니다.
    trade_logs = backtest_service.get_trade_logs_for_backtest(db, backtest.id)
    logger.info(f"User (ID: {backtest.user_id}) fetched {len(trade_logs)} trade logs for backtest {backtest.id}.")
    return trade_logs

# 👇 [개선] 소유권 검증 로직을 의존성 주입으로 대체
@router.post("/{backtest_id}/cancel", status_code=status.HTTP_202_ACCEPTED, summary="Request to cancel a running backtest job")
async def cancel_backtest(
    # 취소할 대상 backtest 객체를 의존성 주입으로 안전하게 가져옵니다.
    backtest_to_cancel: models.Backtest = Depends(get_verified_backtest),
    db: Session = Depends(get_db)
):
    """
    진행 중인 백테스팅 작업을 취소하도록 요청합니다. (소유권 자동 검증)
    """
    try:
        # 서비스 레이어 함수는 이제 더 단순한 인자만 받게 됩니다.
        backtest_service.cancel_backtest_job(db, backtest_to_cancel)
        db.commit()
        logger.info(f"Backtest ID {backtest_to_cancel.id} cancellation requested by user (ID: {backtest_to_cancel.user_id}).")
        return {"message": "백테스트 취소 요청이 접수되었습니다."}
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to cancel backtest {backtest_to_cancel.id} for user (ID: {backtest_to_cancel.user_id}): {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while canceling backtest {backtest_to_cancel.id} for user (ID: {backtest_to_cancel.user_id}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="백테스트 취소 중 서버 오류가 발생했습니다."
        )