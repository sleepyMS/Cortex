# file: backend/app/services/live_bot_service.py

from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime, timezone

from .. import models, schemas
from ..services.plan_service import plan_service # 👈 플랜 서비스 임포트
from ..services.strategy_service import strategy_service # 👈 전략 서비스 임포트
from ..services.api_key_service import api_key_service # 👈 API 키 서비스 임포트 (복호화용)
from ..celery_app import celery_app # 👈 Celery 앱 인스턴스 임포트
from ..tasks import run_live_bot_task # 👈 Celery 라이브 봇 태스크 임포트
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
        concurrent_limit = self.plan_service.get_user_concurrent_bots_limit(user, db)
        active_bots_count = db.query(models.LiveBot).filter(
            models.LiveBot.user_id == user.id,
            models.LiveBot.status.in_(['active', 'paused', 'initializing']) # 현재 활성 상태로 간주되는 봇
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
            status='initializing', # 초기화 중 상태
            initial_capital=live_bot_create.initial_capital,
            # ticker 등 추가 필드가 있다면 여기에 추가
        )
        db.add(db_live_bot)
        db.flush() # ID를 얻기 위해
        db.refresh(db_live_bot)
        logger.info(f"LiveBot record created for user {user.email}, Strategy ID: {db_live_bot.strategy_id}, API Key ID: {db_live_bot.api_key_id} (Bot ID: {db_live_bot.id}).")

        # 4. Celery 태스크 전송 (봇 실행 시작)
        try:
            # run_live_bot_task.delay()는 Celery 큐에 작업을 비동기로 추가합니다.
            task_result = run_live_bot_task.delay(db_live_bot.id)
            # TODO: LiveBot 모델에 celery_task_id 필드를 추가하여 task_result.id를 저장하는 것이 좋습니다.
            logger.info(f"Celery task dispatched for LiveBot ID: {db_live_bot.id}. Celery Task ID: {task_result.id}")
            # db_live_bot.celery_task_id = task_result.id # 모델 필드가 있다면 여기에 저장
        except Exception as e:
            logger.error(f"Failed to dispatch Celery task for LiveBot ID {db_live_bot.id}: {e}", exc_info=True)
            # 태스크 전송 실패 시, 봇 레코드도 실패 상태로 변경하거나 롤백 고려
            db_live_bot.status = 'error' # models.py에 'error' 상태가 정의되어 있다고 가정
            db_live_bot.stopped_at = datetime.now(timezone.utc)
            db.add(db_live_bot)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="라이브 봇 시작에 실패했습니다.")

        return db_live_bot

    def get_live_bots(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[str] = None,
        strategy_id_filter: Optional[int] = None
    ) -> List[models.LiveBot]:
        """
        사용자 본인의 라이브 봇 목록을 조회합니다.
        """
        query = db.query(models.LiveBot).filter(models.LiveBot.user_id == user_id)

        if status_filter:
            query = query.filter(models.LiveBot.status == status_filter)
        if strategy_id_filter:
            query = query.filter(models.LiveBot.strategy_id == strategy_id_filter)

        # 전략, API 키 정보도 함께 로드하여 N+1 쿼리 방지
        query = query.options(
            joinedload(models.LiveBot.strategy),
            joinedload(models.LiveBot.api_key)
        ) 

        live_bots = query.order_by(models.LiveBot.started_at.desc()).offset(skip).limit(limit).all()
        logger.info(f"User {user_id} fetched {len(live_bots)} live bot records.")
        return live_bots

    def get_live_bot_by_id(self, db: Session, bot_id: int) -> models.LiveBot | None:
        """ID로 단일 라이브 봇 기록을 조회합니다."""
        live_bot = db.query(models.LiveBot).options(
            joinedload(models.LiveBot.strategy),
            joinedload(models.LiveBot.api_key)
        ).filter(models.LiveBot.id == bot_id).first()
        return live_bot

    def update_live_bot_status(
        self,
        db: Session,
        bot_id: int,
        user_id: int,
        new_status: Literal["active", "paused", "stopped"]
    ) -> models.LiveBot:
        """
        라이브 봇의 상태를 업데이트합니다. Celery에 명령을 보내고 DB 상태를 반영합니다.
        """
        db_live_bot = self.get_live_bot_by_id(db, bot_id)
        if not db_live_bot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="봇을 찾을 수 없습니다.")
        if db_live_bot.user_id != user_id:
            logger.warning(f"User {user_id} attempted to update status of bot {bot_id} not owned by them.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 봇을 제어할 권한이 없습니다.")
        
        # 이미 동일한 상태인 경우
        if db_live_bot.status == new_status:
            logger.info(f"LiveBot ID {bot_id} already in status '{new_status}'. No action taken.")
            return db_live_bot
        
        # 상태 전환 로직 검증 (예: stopped -> active는 불가능, stopped는 최종 상태)
        if db_live_bot.status == 'stopped' or db_live_bot.status == 'error':
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"'{db_live_bot.status}' 상태의 봇은 제어할 수 없습니다. (재배포 필요)")

        # Celery 태스크에 명령 보내기 (실제 봇 로직이 이 명령에 반응해야 함)
        # 봇 태스크 ID는 db_live_bot.id와 동일하다고 가정 (LiveBot 모델에 celery_task_id 필드 추가 권장)
        try:
            # Celery AsyncResult를 통해 태스크를 찾고 명령 보냄
            task_control = celery_app.control
            if new_status == "stopped":
                task_control.revoke(str(db_live_bot.id), terminate=True) # 강제 종료 (SIGTERM)
                db_live_bot.stopped_at = datetime.now(timezone.utc)
                logger.info(f"LiveBot ID {bot_id} received 'stop' command. Task revoked.")
            elif new_status == "paused":
                # Celery 태스크에게 'paused' 상태를 알리는 사용자 정의 시그널 or DB 상태 업데이트를 통해 봇 내부에서 감지
                # task_control.send_task('custom_signals.pause_bot', args=[db_live_bot.id])
                # OR (봇 내부에서 db.refresh()로 상태 감지)
                logger.info(f"LiveBot ID {bot_id} status set to 'paused'.")
            elif new_status == "active":
                # paused 상태에서 active로 전환 시 별도 Celery 명령 (resume) 또는 DB 상태 변경 후 봇 내부에서 감지
                # task_control.send_task('custom_signals.resume_bot', args=[db_live_bot.id])
                logger.info(f"LiveBot ID {bot_id} status set to 'active'.")
            
            db_live_bot.status = new_status
            db_live_bot.updated_at = datetime.now(timezone.utc)
            db.add(db_live_bot)
            # db.commit()는 라우터에서 처리
            logger.info(f"LiveBot ID {bot_id} status updated to '{new_status}'.")
            return db_live_bot
        except Exception as e:
            logger.error(f"Failed to send control command for LiveBot {bot_id} to Celery: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="봇 제어 명령에 실패했습니다.")


    def delete_live_bot(self, db: Session, bot_id: int, user_id: int) -> bool:
        """
        라이브 봇을 삭제합니다. 봇이 활성 상태인 경우 먼저 중지 명령을 보냅니다.
        """
        db_live_bot = self.get_live_bot_by_id(db, bot_id)
        if not db_live_bot:
            return False # 삭제할 봇 없음
        if db_live_bot.user_id != user_id:
            logger.warning(f"User {user_id} attempted to delete bot {bot_id} not owned by them.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 봇을 삭제할 권한이 없습니다.")
        
        # 봇이 활성 상태인 경우 먼저 중지
        if db_live_bot.status in ['active', 'paused', 'initializing']:
            logger.info(f"LiveBot ID {bot_id} is active. Attempting to stop before deletion.")
            try:
                self.update_live_bot_status(db, bot_id, user_id, "stopped") # 중지 명령
                # update_live_bot_status는 이미 db.add를 호출하고 있으므로 여기서는 추가하지 않음
            except Exception as e:
                logger.error(f"Failed to stop LiveBot {bot_id} before deletion: {e}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="봇 삭제 전 중지 실패. 먼저 수동으로 봇을 중지해주세요.")
        
        db.delete(db_live_bot)
        db.commit()
        logger.info(f"User {user_id} deleted LiveBot: {db_live_bot.id} (Strategy: {db_live_bot.strategy_id}).")
        return True

# 서비스 인스턴스 생성
live_bot_service = LiveBotService()