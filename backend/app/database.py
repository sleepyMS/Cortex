# file: backend/app/database.py

from typing import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

# 모든 모델이 상속받을 Base 클래스
class Base(DeclarativeBase):
    pass

# --- 3. FastAPI를 위한 비동기(Asynchronous) 설정 ---
async_engine = create_async_engine(
    settings.DB.DATABASE_URL, # settings 객체를 직접 사용
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={"server_settings": {"timezone": "utc"}}
)

AsyncSessionLocal = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# --- 4. Celery를 위한 동기(Synchronous) 설정 ---
SYNC_DATABASE_URL = settings.DB.DATABASE_URL.replace("+asyncpg", "")

sync_engine = create_engine(
    SYNC_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine
)

# --- 5. FastAPI 의존성 주입 함수 ---
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session