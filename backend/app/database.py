# file: backend/app/database.py

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool, QueuePool # 👈 QueuePool도 임포트 유지
from dotenv import load_dotenv

load_dotenv() # .env 파일 로드

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set.")

# FastAPI 애플리케이션용 Engine
# 개발 환경의 `--reload` 모드 (multiprocessing 사용)에서는 QueuePool이 문제를 일으킬 수 있으므로,
# 개발 시에는 NullPool을 사용하도록 설정하고, 프로덕션 배포 시에는 QueuePool로 변경하는 것을 고려합니다.
# 현재는 `uvicorn --reload` 에서 안정적인 `NullPool`을 기본으로 사용합니다.
engine_fastapi = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    poolclass=NullPool, # 👈 FastAPI 개발 서버 (reload 모드)에서도 NullPool 사용
    connect_args={"options": "-c timezone=utc"},
)

# Celery 워커용 Engine (NullPool 사용) - 기존과 동일
engine_celery = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    poolclass=NullPool,
    connect_args={"options": "-c timezone=utc"},
)


# SessionLocal 클래스 - 기본적으로 FastAPI용 엔진에 바인딩
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_fastapi)

# 모델의 Base 클래스
class Base(DeclarativeBase):
    pass

# DB 세션 의존성 주입 함수 (FastAPI 라우터용)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()