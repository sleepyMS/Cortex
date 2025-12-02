# file: backend/app/celery_app.py

import os
import sys
import uuid
from celery import Celery, Task

if "eventlet" in sys.argv:
    try:
        import eventlet
        eventlet.monkey_patch()
    except ImportError:
        pass

try:
    from eventlet import tpool
    tpool.set_num_threads(100)  # 기본 20 → 100
except ImportError:
    pass  # Eventlet 없으면 무시 (solo worker 등)

from .config import settings
from app.database import SyncSessionLocal
from app.models import Backtest
from sqlalchemy import update

# --- 1. 중앙화된 오류 처리를 위한 커스텀 Task 클래스 ---
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

# --- 2. Celery 앱 설정 (설정 객체 사용) ---
celery_app = Celery(
    'cortex_worker',
    broker=settings.DB.REDIS_URL,
    backend=settings.DB.REDIS_URL,
    include=['app.tasks', 'app.celery_beat'],
    task_cls=DatabaseTask  # 커스텀 오류 처리 클래스 적용
)

# --- 3. 작업 분리를 위한 큐와 라우팅 규칙 정의 ---

# 3-1. 두 종류의 작업 큐(우체통)를 정의합니다.
celery_app.conf.task_queues = {
    'cpu_bound_queue': {'exchange': 'cpu_bound', 'routing_key': 'cpu.task'},
    'io_bound_queue': {'exchange': 'io_bound', 'routing_key': 'io.task'},
}

# 3-2. 어떤 작업을 어떤 큐로 보낼지(우편물 분류) 결정하는 규칙을 정의합니다.
celery_app.conf.task_routes = {
    # 백테스팅과 최적화는 'cpu_bound_queue'로 보냅니다.
    'run_backtest': {'queue': 'cpu_bound_queue'},
    'run_optimization': {'queue': 'cpu_bound_queue'}, 

    # 자동매매 봇과 데이터 수집은 'io_bound_queue'로 보냅니다.
    'run_all_active_bots': {'queue': 'io_bound_queue'},
    'fetch_and_store_ohlcv': {'queue': 'io_bound_queue'},
    'fulfill_order_task': {'queue': 'io_bound_queue'},
    'dispatch_event': {'queue': 'io_bound_queue'},
    'send_order_notification_task': {'queue': 'io_bound_queue'},

    'send_verification_email_task': {'queue': 'io_bound_queue'},
    'send_purchase_notification_task': {'queue': 'io_bound_queue'},
    'send_backtest_notification_task': {'queue': 'io_bound_queue'},
    'send_optimization_notification_task': {'queue': 'io_bound_queue'},
    'handle_recurring_payment_success_task': {'queue': 'io_bound_queue'},
    'handle_recurring_payment_failure_task': {'queue': 'io_bound_queue'},
    'send_subscription_created_task': {'queue': 'io_bound_queue'},
    'send_subscription_renewed_task': {'queue': 'io_bound_queue'},
    'send_subscription_failed_task': {'queue': 'io_bound_queue'},
}

# --- 4. 기타 설정 ---
celery_app.conf.update(
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    worker_prefetch_multiplier=1, # CPU 바운드 작업은 한 번에 하나씩 처리하도록 설정
    timezone='UTC',
)