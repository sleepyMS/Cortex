# file: backend/app/routers/strategies.py

from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from sqlalchemy.orm import Session
import logging
from typing import List, Optional
import uuid

from .. import schemas, models, security
from ..dependencies import get_verified_strategy
from ..database import get_db
from ..services.strategy_service import strategy_service
from ..limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/strategies", tags=["strategies"])

# --- 전략 관련 엔드포인트 ---

@router.post("/", response_model=schemas.Strategy, status_code=status.HTTP_201_CREATED, summary="Create a new trading strategy")
@limiter.limit("20/minute")
async def create_strategy(
    strategy_create: schemas.StrategyCreate,
    request: Request, 
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    새로운 사용자 정의 투자 전략을 생성합니다.
    """
    try:
        new_strategy = strategy_service.create_strategy(db, current_user, strategy_create)
        db.commit()
        db.refresh(new_strategy)
        logger.info(f"Strategy '{new_strategy.name}' (ID: {new_strategy.id}) created by user {current_user.email}.")
        return new_strategy
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to create strategy for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while creating strategy for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="전략 생성 중 서버 오류가 발생했습니다."
        )

# 현재 '로그인한 사용자'의 전략 목록을 가져오는 것이므로, 서비스 레이어에서 user_id로 필터링합니다.
@router.get("/", response_model=List[schemas.Strategy], summary="Get list of user's strategies")
async def get_strategies(
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search_query: Optional[str] = Query(None, description="Search by strategy name"),
    sort_by: Optional[str] = Query(None, description="Sort order (e.g., 'created_at_desc', 'name_asc')"),
    is_public_filter: Optional[str] = Query(None, description="Filter by public status ('true' or 'false')")
):
    """
    현재 로그인된 사용자의 저장된 전략 목록을 조회합니다.
    """
    # ... (기존 로직 동일)
    is_public_filter_bool: Optional[bool] = None
    if is_public_filter == "true":
        is_public_filter_bool = True
    elif is_public_filter == "false":
        is_public_filter_bool = False

    strategies = strategy_service.get_strategies(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        search_query=search_query,
        sort_by=sort_by,
        is_public_filter=is_public_filter_bool
    )
    logger.info(f"User {current_user.email} fetched {len(strategies)} strategies.")
    return strategies

# 소유권 검증 로직을 의존성 주입으로 대체
@router.get("/{strategy_id}", response_model=schemas.Strategy, summary="Get a specific strategy by ID")
async def get_strategy_by_id(
    # ID를 직접 받는 대신, 'get_verified_strategy'가 검증을 마친 Strategy 객체를 주입해줍니다.
    strategy: models.Strategy = Depends(get_verified_strategy)
):
    """
    특정 ID의 전략 상세 정보를 조회합니다. (소유권 자동 검증)
    """
    # 수동으로 하던 조회 및 권한 검사 로직이 모두 사라지고, 핵심 로직만 남습니다.
    logger.info(f"User (ID: {strategy.author_id}) accessed strategy: {strategy.name} (ID: {strategy.id}).")
    return strategy

# 소유권 검증 로직을 의존성 주입으로 대체
@router.put("/{strategy_id}", response_model=schemas.Strategy, summary="Update a specific strategy")
async def update_strategy(
    strategy_update: schemas.StrategyUpdate,
    # 수정할 대상 객체(strategy_to_update)를 의존성 주입으로 안전하게 가져옵니다.
    strategy_to_update: models.Strategy = Depends(get_verified_strategy),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 전략을 업데이트합니다. (소유권 자동 검증)
    """
    try:
        # 서비스 레이어 함수는 이제 더 단순한 인자만 받게 됩니다.
        updated_strategy = strategy_service.update_strategy(db, strategy_to_update, strategy_update)
        db.commit()
        db.refresh(updated_strategy)
        logger.info(f"Strategy '{updated_strategy.name}' (ID: {updated_strategy.id}) updated by user (ID: {updated_strategy.author_id}).")
        return updated_strategy
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to update strategy {strategy_to_update.id} for user (ID: {strategy_to_update.author_id}): {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while updating strategy {strategy_to_update.id} for user (ID: {strategy_to_update.author_id}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="전략 업데이트 중 서버 오류가 발생했습니다."
        )

# 소유권 검증 로직을 의존성 주입으로 대체
@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific strategy")
async def delete_strategy(
    # 삭제할 대상 객체(strategy_to_delete)를 의존성 주입으로 안전하게 가져옵니다.
    strategy_to_delete: models.Strategy = Depends(get_verified_strategy),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 전략을 삭제합니다. (소유권 자동 검증)
    """
    try:
        # 서비스 레이어 함수도 더 단순해집니다.
        strategy_service.delete_strategy(db, strategy_to_delete)
        db.commit()
        logger.info(f"Strategy ID {strategy_to_delete.id} deleted by user (ID: {strategy_to_delete.author_id}).")
        return
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to delete strategy {strategy_to_delete.id} for user (ID: {strategy_to_delete.author_id}): {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while deleting strategy {strategy_to_delete.id} for user (ID: {strategy_to_delete.author_id}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="전략 삭제 중 서버 오류가 발생했습니다."
        )