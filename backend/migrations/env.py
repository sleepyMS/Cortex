from logging.config import fileConfig
import os
from dotenv import load_dotenv

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# --- 디버깅 시작 ---
print(f"DEBUG: 현재 작업 디렉토리: {os.getcwd()}")
dotenv_path = os.path.join(os.getcwd(), '.env') # .env 경로 수정 확인
print(f"DEBUG: .env 파일 경로 시도: {dotenv_path}")

if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print("DEBUG: .env 파일 로드 성공.")
    print(f"DEBUG: DATABASE_URL 환경 변수: {os.getenv('DATABASE_URL')}")
else:
    print("DEBUG: .env 파일 찾을 수 없음. 경로를 다시 확인하세요.")

# target_metadata를 임포트할 모델의 Base로 설정
import sys

app_path = os.path.join(os.getcwd(), 'app')
print(f"DEBUG: sys.path에 추가할 경로: {app_path}")
if app_path not in sys.path:
    sys.path.append(app_path)
    print(f"DEBUG: {app_path}를 sys.path에 추가했습니다.")
else:
    print(f"DEBUG: {app_path}는 이미 sys.path에 있습니다.")

try:
    from app.database import Base
    # 중요: app.models 모듈을 명시적으로 임포트하여 SQLAlchemy 모델들이 Base.metadata에 등록되도록 합니다.
    import app.models # 이 줄을 추가!

    print(f"DEBUG: app.database.Base 임포트 성공. Base 객체: {Base}")
    print(f"DEBUG: app.models 임포트 성공.")


    # Base.metadata에 등록된 테이블 확인
    if Base.metadata.tables:
        print("DEBUG: Base.metadata에 등록된 테이블:")
        for table_name, table_obj in Base.metadata.tables.items():
            print(f" - {table_name}")
    else:
        print("DEBUG: Base.metadata.tables에 등록된 테이블이 없습니다. (문제 예상 지점)")

    target_metadata = Base.metadata
    print(f"DEBUG: target_metadata 설정 완료. 실제 target_metadata: {target_metadata}")

except ImportError as e:
    print(f"ERROR: app.database.Base 또는 app.models 임포트 실패: {e}")
    target_metadata = None
except Exception as e:
    print(f"ERROR: Base.metadata 처리 중 오류 발생: {e}")
    target_metadata = None
# --- 디버깅 끝 ---


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = os.getenv("DATABASE_URL")
    if target_metadata is None:
        raise Exception("target_metadata가 로드되지 않았습니다. env.py를 확인하세요.")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # config.get_section에서 sqlalchemy.url을 직접 사용하지 않고,
    # offline 모드와 동일하게 os.getenv("DATABASE_URL")을 사용하도록 변경
    # 이는 alembic.ini의 %(DATABASE_URL)s 변수 대체가 실패할 때의 우회책입니다.
    if target_metadata is None:
        raise Exception("target_metadata가 로드되지 않았습니다. env.py를 확인하세요.")
    connectable = engine_from_config(
        {"sqlalchemy.url": os.getenv("DATABASE_URL")},
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
