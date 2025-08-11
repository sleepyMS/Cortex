# file: backend/app/services/live_bot_service.py

from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime, timezone
import uuid

from .. import models, schemas
from ..services.plan_service import plan_service
from ..services.strategy_service import strategy_service
from ..services.api_key_service import api_key_service
from ..celery_app import celery_app
from ..tasks import run_live_bot_task
import logging

logger = logging.getLogger(__name__)

class LiveBotService:
    """
    실시간 자동매매 봇의 생성, 조회, 상태 업데이트 및 삭제를 담당하는 서비스.
    플랜 제한 검사, API 키 유효성 검사, Celery 태스크 전송/제어를 포함합니다.
    """
    def __init__(self):
        self.plan_service = plan_service
        self.strategy_service = strategy_service
        self.api_key_service = api_key_service

    async def create_live_bot(
        self,
        db: Session,
        user: models.User,
        live_bot_create: schemas.LiveBotCreate
    ) -> models.LiveBot:
        """
        새로운 라이브 자동매매 봇을 생성하고 Celery 큐에 시작 태스크를 추가합니다.
        """
        # 1. 플랜 기반 동시 실행 봇 개수 제한 검사
        # 👈 plan_service.get_user_plan_features를 사용하도록 수정
        user_features = self.plan_service.get_user_plan_features(user=user, db=db)
        concurrent_limit = user_features.live_bots_limit
        active_bots_count = db.query(models.LiveBot).filter(
            models.LiveBot.user_id == user.id,
            models.LiveBot.status.in_(['active', 'paused', 'initializing'])
        ).count()

        if active_bots_count >= concurrent_limit:
            logger.warning(f"User {user.email} (ID: {user.id}) exceeded concurrent bot limit ({active_bots_count}/{concurrent_limit}).")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"동시 실행 봇 제한({concurrent_limit}개)을 초과했습니다. 플랜을 업그레이드해주세요."
            )

        # 2. 전략 및 API 키 유효성 검사 (소유권 포함)
        strategy = self.strategy_service.get_strategy_by_id(db, live_bot_create.strategy_id)
        if not strategy or strategy.author_id != user.id:
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to use invalid/unowned strategy {live_bot_create.strategy_id} for live bot.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 전략을 찾을 수 없거나 권한이 없습니다.")

        api_key_record = self.api_key_service.get_api_key_by_id(db, live_bot_create.api_key_id)
        if not api_key_record or api_key_record.user_id != user.id:
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to use invalid/unowned API key {live_bot_create.api_key_id} for live bot.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 API 키를 찾을 수 없거나 권한이 없습니다.")
        
        if not api_key_record.is_active:
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to use inactive API key {api_key_record.id}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비활성화된 API 키입니다. 활성화하거나 다른 키를 사용해주세요.")

        # 3. 라이브 봇 DB 레코드 생성 (상태: initializing)
        db_live_bot = models.LiveBot(
            user_id=user.id,
            strategy_id=live_bot_create.strategy_id,
            api_key_id=live_bot_create.api_key_id,
            status='initializing',
            initial_capital=live_bot_create.initial_capital,
        )
        db.add(db_live_bot)
        db.flush()
        db.refresh(db_live_bot)
        logger.info(f"LiveBot record created for user {user.email}, Strategy ID: {db_live_bot.strategy_id}, API Key ID: {db_live_bot.api_key_id} (Bot ID: {db_live_bot.id}).")

        # 4. Celery 태스크 전송 (봇 실행 시작)
        try:
            task_result = run_live_bot_task.delay(db_live_bot.id)
            logger.info(f"Celery task dispatched for LiveBot ID: {db_live_bot.id}. Celery Task ID: {task_result.id}")
        except Exception as e:
            logger.error(f"Failed to dispatch Celery task for LiveBot ID {db_live_bot.id}: {e}", exc_info=True)
            db_live_bot.status = 'error'
            db_live_bot.stopped_at = datetime.now(timezone.utc)
            db.add(db_live_bot)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="라이브 봇 시작에 실패했습니다.")

        return db_live_bot

    def get_live_bots(
        self,
        db: Session,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        strategy_id_filter: Optional[uuid.UUID] = None
    ) -> List[models.LiveBot]:
        """
        사용자 본인의 라이브 봇 목록을 조회합니다.
        """
        query = db.query(models.LiveBot).filter(models.LiveBot.user_id == user_id)

        if status_filter:
            query = query.filter(models.LiveBot.status == status_filter)
        if strategy_id_filter:
            query = query.filter(models.LiveBot.strategy_id == strategy_id_filter)

        query = query.options(
            joinedload(models.LiveBot.strategy),
            joinedload(models.LiveBot.api_key)
        ) 

        live_bots = query.order_by(models.LiveBot.started_at.desc()).offset(skip).limit(limit).all()
        logger.info(f"User {user_id} fetched {len(live_bots)} live bot records.")
        return live_bots

    def get_live_bot_by_id(self, db: Session, bot_id: uuid.UUID) -> models.LiveBot | None:
        """ID로 단일 라이브 봇 기록을 조회합니다."""
        live_bot = db.query(models.LiveBot).options(
            joinedload(models.LiveBot.strategy),
            joinedload(models.LiveBot.api_key)
        ).filter(models.LiveBot.id == bot_id).first()
        return live_bot

    def update_live_bot_status(
        self,
        db: Session,
        bot_to_update: models.LiveBot,
        new_status: Literal["active", "paused", "stopped"]
    ) -> models.LiveBot:
        """
        라이브 봇의 상태를 업데이트합니다.
        (라우터에서 봇 소유권 검증이 완료되었다고 가정합니다.)
        """
        if bot_to_update.status == new_status:
            return bot_to_update
        
        if bot_to_update.status in ['stopped', 'error']:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"'{bot_to_update.status}' 상태의 봇은 제어할 수 없습니다.")

        try:
            task_control = celery_app.control
            if new_status == "stopped":
                task_control.revoke(str(bot_to_update.id), terminate=True)
                bot_to_update.stopped_at = datetime.now(timezone.utc)
                logger.info(f"LiveBot ID {bot_to_update.id} received 'stop' command.")
            
            bot_to_update.status = new_status
            db.add(bot_to_update)
            db.flush()
            db.refresh(bot_to_update)
            logger.info(f"LiveBot ID {bot_to_update.id} status updated to '{new_status}'.")
            return bot_to_update
        except Exception as e:
            logger.error(f"Failed to send control command for LiveBot {bot_to_update.id} to Celery: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="봇 제어 명령에 실패했습니다.")


    def delete_live_bot(
        self,
        db: Session,
        bot_to_delete: models.LiveBot
    ) -> None:
        """
        라이브 봇을 삭제합니다.
        (라우터에서 봇 소유권 검증이 완료되었다고 가정합니다.)
        """
        if bot_to_delete.status in ['active', 'paused', 'initializing']:
            logger.info(f"LiveBot ID {bot_to_delete.id} is active. Attempting to stop before deletion.")
            try:
                # [개선] 내부 함수 호출 시에도 변경된 시그니처에 맞게 호출합니다.
                self.update_live_bot_status(db, bot_to_delete, "stopped")
            except Exception as e:
                logger.error(f"Failed to stop LiveBot {bot_to_delete.id} before deletion: {e}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="봇 삭제 전 중지 실패. 먼저 수동으로 봇을 중지해주세요.")
        
        db.delete(bot_to_delete)
        db.flush()
        logger.info(f"User {bot_to_delete.user_id} deleted LiveBot: {bot_to_delete.id}.")
        return

live_bot_service = LiveBotService()