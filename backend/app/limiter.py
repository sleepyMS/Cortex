# file: backend/app/limiter.py

from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import settings

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=f"{settings.DB.REDIS_URL}/1"
)