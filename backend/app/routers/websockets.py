# file: backend/app/routers/websockets.py 

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from redis.asyncio import Redis as AsyncRedis

from app.config import settings

router = APIRouter(prefix="/ws", tags=["WebSocket"])

# Redis 클라이언트는 애플리케이션 시작 시 연결하는 것이 좋습니다.
# 여기서는 간단하게 표현합니다.
redis_client = AsyncRedis.from_url(settings.DB.REDIS_URL, decode_responses=True)


@router.websocket("/backtest/{backtest_id}")
async def websocket_endpoint(websocket: WebSocket, backtest_id: str):
    """백테스트 진행 상황을 실시간으로 전달하는 WebSocket 엔드포인트"""
    await websocket.accept()

    channel = f"ws:backtest:{backtest_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    try:
        # Redis 채널로부터 메시지를 기다리고, 받으면 클라이언트로 전송
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=None)
            if message:
                await websocket.send_text(message['data'])

    except WebSocketDisconnect:
        print(f"Client disconnected from backtest {backtest_id}")
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()

@router.websocket("/ai-training/{model_id}")
async def websocket_ai_training_endpoint(websocket: WebSocket, model_id: str):
    """AI 학습 진행 상황을 실시간으로 전달하는 WebSocket 엔드포인트"""
    await websocket.accept()
    
    channel = f"ws:ai-training:{model_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=None)
            if message:
                await websocket.send_text(message['data'])

    except WebSocketDisconnect:
        # print(f"Client disconnected from ai-training {model_id}")
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()

@router.websocket("/optimization/{optimization_id}")
async def websocket_optimization_endpoint(websocket: WebSocket, optimization_id: str):
    """최적화 진행 상황을 실시간으로 전달하는 WebSocket 엔드포인트"""
    await websocket.accept()
    
    # 최적화 전용 채널을 구독합니다.
    channel = f"ws:optimization:{optimization_id}"
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel)

    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=None)
            if message:
                await websocket.send_text(message['data'])

    except WebSocketDisconnect:
        print(f"Client disconnected from optimization {optimization_id}")
    finally:
        await pubsub.unsubscribe(channel)
        await pubsub.close()