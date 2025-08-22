# backend/migrations/env.py

import os
import sys
from logging.config import fileConfig

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

# --- 1. 경로 설정 및 .env 파일 로드 ---
# __file__은 현재 파일(env.py)의 경로입니다.
#これを基準にプロジェクトのルートディレクトリのパスを計算します。
# os.getcwd()よりはるかに安定した方法です。
MIGRATIONS_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(MIGRATIONS_DIR, '..'))
sys.path.insert(0, BACKEND_DIR) # sys.pathの最も前にプロジェクトのルートを追加します。

# .envファイルをロードします。
dotenv_path = os.path.join(BACKEND_DIR, '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

# Alembic設定オブジェクトをロードします。これはalembic.iniファイルの設定を含んでいます。
config = context.config

# Pythonロギングを設定します。
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- 2. SQLAlchemyモデルをインポートし、target_metadataを設定します。 ---
# Alembicがテーブルの変更を自動的に検出できるように、
# Baseを継承するすべてのモデルをインポートする必要があります。
try:
    from app.database import Base
    import app.models  # 이 임포트를 통해 모든 모델이 Base.metadata에 등록됩니다.
    target_metadata = Base.metadata
except (ImportError, AttributeError) as e:
    print(f"모델 임포트 오류: {e}")
    print("BACKEND_DIR 경로 또는 app/models/__init__.py 설정을 확인하세요.")
    target_metadata = None


# --- 3. (핵심) Alembic 실행을 위한 동기 DB URL 설정 ---
# FastAPIアプリケーションは非同期ドライバ(asyncpg)を使用しますが、
# Alembicは同期的に実行されるため、同期ドライバ(psycopg2)が必要です。
# .envから非同期URLを読み込み、Alembic用に同期URLに変換します。
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