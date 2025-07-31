# file: backend/app/routers/live_bots.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import logging
from typing import List, Optional, Literal

from .. import schemas, models, security
from ..database import get_db
from ..services.live_bot_service import live_bot_service # 👈 라이브 봇 서비스 임포트

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live_bots", tags=["Live Bots"])

# --- 라이브 봇 관련 엔드포인트 ---

@router.post("/", response_model=schemas.LiveBot, status_code=status.HTTP_201_CREATED, summary="Deploy and start a new live trading bot")
async def create_live_bot(
    live_bot_create: schemas.LiveBotCreate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    새로운 자동매매 봇을 배포하고 시작합니다.
    플랜별 동시 실행 봇 제한 및 전략/API 키 유효성 검사가 수행됩니다.
    """
    try:
        new_bot = await live_bot_service.create_live_bot(db, current_user, live_bot_create)
        db.commit() # 서비스에서 flush 후 여기서 커밋
        db.refresh(new_bot) # Celery task ID 등의 정보가 반영될 수 있음
        logger.info(f"Live bot (ID: {new_bot.id}) deployed for user {current_user.email} with strategy ID: {new_bot.strategy_id} and API Key ID: {new_bot.api_key_id}.")
        return new_bot
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to create live bot for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while creating live bot for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="라이브 봇 배포 중 서버 오류가 발생했습니다."
        )


@router.get("/", response_model=List[schemas.LiveBot], summary="Get list of user's live trading bots")
async def get_live_bots(
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by bot status (e.g., 'active', 'paused', 'stopped', 'error', 'initializing')"),
    strategy_id_filter: Optional[int] = Query(None, description="Filter by strategy ID")
):
    """
    현재 로그인된 사용자의 실시간 자동매매 봇 목록을 조회합니다.
    상태 및 전략 ID로 필터링할 수 있으며, 페이지네이션을 지원합니다.
    """
    live_bots = live_bot_service.get_live_bots(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        status_filter=status_filter,
        strategy_id_filter=strategy_id_filter
    )
    logger.info(f"User {current_user.email} fetched {len(live_bots)} live bot records.")
    return live_bots


@router.get("/{bot_id}", response_model=schemas.LiveBot, summary="Get details of a specific live trading bot")
async def get_live_bot_by_id(
    bot_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 라이브 봇 상세 정보를 조회합니다.
    """
    live_bot = live_bot_service.get_live_bot_by_id(db, bot_id)
    if not live_bot:
        logger.warning(f"LiveBot ID {bot_id} not found for user {current_user.email}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="봇을 찾을 수 없습니다.")
    
    if live_bot.user_id != current_user.id:
        logger.warning(f"User {current_user.email} (ID: {current_user.id}) attempted to access bot {bot_id} not owned by them.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 봇에 접근할 권한이 없습니다.")
    
    logger.info(f"User {current_user.email} accessed live bot: {live_bot.id}.")
    return live_bot


@router.put("/{bot_id}", response_model=schemas.LiveBot, summary="Update status of a specific live trading bot")
async def update_live_bot_status(
    bot_id: int,
    bot_update: schemas.LiveBotUpdate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 라이브 봇 상태(예: 'active', 'paused', 'stopped')를 업데이트합니다.
    """
    if bot_update.status is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="업데이트할 상태를 제공해야 합니다.")

    try:
        updated_bot = live_bot_service.update_live_bot_status(db, bot_id, current_user.id, bot_update.status)
        db.commit() # 서비스에서 상태 변경 후 여기서 커밋
        db.refresh(updated_bot)
        logger.info(f"LiveBot {updated_bot.id} status updated to '{updated_bot.status}' by user {current_user.email}.")
        return updated_bot
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to update status of LiveBot {bot_id} for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while updating LiveBot {bot_id} status for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="봇 상태 업데이트 중 서버 오류가 발생했습니다."
        )


@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific live trading bot")
async def delete_live_bot(
    bot_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 라이브 봇을 삭제합니다. 봇 소유자만 가능합니다.
    봇이 활성 상태인 경우 먼저 중지 명령을 시도합니다.
    """
    try:
        success = live_bot_service.delete_live_bot(db, bot_id, current_user.id)
        if not success:
            logger.warning(f"LiveBot ID {bot_id} not found or user {current_user.email} has no permission to delete.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="봇을 찾을 수 없거나 삭제할 권한이 없습니다.")
        
        # db.commit()은 service.delete_live_bot 내부에서 수행됩니다.
        logger.info(f"LiveBot ID {bot_id} deleted by user {current_user.email}.")
        return # 204 No Content는 응답 바디를 포함하지 않음
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to delete LiveBot {bot_id} for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while deleting LiveBot {bot_id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="봇 삭제 중 서버 오류가 발생했습니다."
        )