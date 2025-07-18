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
source venv/bin/activate  # macOS/Linux
# .\venv\Scripts\activate  # Windows

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
source venv/bin/activate # macOS/Linux
# .\venv\Scripts\activate # Windows

# 2. Celery 워커 실행
# (main.py가 아닌, celery 인스턴스가 있는 파일 경로를 지정해야 합니다. 예: worker.py)
celery -A app.worker worker -l info
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

## 요약: 실행 중인 프로세스

모든 설정이 끝나면, 로컬 개발을 위해 아래 프로세스들이 실행 중이어야 합니다:

- **Docker:** PostgreSQL, Redis 컨테이너 (백그라운드 실행)
- **터미널 1:** FastAPI 웹 서버 (`uvicorn`)
- **터미널 2:** Celery 백그라운드 워커 (`celery`)
- **터미널 3:** Next.js 개발 서버 (`npm run dev`)
