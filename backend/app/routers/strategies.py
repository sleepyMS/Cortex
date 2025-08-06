# file: backend/app/routers/strategies.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import logging
from typing import List, Optional, Literal

from .. import schemas, models, security
from ..database import get_db
from ..services.strategy_service import strategy_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/strategies", tags=["strategies"])

# --- 전략 관련 엔드포인트 ---

@router.post("/", response_model=schemas.Strategy, status_code=status.HTTP_201_CREATED, summary="Create a new trading strategy")
async def create_strategy(
    strategy_create: schemas.StrategyCreate, # 👈 새로운 스키마 적용
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    새로운 사용자 정의 투자 전략을 생성합니다.
    규칙, 청산 로직, 타겟 코인 등의 유효성을 검증하고 저장합니다.
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


@router.get("/{strategy_id}", response_model=schemas.Strategy, summary="Get a specific strategy by ID")
async def get_strategy_by_id(
    strategy_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 전략 상세 정보를 조회합니다.
    """
    strategy = strategy_service.get_strategy_by_id(db, strategy_id)
    if not strategy:
        logger.warning(f"Strategy ID {strategy_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="전략을 찾을 수 없습니다.")
    
    if strategy.author_id != current_user.id and not strategy.is_public:
        logger.warning(f"User {current_user.email} (ID: {current_user.id}) attempted to access private strategy {strategy_id} not owned by them.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 전략을 조회할 권한이 없습니다.")
    
    logger.info(f"User {current_user.email} (ID: {current_user.id}) accessed strategy: {strategy.name} (ID: {strategy.id}).")
    return strategy


@router.put("/{strategy_id}", response_model=schemas.Strategy, summary="Update a specific strategy")
async def update_strategy(
    strategy_id: int,
    strategy_update: schemas.StrategyUpdate, # 👈 새로운 스키마 적용
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 전략을 업데이트합니다.
    """
    try:
        updated_strategy = strategy_service.update_strategy(db, strategy_id, current_user, strategy_update)
        db.commit()
        db.refresh(updated_strategy)
        logger.info(f"Strategy '{updated_strategy.name}' (ID: {updated_strategy.id}) updated by user {current_user.email}.")
        return updated_strategy
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to update strategy {strategy_id} for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while updating strategy {strategy_id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="전략 업데이트 중 서버 오류가 발생했습니다."
        )


@router.delete("/{strategy_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific strategy")
async def delete_strategy(
    strategy_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 전략을 삭제합니다.
    """
    try:
        success = strategy_service.delete_strategy(db, strategy_id, current_user)
        if not success:
            logger.warning(f"Strategy ID {strategy_id} not found or user {current_user.email} has no permission to delete.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="전략을 찾을 수 없거나 삭제할 권한이 없습니다.")
        
        db.commit()
        logger.info(f"Strategy ID {strategy_id} deleted by user {current_user.email}.")
        return
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to delete strategy {strategy_id} for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while deleting strategy {strategy_id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="전략 삭제 중 서버 오류가 발생했습니다."
        )