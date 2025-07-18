from logging.config import fileConfig
import os 
import sys
from dotenv import load_dotenv 

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

load_dotenv(os.path.join(os.getcwd(), '..', '.env'))

# target_metadata를 임포트할 모델의 Base로 설정
# 예시: from myapp.models import Base
# Project: Cortex의 경우, backend/app/models.py에서 Base를 임포트
# sys.path에 backend/app 디렉토리를 추가하여 models 모듈을 찾을 수 있도록 함
sys.path.append(os.path.join(os.getcwd(), 'app'))
from app.database import Base # app.database에서 Base 임포트 (Base는 models에서 정의될 수도 있음)
target_metadata = Base.metadata

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


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
