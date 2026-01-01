# file: backend/app/utils/communication.py

import redis
import json
from app.config import settings
from typing import Optional

# --- Redis 클라이언트 인스턴스는 한 번만 생성 ---
redis_client = redis.from_url(settings.DB.REDIS_URL)

class WebSocketManager:
    @staticmethod
    def send_status_update(backtest_id: str, status: str, message: str, progress: int = 0):
        channel = f"ws:backtest:{backtest_id}"
        payload = json.dumps({"status": status, "message": message, "progress": progress})
        redis_client.publish(channel, payload)

    @staticmethod
    def send_optimization_update(optimization_id: str, status: str, message: str, 
                                 progress_data: Optional[dict] = None):

        """
        [신규 함수] 최적화 채널로 상태를 전송합니다.
        """
        channel = f"ws:optimization:{optimization_id}"
        
        payload = json.dumps({
            "status": status, 
            "message": message, 
            "progress": progress_data  # 예: {"currentStep": 5, "totalSteps": 100}
        })
        redis_client.publish(channel, payload)

    @staticmethod
    def send_ai_training_update(model_id: str, status: str, message: str, 
                                progress_pct: int, current_metrics: Optional[dict] = None):
        """
        [신규 함수] AI 학습 진행 상황을 전송합니다.
        current_metrics: { "phase": str, "epoch": int, "trainLoss": float, "valLoss": float, ... }
        """
        channel = f"ws:ai-training:{model_id}"
        payload = json.dumps({
            "status": status,
            "message": message,
            "progressPct": progress_pct,
            "currentMetrics": current_metrics or {}
        })
        redis_client.publish(channel, payload)

class EventPublisher:
    @staticmethod
    def publish_backtest_event(event_type: str, payload: dict):
        channel = "events:backtesting"
        event_data = json.dumps({"event_type": event_type, "payload": payload})
        redis_client.publish(channel, event_data)