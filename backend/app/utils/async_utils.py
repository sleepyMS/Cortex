import asyncio
import threading
from typing import TypeVar, Awaitable

T = TypeVar("T")

def run_async(coro: Awaitable[T]) -> T:
    """
    별도의 스레드에서 asyncio 루프를 실행하여 Eventlet과의 충돌을 원천 차단합니다.
    이 함수는 Celery Worker (Eventlet/Solo) 환경에서 안전하게 비동기 코드를 동기적으로 실행할 때 사용합니다.
    """
    result = []
    error = []
    
    def target():
        # 새 스레드에서 새 루프 생성
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            res = loop.run_until_complete(coro)
            result.append(res)
        except Exception as e:
            error.append(e)
        finally:
            loop.close()
            
    t = threading.Thread(target=target)
    t.start()
    t.join()
    
    if error:
        raise error[0]
    return result[0]
