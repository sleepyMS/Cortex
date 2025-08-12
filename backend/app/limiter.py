import os
from slowapi import Limiter
from slowapi.util import get_remote_address

# .env 파일에서 REDIS_URL을 가져옵니다.
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379")

# limiter 인스턴스를 여기서 생성합니다.
limiter = Limiter(key_func=get_remote_address, storage_uri=f"{REDIS_URL}/1")