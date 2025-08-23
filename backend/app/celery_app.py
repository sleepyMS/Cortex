# file: backend/app/celery_app.py

import os
import uuid
from celery import Celery, Task
import asyncio

# --- 1. (변경) config.py에서 설정 객체를 임포트합니다. ---
from backend.app.config import settings
from backend.app.database import SyncSessionLocal
from backend.app.models import Backtest
from sqlalchemy import update

# --- 2. (개선) 중앙화된 오류 처리를 위한 커스텀 Task 클래스 ---
class DatabaseTask(Task):
    """
    태스크 실패 시 DB 상태를 업데이트하는 공통 로직을 포함하는 커스텀 Task 클래스
    """
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        print(f"Task {self.name}[{task_id}] failed: {exc}")
        if self.name == 'run_backtest' and args:
            backtest_id_str = args[0]
            try:
                with SyncSessionLocal() as session:
                    backtest_uuid = uuid.UUID(backtest_id_str)
                    stmt = update(Backtest).where(Backtest.id == backtest_uuid).values(status='failed')
                    session.execute(stmt)
                    session.commit()
                    print(f"Successfully updated backtest {backtest_id_str} status to 'failed'.")
            except Exception as e:
                print(f"CRITICAL: Could not update backtest status for {backtest_id_str}: {e}")
        super().on_failure(exc, task_id, args, kwargs, einfo)

# --- 3. (변경) settings 객체를 사용하여 Celery 앱 설정 ---
# os.getenv() 대신 중앙 설정 객체인 settings를 사용합니다.
celery_app = Celery(
    'cortex_worker',
    broker=settings.DB.REDIS_URL,
    backend=settings.DB.REDIS_URL,
    include=['backend.app.tasks', 'backend.app.celery_beat'],
    task_cls=DatabaseTask
)

# 꼭 필요한 설정만 남겨 간소화합니다.
celery_app.conf.update(
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    worker_prefetch_multiplier=1
)

celery_app.conf.timezone = 'UTC'