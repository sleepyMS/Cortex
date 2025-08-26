# file: backend/app/utils/communication.py

import redis
import json
from app.config import settings

# --- Redis 클라이언트 인스턴스는 한 번만 생성 ---
redis_client = redis.from_url(settings.DB.REDIS_URL)

class WebSocketManager:
    @staticmethod
    def send_status_update(backtest_id: str, status: str, message: str, progress: int = 0):
        channel = f"ws:backtest:{backtest_id}"
        payload = json.dumps({"status": status, "message": message, "progress": progress})
        redis_client.publish(channel, payload)

class EventPublisher:
    @staticmethod
    def publish_backtest_event(event_type: str, payload: dict):
        channel = "events:backtesting"
        event_data = json.dumps({"event_type": event_type, "payload": payload})
        redis_client.publish(channel, event_data)