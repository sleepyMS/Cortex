# backend/migrations/env.py

import os
import sys
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

# --- 1. 경로 설정 및 .env 파일 로드 ---
# __file__은 현재 파일(env.py)의 경로입니다.
# 이를 기준으로 프로젝트 루트 디렉토리의 경로를 계산합니다.
# os.getcwd() 보다 훨씬 안정적인 방법입니다.
MIGRATIONS_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(MIGRATIONS_DIR, '..'))
sys.path.insert(0, BACKEND_DIR) # sys.path 가장 앞에 프로젝트 경로를 추가합니다.

# .env 파일을 로드합니다.
dotenv_path = os.path.join(BACKEND_DIR, '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# Alembic 설정 객체를 로드합니다. 이는 alembic.ini 파일 설정을 포함하고 있습니다.
config = context.config

# Python 로깅을 설정합니다.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- 2. SQL Allchemy 모델을 가져오고 target_metadata를 설정합니다. ---
# Alembic이 테이블의 변경을 자동으로 검출할 수 있도록,
# Base를 상속하는 모든 모델을 가져와야 합니다.
try:
    from app.database import Base
    import app.models  # 이 임포트를 통해 모든 모델이 Base.metadata에 등록됩니다.
    target_metadata = Base.metadata
except (ImportError, AttributeError) as e:
    print(f"모델 임포트 오류: {e}")
    print("BACKEND_DIR 경로 또는 app/models/__init__.py 설정을 확인하세요.")
    target_metadata = None


# --- 3. (핵심) Alembic 실행을 위한 동기 DB URL 설정 ---
# Fast API 어플리케이션은 비동기 드라이버(asyncpg)를 사용하는데,
# Alembic은 동기적으로 실행되기 때문에 동기 드라이버(psycopg2)가 필요합니다.
# .env에서 비동기 URL을 불러와 Alembic용으로 동기화 URL로 변환합니다.
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL 환경 변수가 설정되지 않았습니다.")

# 'postgresql+asyncpg://' -> 'postgresql://' 로 변경합니다.
# SQLAlchemy는 드라이버가 명시되지 않으면 psycopg2를 기본으로 사용합니다.
if db_url.startswith("postgresql+asyncpg://"):
    sync_db_url = db_url.replace("+asyncpg", "")
    # Alembic 설정의 sqlalchemy.url 값을 덮어씁니다.
    config.set_main_option('sqlalchemy.url', sync_db_url)
else:
    # 이미 동기 URL인 경우 그대로 사용합니다.
    config.set_main_option('sqlalchemy.url', db_url)


def run_migrations_offline() -> None:
    """'오프라인' 모드에서 마이그레이션을 실행합니다."""
    if target_metadata is None:
        raise Exception("target_metadata가 로드되지 않았습니다.")
    context.configure(
        url=config.get_main_option("sqlalchemy.url"), # 수정된 동기 URL 사용
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """'온라인' 모드에서 마이그레이션을 실행합니다."""
    if target_metadata is None:
        raise Exception("target_metadata가 로드되지 않았습니다.")

    # alembic.ini 파일의 설정과 위에서 수정한 sqlalchemy.url을 사용하여
    # DB 엔진에 연결합니다.
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