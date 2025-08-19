# file: backend/app/database.py

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set.")

# 1. 비동기(Async) 엔진 생성
#    - 연결 풀링: 기본적으로 제공되는 AsyncAdaptedQueuePool을 사용하여 효율적인 연결 관리
#    - connect_args: 모든 연결의 타임존을 UTC로 강제하여 시간대 혼동 방지
engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # 연결 사용 전 유효성 검사
    pool_recycle=3600,   # 1시간마다 연결 재활용
    connect_args={
        "server_settings": {
            "timezone": "utc"
        }
    }
)

# 2. 비동기 세션 생성기(Session Factory) 정의
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# 3. 모델의 Base 클래스 (기존과 동일)
class Base(DeclarativeBase):
    pass

# 4. 비동기 DB 세션 의존성 주입 함수
#    (이 함수는 dependencies.py로 옮겨 중앙 관리하는 것이 더 좋습니다)
async def get_async_db() -> AsyncSession:
    """
    비동기 데이터베이스 세션을 생성하고 API 처리가 끝나면 자동으로 닫습니다.
    """
    async with AsyncSessionLocal() as session:
        yield session