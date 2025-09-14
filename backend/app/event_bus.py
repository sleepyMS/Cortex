# file: backend/app/event_bus.py
import logging
from typing import Dict, Any
from .celery_app import celery_app

logger = logging.getLogger(__name__)

def publish_event(event_name: str, payload: Dict[str, Any]):
    """
    중앙 이벤트 버스(Celery)로 이벤트를 발행하는 표준 함수.
    
    :param event_name: 이벤트의 종류 (e.g., "payment.succeeded")
    :param payload: 이벤트와 함께 전달될 데이터 딕셔너리
    """
    try:
        # 'dispatch_event'라는 중앙 처리 태스크를 호출하여 이벤트 분배를 위임합니다.
        celery_app.send_task('dispatch_event', args=[event_name, payload])
        logger.info(f"Published event '{event_name}' with payload: {payload}")
    except Exception as e:
        logger.critical(f"CRITICAL: Failed to publish event '{event_name}': {e}", exc_info=True)
        # 여기에 에러 리포팅 시스템(Sentry 등) 연동