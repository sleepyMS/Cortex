# file: backend/app/celery_app.py

import os
import sys # 👈 sys 모듈 임포트
import logging
from celery import Celery

logger = logging.getLogger(__name__)

# --- Celery 애플리케이션 초기화 ---
CELERY_BROKER_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

celery_app = Celery(
    'cortex_tasks',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    timezone='UTC',
    enable_utc=True,
    broker_transport_options={'visibility_timeout': 3600, 'fanout_prefix': True, 'fanout_strip_prefix': True},
    task_time_limit=300,
    task_soft_time_limit=240,
)

# 👈 eventlet.monkey_patch()의 조건부 실행 (sys.argv를 사용하여 워커 여부 판단)
# sys.argv에 'worker' 또는 'celery'와 'worker'가 함께 있는 경우에만 eventlet을 적용합니다.
# 이는 이 모듈이 celery worker 명령에 의해 로드될 때만 monkey_patch가 실행되도록 합니다.
if 'celery' in sys.argv and 'worker' in sys.argv:
    try:
        import eventlet # 👈 eventlet 임포트
        eventlet.monkey_patch() # 👈 monkey_patch 적용
        logger.info("Eventlet monkey patch applied for Celery worker (via sys.argv check).")
    except ImportError:
        logger.warning("Eventlet not installed, but it is required for eventlet pool. Please install eventlet.")
    except Exception as e:
        logger.error(f"Failed to apply eventlet monkey patch: {e}", exc_info=True)


# Celery가 태스크를 찾을 모듈 지정
celery_app.autodiscover_tasks(['backend.app.tasks'])

logger.info(f"Celery app '{celery_app.main}' initialized with broker: {CELERY_BROKER_URL}")