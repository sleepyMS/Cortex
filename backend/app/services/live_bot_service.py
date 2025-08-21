# file: backend/app/services/live_bot_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload, selectinload
from fastapi import HTTPException, status
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid
import logging

from .. import models, schemas
from ..services.plan_service import plan_service
from ..services.strategy_service import strategy_service
from ..services.api_key_service import api_key_service
from ..celery_app import celery_app
from ..tasks import run_live_bot

logger = logging.getLogger(__name__)

class LiveBotService:
    """
    실시간 자동매매 봇의 생성, 조회, 상태 업데이트 및 삭제를 담당하는 비동기 서비스.
    """
    def __init__(self):
        self.plan_service = plan_service
        self.strategy_service = strategy_service
        self.api_key_service = api_key_service

    async def create_live_bot(
        self,
        db: AsyncSession,
        user: models.User,
        live_bot_create: schemas.LiveBotCreate
    ) -> models.LiveBot:
        """새로운 라이브 자동매매 봇을 생성하고 Celery 큐에 시작 태스크를 추가합니다."""
        # 1. 플랜 기반 동시 실행 봇 개수 제한 검사
        user_features = await self.plan_service.get_user_plan_features(user, db)
        concurrent_limit = user_features.live_bots_limit
        
        active_bots_query = select(func.count(models.LiveBot.id)).filter(
            models.LiveBot.user_id == user.id,
            models.LiveBot.status.in_(['active', 'paused', 'initializing'])
        )
        active_bots_result = await db.execute(active_bots_query)
        active_bots_count = active_bots_result.scalar_one()

        if active_bots_count >= concurrent_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"동시 실행 봇 제한({concurrent_limit}개)을 초과했습니다. 플랜을 업그레이드해주세요."
            )

        # 2. 전략 및 API 키 유효성 검사 (소유권 포함)
        strategy = await self.strategy_service.get_strategy_by_id(db, live_bot_create.strategy_id)
        if not strategy or strategy.author_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 전략을 찾을 수 없거나 권한이 없습니다.")

        api_key_record = await self.api_key_service.get_api_key_by_id(db, live_bot_create.api_key_id)
        if not api_key_record or api_key_record.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 API 키를 찾을 수 없거나 권한이 없습니다.")
        
        if not api_key_record.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비활성화된 API 키입니다.")

        # 3. 라이브 봇 DB 레코드 생성
        db_live_bot = models.LiveBot(
            user_id=user.id,
            strategy_id=live_bot_create.strategy_id,
            api_key_id=live_bot_create.api_key_id,
            status='initializing',
            initial_capital=live_bot_create.initial_capital,
            ticker=live_bot_create.ticker,
            timeframe=strategy.target_coins[0].timeframe if strategy.target_coins else "1h" # 예시
        )
        db.add(db_live_bot)
        await db.flush() # ID가 생성되도록 flush
        
        # 4. Celery 태스크 전송 및 Task ID 저장
        try:
            # 태스크 호출 결과를 변수에 할당하여 ID를 받습니다.
            async_result = run_live_bot.delay(str(db_live_bot.id))
            
            # Celery가 부여한 Task ID를 DB에 저장
            db_live_bot.celery_task_id = async_result.id
            db.add(db_live_bot) # db_live_bot을 다시 세션에 추가
            await db.commit() # 최종 커밋
            
            logger.info(f"Celery task dispatched for LiveBot ID: {db_live_bot.id} with Celery Task ID: {async_result.id}.")
        except Exception as e:
            logger.error(f"Failed to dispatch Celery task for LiveBot ID {db_live_bot.id}: {e}", exc_info=True)
            # 태스크 전송 실패 시, 봇 상태를 'error'로 변경
            db_live_bot.status = 'error'
            db_live_bot.stopped_at = datetime.now(timezone.utc)
            db.add(db_live_bot)
            await db.commit()
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="라이브 봇 시작에 실패했습니다.")

        return db_live_bot

    async def get_live_bots_by_user(
        self, db: AsyncSession, user_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> List[models.LiveBot]:
        """사용자 본인의 라이브 봇 목록을 비동기로 조회합니다."""
        query = select(models.LiveBot).options(
            joinedload(models.LiveBot.strategy),
            joinedload(models.LiveBot.api_key)
        ).filter(models.LiveBot.user_id == user_id).order_by(models.LiveBot.started_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()

    async def update_bot_status(
        self, db: AsyncSession, bot_to_update: models.LiveBot, new_status: Literal["active", "paused", "stopped"]
    ) -> models.LiveBot:
        """라이브 봇의 상태를 업데이트하고, 필요시 Celery 태스크를 제어합니다."""
        if bot_to_update.status == new_status:
            return bot_to_update
        
        if bot_to_update.status in ['stopped', 'error']:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"'{bot_to_update.status}' 상태의 봇은 제어할 수 없습니다.")
        
        if new_status == "stopped":
            if bot_to_update.celery_task_id:
                # Celery 태스크를 중지시키는 핵심 로직
                celery_app.control.revoke(str(bot_to_update.celery_task_id), terminate=True)
                bot_to_update.stopped_at = datetime.now(timezone.utc)
                logger.info(f"LiveBot ID {bot_to_update.id} (Task ID: {bot_to_update.celery_task_id}) received 'stop' command.")
            else:
                # Task ID가 없는 경우
                logger.warning(f"LiveBot ID {bot_to_update.id} has no Celery Task ID but was marked as stopped.")
        
        bot_to_update.status = new_status
        db.add(bot_to_update)
        await db.flush()
        return bot_to_update

    async def delete_live_bot(self, db: AsyncSession, bot_id: uuid.UUID) -> bool:
        """라이브 봇을 삭제합니다."""
        result = await db.execute(select(models.LiveBot).filter(models.LiveBot.id == bot_id))
        bot_to_delete = result.scalar_one_or_none()

        if not bot_to_delete:
            return False

        if bot_to_delete.status in ['active', 'paused', 'initializing']:
            logger.info(f"LiveBot ID {bot_to_delete.id} is active. Stopping before deletion.")
            try:
                # update_bot_status를 호출하여 봇 상태를 'stopped'로 변경하고 Celery 태스크를 중지시킵니다.
                await self.update_bot_status(db, bot_to_delete, "stopped")
            except Exception as e:
                logger.error(f"Failed to stop LiveBot {bot_to_delete.id} before deletion: {e}", exc_info=True)
                # 이 경우 봇 레코드가 삭제되지 않고 함수가 예외를 발생시킵니다.
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="봇 삭제 전 중지 실패. 먼저 수동으로 봇을 중지해주세요.")
        
        await db.delete(bot_to_delete)
        await db.flush()
        return True

live_bot_service = LiveBotService()