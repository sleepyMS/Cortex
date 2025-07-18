# 💻 01. 설치 및 실행 가이드 (Getting Started)

이 문서는 'Project: Cortex'의 로컬 개발 환경을 설정하고, 프론트엔드와 백엔드 서버를 실행하는 전체 과정을 안내합니다.

## 1. 필수 요구사항 (Prerequisites)

- [Node.js](https://nodejs.org/) v20.x 이상
- [Python](https://www.python.org/) 3.11.x 이상
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## 2. 프로젝트 클론

```bash
git clone https://github.com/sleepyMS/Cortex.git
cd Cortex
```

## 3. 필수 서비스 실행 (Docker)

> docker-compose.yml 파일이 프로젝트 루트에 있는지 확인하세요. 이 파일은 데이터베이스(PostgreSQL/TimescaleDB)와 메시지 브로커(Redis)를 포함합니다.

```bash
# 프로젝트 루트 폴더에서 아래 명령을 실행합니다.
docker-compose up -d
```

- 위 명령은 로컬 PC에 개발에 필요한 모든 서비스(DB, Redis)를 백그라운드에서 실행시킵니다.

## 4. 백엔드 설정 및 실행

> 총 2개의 터미널이 필요합니다. (1: FastAPI 웹 서버, 2: Celery 워커)

### 터미널 1: FastAPI 웹 서버 실행

```bash
# 1. 백엔드 폴더로 이동 및 가상환경 생성/활성화
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# 2. 모든 의존성 설치
# (프로젝트에 requirements.txt가 있다면 'pip install -r requirements.txt' 사용)
pip install fastapi "uvicorn[standard]" sqlalchemy psycopg2-binary passlib[bcrypt] polars "python-jose[cryptography]" celery redis

# 3. 환경변수 파일(.env) 생성 및 설정
# backend/.env 파일을 생성하고 아래 내용을 채웁니다.
DATABASE_URL="postgresql://cortex_user:cortex_password@localhost:5432/cortex_db"
REDIS_URL="redis://localhost:6379/0"
SECRET_KEY="<[https://random-string-generator.com/](https://random-string-generator.com/) 에서 생성한 긴 무작위 문자열로 교체>"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=60

# 4. FastAPI 웹 서버 실행
uvicorn main:app --reload
```

- **확인:** 브라우저에서 `http://127.0.0.1:8000` 접속 시 "Hello World" 또는 API 문서가 보이면 성공입니다.

### 터미널 2: Celery 워커 실행

```bash
# 1. 백엔드 폴더로 이동 및 가상환경 활성화 (이미 했다면 생략)
cd backend
.\venv\Scripts\activate # Windows
# source venv/bin/activate # macOS/Linux

# 2. Celery 워커 실행
# (main.py가 아닌, celery 인스턴스가 있는 파일 경로를 지정해야 합니다. 예: worker.py)
celery -A app.worker worker -l info
# celery -A app.worker:celery_app worker -l info -P solo # 병렬 처리 성능은 떨어지지만, Windows 환경과의 호환성이 가장 뛰어나 개발 및 테스트 목적
```

- **확인:** 터미널에 Celery 로고와 함께 `[tasks]` 목록이 보이고 `ready` 상태가 되면 성공입니다. 이 터미널은 계속 실행 상태로 두어야 합니다.

## 5. 프론트엔드 설정 및 실행

> 새로운 터미널이 필요합니다.

```bash
# 1. 프론트엔드 폴더로 이동
cd frontend

# 2. 의존성 설치
npm install

# 3. 환경변수 파일(.env.local) 생성 및 설정
# frontend/.env.local 파일을 생성하고 아래 내용을 채웁니다.
NEXT_PUBLIC_API_URL="[http://127.0.0.1:8000](http://127.0.0.1:8000)"

# 4. 개발 서버 실행
npm run dev
```

- **확인:** 브라우저에서 `http://localhost:3000` 접속 시 Next.js 시작 페이지가 보이면 성공입니다.

---

## 6. Alembic 설정 및 사용법

```bash
cd backend
pip install alembic
alembic init migrations # alembic.ini 설정 파일을 생성
```

- 생성된 `alembic.ini` 파일을 열어 데이터베이스 연결 정보를 설정합니다. `sqlalchemy.url` 부분을 `DATABASE_URL` 환경 변수를 사용하도록 수정합니다.

```bash
# alembic.ini (일부 내용)

# ...
[alembic]
script_location = migrations
sqlalchemy.url = %(DATABASE_URL)s # DATABASE_URL 환경 변수를 사용하도록 변경

# ... (다른 설정들)
```

- **migrations/env.py 파일 설정**

```python
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

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


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
```

- **초기 마이그레이션 생성**

```bash
alembic revision --autogenerate -m "Create initial tables"
alembic upgrade head
```

- 성공적으로 실행되면 `migrations/versions/` 디렉토리 안에 `<timestamp>_create_initial_tables.py`와 같은 이름의 파일이 생성될 것입니다. 이 파일을 열어보고 `SQLAlchemy` 모델에 따라 테이블 생성 코드가 잘 들어갔는지 확인할 수 있습니다.

### 향후 스키마 변경 시

- 1. 모델 변경: `backend/app/models.py`에서 `SQLAlchemy` 모델을 수정합니다.

```bash
# 새 마이그레이션 생성:
alembic revision --autogenerate -m "Add new_column to users table"
# 마이그레이션 스크립트 검토: 생성된 마이그레이션 파일(migrations/versions/<timestamp>_*.py)을 열어 Alembic이 변경사항을 올바르게 감지했는지 확인합니다. 필요한 경우 수동으로 수정할 수 있습니다.

# 마이그레이션 적용:
alembic upgrade head
```

- 이 과정을 통해 데이터베이스 스키마를 효과적으로 관리하고, 개발과 배포 과정에서 발생할 수 있는 데이터 불일치 문제를 방지할 수 있습니다.

## 요약: 실행 중인 프로세스

모든 설정이 끝나면, 로컬 개발을 위해 아래 프로세스들이 실행 중이어야 합니다:

- **Docker:** PostgreSQL, Redis 컨테이너 (백그라운드 실행)
- **터미널 1:** FastAPI 웹 서버 (`uvicorn`)
- **터미널 2:** Celery 백그라운드 워커 (`celery`)
- **터미널 3:** Next.js 개발 서버 (`npm run dev`)
