# file: backend/app/celery_app.py
# import eventlet
# eventlet.monkey_patch()  # 👈 이 두 줄을 반드시 주석 처리하거나 삭제합니다.
import os
from celery import Celery

CELERY_BROKER_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

# Celery 인스턴스 생성
celery_app = Celery(
    'cortex_worker',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=['backend.app.tasks']
)

# 비동기 Celery 워커 설정 추가
celery_app.conf.update(
    task_track_started=True,
    broker_connection_retry_on_startup=True,
    worker_prefetch_multiplier=1,
    # ❗️ worker_concurrency 설정은 CPU 코어 수나 작업 특성에 맞게 조절할 수 있습니다.
    #    비동기 워커는 단일 프로세스에서 여러 I/O 바운드 작업을 효율적으로 처리할 수 있습니다.
    #    일단은 주석 처리하거나, 필요 시 값을 조절하여 사용합니다.
    # worker_concurrency=1, 
)

celery_app.conf.timezone = 'UTC'