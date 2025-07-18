# backend/app/worker.py

import os
from celery import Celery
from dotenv import load_dotenv

# .env 파일에서 환경 변수를 로드합니다.
load_dotenv()

# 환경 변수에서 Redis URL을 가져옵니다.
# .env 파일에 REDIS_URL="redis://localhost:6379/0" 설정이 있어야 합니다.
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Celery 애플리케이션 인스턴스를 생성합니다.
# 첫 번째 인자는 현재 모듈의 이름, broker와 backend는 Redis 서버 주소를 지정합니다.
celery_app = Celery(
    "worker",
    broker=redis_url,
    backend=redis_url
)

# Celery가 자동으로 'tasks.py' 같은 파일에서 작업을 찾도록 설정합니다.
# 예를 들어, app/tasks/ 폴더를 만들어 그 안에 작업을 정의할 수 있습니다.
# celery_app.autodiscover_tasks(['app.tasks'])

# 테스트를 위한 간단한 샘플 작업을 정의합니다.
# @celery_app.task 데코레이터를 사용하여 Celery 작업으로 등록합니다.
@celery_app.task
def add(x, y):
    """두 숫자를 더하는 간단한 테스트 작업"""
    return x + y