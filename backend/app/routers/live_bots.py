# file: backend/app/routers/live_bots.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import logging
from typing import List, Optional
import uuid

# dependencies에서 get_verified_live_bot를 import 합니다.
from .. import schemas, models, security
from ..dependencies import get_verified_live_bot
from ..database import get_db
from ..services.live_bot_service import live_bot_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live_bots", tags=["Live Bots"])

# --- 라이브 봇 관련 엔드포인트 ---

# 새로운 봇을 '생성'하므로, 기존 객체에 대한 소유권 검증이 필요 없습니다.
@router.post("/", response_model=schemas.LiveBot, status_code=status.HTTP_201_CREATED, summary="Deploy and start a new live trading bot")
async def create_live_bot(
    live_bot_create: schemas.LiveBotCreate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    새로운 자동매매 봇을 배포하고 시작합니다.
    """
    try:
        new_bot = await live_bot_service.create_live_bot(db, current_user, live_bot_create)
        db.commit()
        db.refresh(new_bot)
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

# 현재 '로그인한 사용자'의 봇 목록을 가져오므로, 서비스 레이어에서 user_id로 필터링합니다.
@router.get("/", response_model=List[schemas.LiveBot], summary="Get list of user's live trading bots")
async def get_live_bots(
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_filter: Optional[str] = Query(None, description="Filter by bot status"),
    # 👇 [수정] strategy_id_filter의 타입도 uuid.UUID로 변경합니다.
    strategy_id_filter: Optional[uuid.UUID] = Query(None, description="Filter by strategy ID")
):
    """
    현재 로그인된 사용자의 실시간 자동매매 봇 목록을 조회합니다.
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

# 소유권 검증 로직을 의존성 주입으로 대체
@router.get("/{bot_id}", response_model=schemas.LiveBot, summary="Get details of a specific live trading bot")
async def get_live_bot_by_id(
    # ID를 직접 받는 대신, 'get_verified_live_bot'가 검증을 마친 LiveBot 객체를 주입해줍니다.
    live_bot: models.LiveBot = Depends(get_verified_live_bot)
):
    """
    특정 ID의 라이브 봇 상세 정보를 조회합니다. (소유권 자동 검증)
    """
    # 수동으로 하던 조회 및 권한 검사 로직이 모두 사라집니다.
    logger.info(f"User (ID: {live_bot.user_id}) accessed live bot: {live_bot.id}.")
    return live_bot

# 소유권 검증 로직을 의존성 주입으로 대체
@router.put("/{bot_id}", response_model=schemas.LiveBot, summary="Update status of a specific live trading bot")
async def update_live_bot_status(
    bot_update: schemas.LiveBotUpdate,
    # 수정할 대상 객체(bot_to_update)를 의존성 주입으로 안전하게 가져옵니다.
    bot_to_update: models.LiveBot = Depends(get_verified_live_bot),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 라이브 봇 상태를 업데이트합니다. (소유권 자동 검증)
    """
    if bot_update.status is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="업데이트할 상태를 제공해야 합니다.")

    try:
        # 서비스 레이어 함수는 이제 더 단순한 인자만 받게 됩니다.
        updated_bot = live_bot_service.update_live_bot_status(db, bot_to_update, bot_update.status)
        db.commit()
        db.refresh(updated_bot)
        logger.info(f"LiveBot {updated_bot.id} status updated to '{updated_bot.status}' by user (ID: {updated_bot.user_id}).")
        return updated_bot
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to update status of LiveBot {bot_to_update.id} for user (ID: {bot_to_update.user_id}): {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while updating LiveBot {bot_to_update.id} status for user (ID: {bot_to_update.user_id}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="봇 상태 업데이트 중 서버 오류가 발생했습니다."
        )

# 소유권 검증 로직을 의존성 주입으로 대체
@router.delete("/{bot_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific live trading bot")
async def delete_live_bot(
    # 삭제할 대상 객체(bot_to_delete)를 의존성 주입으로 안전하게 가져옵니다.
    bot_to_delete: models.LiveBot = Depends(get_verified_live_bot),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 라이브 봇을 삭제합니다. (소유권 자동 검증)
    """
    try:
        # 서비스 레이어 함수도 더 단순해집니다.
        live_bot_service.delete_live_bot(db, bot_to_delete)
        # db.commit()은 서비스 레이어에서 처리될 수 있으므로, 서비스 로직에 따라 조절
        logger.info(f"LiveBot ID {bot_to_delete.id} deleted by user (ID: {bot_to_delete.user_id}).")
        return
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to delete LiveBot {bot_to_delete.id} for user (ID: {bot_to_delete.user_id}): {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while deleting LiveBot {bot_to_delete.id} for user (ID: {bot_to_delete.user_id}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="봇 삭제 중 서버 오류가 발생했습니다."
        )