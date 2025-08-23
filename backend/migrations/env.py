# backend/migrations/env.py

import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# --- 1. 경로 설정 ---
# 이 부분은 다른 모듈을 임포트하기 위해 그대로 유지합니다.
MIGRATIONS_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(MIGRATIONS_DIR, '..'))
sys.path.insert(0, BACKEND_DIR)

# --- 2. 중앙 설정 객체 및 모델 임포트 ---
from app.config import settings
from app.database import Base
import app.models  # 이 임포트를 통해 모든 모델이 Base.metadata에 등록됩니다.

# Alembic 설정 객체 로드
config = context.config

# Python 로깅 설정
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# target_metadata 설정
target_metadata = Base.metadata


# --- 3. 중앙 설정 객체를 사용하여 동기 DB URL 설정 ---
# settings.DB.DATABASE_URL에서 비동기 URL을 가져옵니다.
db_url = settings.DB.DATABASE_URL

# 'postgresql+asyncpg://' -> 'postgresql://' 로 변경
if db_url.startswith("postgresql+asyncpg://"):
    sync_db_url = db_url.replace("+asyncpg", "")
    config.set_main_option('sqlalchemy.url', sync_db_url)
else:
    config.set_main_option('sqlalchemy.url', db_url)


def run_migrations_offline() -> None:
    """'오프라인' 모드에서 마이그레이션을 실행합니다."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """'온라인' 모드에서 마이그레이션을 실행합니다."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()