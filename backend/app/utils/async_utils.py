# async_utils.py
import eventlet
from eventlet import tpool
import asyncio
from typing import TypeVar, Awaitable

T = TypeVar("T")

def run_async(coro: Awaitable[T]) -> T:
    """
    Eventlet 환경에서 asyncio 코루틴을 안전하게 실행합니다.
    별도의 OS 스레드 풀에서 asyncio를 실행하여 Eventlet과의 충돌을 방지합니다.
    """
    def _run_in_thread():
        # 완전히 새로운 OS 스레드에서 asyncio 실행
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    # Eventlet의 스레드 풀에서 실행 (greenlet과 분리)
    return tpool.execute(_run_in_thread)