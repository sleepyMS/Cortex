# file: backend/app/routers/strategies.py

from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid

from .. import schemas, models, security
from ..dependencies import get_async_db, get_current_active_user, create_owner_verifier
from ..services.strategy_service import strategy_service
from ..services.marketplace_service import marketplace_service
from ..services.signal_service import signal_service
from ..limiter import limiter
from ..schemas import StrategyInList 

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/strategies", tags=["Strategies"])

# Strategy 모델은 소유자 필드가 'author_id'이므로 명시해줍니다.
get_verified_strategy = create_owner_verifier(models.Strategy, owner_field="author_id")


# --- 전략 CRUD 엔드포인트 ---

@router.post("", response_model=schemas.Strategy, status_code=status.HTTP_201_CREATED, summary="Create a new trading strategy")
async def create_strategy(
    strategy_create: schemas.StrategyCreate,
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """새로운 사용자 정의 투자 전략을 생성합니다."""
    try:
        new_strategy = await strategy_service.create_strategy(db, current_user, strategy_create)
        
        # ▼▼▼ [핵심 수정] 응답 스키마(schemas.Strategy)에 필요한 'backtests'도 함께 로드하도록 추가합니다. ▼▼▼
        await db.refresh(new_strategy, attribute_names=['author', 'backtests'])
        
        # 모든 DB 작업(INSERT, SELECT)이 끝난 후 마지막에 commit 합니다.
        await db.commit()
        
        logger.info(f"Strategy '{new_strategy.name}' created by user {current_user.email}.")
        
        return new_strategy

    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating strategy for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="전략 생성 중 서버 오류가 발생했습니다.")

@router.get("", response_model=List[schemas.StrategyInList], summary="Get list of user's strategies")
async def get_strategies(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search_query: Optional[str] = Query(None, description="Search by strategy name"),
    sort_by: Optional[str] = Query(None, description="Sort order (e.g., 'updated_at_desc', 'name_asc')"),
    is_public_filter: Optional[bool] = Query(None, description="Filter by public status"),
    indicator_filter: Optional[str] = Query(None, description="Filter by key indicator (e.g., 'RSI', 'MACD')")
):
    """현재 로그인된 사용자의 저장된 전략 목록을 비동기로 조회합니다."""
    
    strategies = await strategy_service.get_strategies(
        db, user_id=current_user.id, skip=skip, limit=limit,
        search_query=search_query, sort_by=sort_by,
        is_public_filter=is_public_filter, indicator_filter=indicator_filter
    )
    logger.info(f"User {current_user.email} fetched {len(strategies)} strategies.")
    return strategies

@router.get(
    "/{strategy_id}/summary",
    response_model=schemas.StrategyInList, # 응답 모델을 '요약' 스키마로 지정
    summary="Get public summary of a strategy"
)
async def get_strategy_summary(
    strategy_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db)
):
    """
    인증 없이 전략의 공개 가능한 요약 정보만 조회합니다.
    전략 규칙(longEntryRules 등)은 절대 반환하지 않습니다.
    """
    # 서비스 계층에 이와 같은 요약 정보만 조회하는 함수를 만드는 것이 좋습니다.
    # 예: strategy_service.get_strategy_summary_by_id(db, strategy_id)
    # 여기서는 간단하게 상세 조회 후, 스키마에 의해 필터링되는 것을 보여줍니다.
    
    result = await db.execute(
        select(models.Strategy)
        .options(
            # 목록 페이지와 같이 필요한 최소한의 관계만 로드합니다.
            joinedload(models.Strategy.latest_backtest_summary),
            joinedload(models.Strategy.marketplace_listing)
        )
        .filter(models.Strategy.id == strategy_id)
    )
    strategy = result.scalar_one_or_none()

    if not strategy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="전략을 찾을 수 없습니다."
        )
        
    # response_model=schemas.StrategyInList 덕분에,
    # strategy 객체에 longEntryRules 등이 있더라도 자동으로 필터링되어 반환됩니다.
    return strategy

@router.get("/{strategy_id}", response_model=schemas.Strategy, summary="Get a specific strategy by ID")
async def get_strategy_by_id(
    strategy_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_active_user)
):
    """
    특정 ID의 전략 상세 정보를 조회합니다. (권한 검증 포함)
    """
    strategy = await strategy_service.get_strategy_for_user(
        db, strategy_id=strategy_id, user=current_user
    )
    logger.info(f"User (ID: {current_user.id}) accessed strategy: {strategy.name} (ID: {strategy.id}).")
    return strategy

@router.put("/{strategy_id}", response_model=schemas.Strategy, summary="Update a specific strategy")
async def update_strategy(
    strategy_update: schemas.StrategyUpdate,
    strategy_to_update: models.Strategy = Depends(get_verified_strategy),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 ID의 전략을 비동기로 업데이트합니다."""
    try:
        updated_strategy_instance = await strategy_service.update_strategy(db, strategy_to_update, strategy_update)
        
        await db.refresh(updated_strategy_instance, attribute_names=['author', 'backtests'])

        await db.commit()
        
        logger.info(f"Strategy '{updated_strategy_instance.name}' updated by user (ID: {updated_strategy_instance.author_id}).")
        
        return updated_strategy_instance
        
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating strategy {strategy_to_update.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="전략 업데이트 중 서버 오류가 발생했습니다.")

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
    # logger.critical("<<<<< [STRATEGIES ROUTER] /calculate-signals API CALLED >>>>>")

    try:
        # generate_signals는 이제 (DataFrame, str) 튜플을 반환합니다.
        # 이 API에서는 DataFrame만 필요하므로 첫 번째 값만 사용합니다.
        signals_dataframe, _ = await signal_service.generate_signals(request=payload)
        
        signals_list = []
        if not signals_dataframe.empty:
            signals_df_reset = signals_dataframe.reset_index()
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
