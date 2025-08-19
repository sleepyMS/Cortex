# file: backend/app/routers/live_bots.py

from fastapi import APIRouter, HTTPException, Depends, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid

from .. import schemas, models
# ▼▼▼ [수정] 비동기 의존성 및 팩토리 함수 임포트 ▼▼▼
from ..dependencies import get_async_db, get_current_active_user, create_owner_verifier
from ..services.live_bot_service import live_bot_service
from ..limiter import limiter
# ▲▲▲ [수정] ▲▲▲

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live-bots", tags=["Live Bots"])

# ▼▼▼ [추가] 라우터 파일 내에서 필요한 의존성을 직접 생성 ▼▼▼
get_verified_live_bot = create_owner_verifier(models.LiveBot)
# ▲▲▲ [추가] ▲▲▲

@router.post("/", response_model=schemas.LiveBot, status_code=status.HTTP_201_CREATED, summary="Deploy and start a new live bot")
@limiter.limit("5/hour") # 봇 생성은 비교적 신중한 작업이므로 제한을 더 강하게 설정
async def create_live_bot(
    live_bot_create: schemas.LiveBotCreate,
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """새로운 자동매매 봇을 배포하고 시작합니다."""
    try:
        new_bot = await live_bot_service.create_live_bot(db, current_user, live_bot_create)
        await db.commit()
        await db.refresh(new_bot)
        logger.info(f"New live bot (ID: {new_bot.id}) created for user {current_user.email}.")
        return new_bot
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating live bot for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="자동매매 봇 생성 중 서버 오류가 발생했습니다.")

@router.get("/", response_model=List[schemas.LiveBot], summary="Get list of user's live bots")
async def get_live_bots(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """현재 사용자의 자동매매 봇 목록을 비동기로 조회합니다."""
    bots = await live_bot_service.get_live_bots_by_user(db, current_user.id, skip, limit)
    logger.info(f"User {current_user.email} fetched {len(bots)} live bots.")
    return bots

@router.get("/{live_bot_id}", response_model=schemas.LiveBot, summary="Get details of a specific live bot")
async def get_live_bot_by_id(
    live_bot: models.LiveBot = Depends(get_verified_live_bot)
):
    """특정 자동매매 봇의 상세 정보를 조회합니다. (소유권 자동 검증)"""
    logger.info(f"User (ID: {live_bot.user_id}) accessed live bot: {live_bot.id}.")
    return live_bot

@router.put("/{live_bot_id}", response_model=schemas.LiveBot, summary="Update the status of a live bot")
async def update_live_bot_status(
    live_bot_update: schemas.LiveBotUpdate,
    live_bot_to_update: models.LiveBot = Depends(get_verified_live_bot),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 자동매매 봇의 상태(active, paused, stopped)를 업데이트합니다."""
    try:
        updated_bot = await live_bot_service.update_bot_status(db, live_bot_to_update, live_bot_update.status)
        await db.commit()
        await db.refresh(updated_bot)
        logger.info(f"Live bot ID {updated_bot.id} status updated to '{updated_bot.status}'.")
        return updated_bot
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating live bot {live_bot_to_update.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="봇 상태 업데이트 중 서버 오류가 발생했습니다.")

@router.delete("/{live_bot_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a live bot")
async def delete_live_bot(
    live_bot_to_delete: models.LiveBot = Depends(get_verified_live_bot),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 자동매매 봇을 삭제합니다. (소유권 자동 검증)"""
    try:
        await live_bot_service.delete_live_bot(db, live_bot_to_delete.id)
        await db.commit()
        logger.info(f"Live bot ID {live_bot_to_delete.id} deleted by user {live_bot_to_delete.user_id}.")
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting live bot {live_bot_to_delete.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="자동매매 봇 삭제 중 서버 오류가 발생했습니다.")