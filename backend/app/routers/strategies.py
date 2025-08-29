# file: backend/app/routers/strategies.py

from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid

from .. import schemas, models, security
# ▼▼▼ [수정] 비동기 의존성 및 팩토리 함수, 서비스 임포트 정리 ▼▼▼
from ..dependencies import get_async_db, get_current_active_user, create_owner_verifier
from ..services.strategy_service import strategy_service
from ..services.market_data_service import market_data_service
from ..services.signal_service import signal_service
from ..limiter import limiter
# ▲▲▲ [수정] ▲▲▲

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/strategies", tags=["Strategies"])

# ▼▼▼ [추가] 라우터 파일 내에서 필요한 의존성을 직접 생성 ▼▼▼
# Strategy 모델은 소유자 필드가 'author_id'이므로 명시해줍니다.
get_verified_strategy = create_owner_verifier(models.Strategy, owner_field="author_id")
# ▲▲▲ [추가] ▲▲▲


# --- 전략 CRUD 엔드포인트 ---

@router.post("/", response_model=schemas.Strategy, status_code=status.HTTP_201_CREATED, summary="Create a new trading strategy")
@limiter.limit("20/minute")
async def create_strategy(
    strategy_create: schemas.StrategyCreate,
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """새로운 사용자 정의 투자 전략을 생성합니다."""
    try:
        new_strategy = await strategy_service.create_strategy(db, current_user, strategy_create)
        await db.commit()
        # Eager Loading을 위해 ID로 다시 조회
        created_strategy = await strategy_service.get_strategy_by_id_with_author(db, new_strategy.id)
        logger.info(f"Strategy '{created_strategy.name}' created by user {current_user.email}.")
        return created_strategy
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating strategy for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="전략 생성 중 서버 오류가 발생했습니다.")

@router.get("/", response_model=List[schemas.Strategy], summary="Get list of user's strategies")
async def get_strategies(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search_query: Optional[str] = Query(None, description="Search by strategy name"),
    sort_by: Optional[str] = Query(None, description="Sort order (e.g., 'updated_at_desc', 'name_asc')"),
    is_public_filter: Optional[str] = Query(None, description="Filter by public status ('true' or 'false')"),
    indicator_filter: Optional[str] = Query(None, description="Filter by key indicator (e.g., 'RSI', 'MACD')")
):
    """현재 로그인된 사용자의 저장된 전략 목록을 비동기로 조회합니다."""
    is_public_filter_bool: Optional[bool] = None
    if is_public_filter == "true":
        is_public_filter_bool = True
    elif is_public_filter == "false":
        is_public_filter_bool = False

    strategies = await strategy_service.get_strategies(
        db, user_id=current_user.id, skip=skip, limit=limit,
        search_query=search_query, sort_by=sort_by,
        is_public_filter=is_public_filter_bool, indicator_filter=indicator_filter
    )
    logger.info(f"User {current_user.email} fetched {len(strategies)} strategies.")
    return strategies

@router.get("/{strategy_id}", response_model=schemas.Strategy, summary="Get a specific strategy by ID")
async def get_strategy_by_id(
    strategy: models.Strategy = Depends(get_verified_strategy)
):
    """특정 ID의 전략 상세 정보를 조회합니다. (소유권 자동 검증)"""
    logger.info(f"User (ID: {strategy.author_id}) accessed strategy: {strategy.name} (ID: {strategy.id}).")
    return strategy

@router.put("/{strategy_id}", response_model=schemas.Strategy, summary="Update a specific strategy")
async def update_strategy(
    strategy_update: schemas.StrategyUpdate,
    strategy_to_update: models.Strategy = Depends(get_verified_strategy),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 ID의 전략을 비동기로 업데이트합니다."""
    try:
        updated_strategy = await strategy_service.update_strategy(db, strategy_to_update, strategy_update)
        await db.commit()
        await db.refresh(updated_strategy)
        logger.info(f"Strategy '{updated_strategy.name}' updated by user (ID: {updated_strategy.author_id}).")
        return updated_strategy
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating strategy {strategy_to_update.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="전략 업데이트 중 서버 오류가 발생했습니다.")

@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific strategy")
async def delete_strategy(
    strategy_to_delete: models.Strategy = Depends(get_verified_strategy),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 ID의 전략을 비동기로 삭제합니다."""
    try:
        await strategy_service.delete_strategy(db, strategy_to_delete)
        await db.commit()
        logger.info(f"Strategy ID {strategy_to_delete.id} deleted by user (ID: {strategy_to_delete.author_id}).")
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting strategy {strategy_to_delete.id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="전략 삭제 중 서버 오류가 발생했습니다.")


# --- 전략 분석 관련 엔드포인트 ---

@router.post("/calculate-indicators", response_model=schemas.IndicatorCalculationResponse, summary="Calculate technical indicators")
async def calculate_indicators(
    request: schemas.IndicatorCalculationRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """차트에 표시할 기술적 지표들을 계산합니다."""
    try:
        calculated_data = await signal_service.calculate_indicators(db=db, request=request)
        return schemas.IndicatorCalculationResponse(results=calculated_data)
    except Exception as e:
        logger.error(f"Error calculating indicators for request {request.ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="지표 계산 중 오류가 발생했습니다.")


@router.post("/calculate-signals", response_model=schemas.SignalCalculationResponse, summary="Calculate trading signals for chart display")
@limiter.limit("60/minute")
async def calculate_realtime_signals(
    request: Request,
    payload: schemas.SignalCalculationRequest,
    current_user: models.User = Depends(get_current_active_user)
):
    """전략 편집기 차트에 표시할 매매 신호를 실시간으로 계산합니다."""
    logger.critical("<<<<< [STRATEGIES ROUTER] /calculate-signals API CALLED >>>>>")

    try:
        # ▼▼▼ [핵심 수정] 튜플 반환값을 올바르게 받도록 수정 ▼▼▼
        # generate_signals는 이제 (DataFrame, str) 튜플을 반환합니다.
        # 이 API에서는 DataFrame만 필요하므로 첫 번째 값만 사용합니다.
        signals_dataframe, _ = await signal_service.generate_signals(request=payload)
        # ▲▲▲ [핵심 수정] ▲▲▲
        
        signals_list = []
        if not signals_dataframe.empty:
            signals_df_reset = signals_dataframe.reset_index()
            # [수정] BacktestingEngine과 형식을 맞추기 위해 컬럼명을 'time_dt'로 변경
            signals_df_reset['time'] = (signals_df_reset['time_dt'].astype('int64') // 10**9)
            signals_list = [
                schemas.SignalDataPoint(time=row['time'], signal_type=row['signal'])
                for _, row in signals_df_reset.iterrows()
            ]

        response = schemas.SignalCalculationResponse(signals=signals_list)
        
        logger.info(f"User {current_user.email} calculated {len(response.signals)} signals for {payload.ticker}.")
        return response
    except Exception as e:
        logger.error(f"Error calculating signals for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="신호 계산 중 오류가 발생했습니다.")
