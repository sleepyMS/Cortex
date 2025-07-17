# 💻 01. 설치 및 실행 가이드 (Getting Started)

## 1. 필수 요구사항 (Prerequisites)

- [Node.js](https://nodejs.org/) v20.x 이상
- [Python](https://www.python.org/) 3.11.x 이상
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## 2. 프로젝트 클론

```bash
git clone [Your Repository URL]
cd Project-Cortex
```

## 3. 데이터베이스 설정 (로컬)

`docker-compose.yml` 파일이 프로젝트 루트에 있는지 확인합니다.

```bash
# 프로젝트 루트에서 실행
docker-compose up -d
```

- 위 명령은 로컬 PC에 PostgreSQL+TimescaleDB 서버를 실행시킵니다.

- DB 접속 정보: (user: `cortex_user`, password: `cortex_password`, db: `cortex_db`, host: `localhost`, port: `5432`)

## 4. 백엔드 설정 및 실행

```bash
# 1. 백엔드 폴더로 이동 및 가상환경 생성/활성화
cd backend
python -m venv venv
source venv/bin/activate  # macOS/Linux
# .\\venv\\Scripts\\activate  # Windows

# 2. 의존성 설치 (requirements.txt 파일이 필요합니다)
pip install fastapi "uvicorn[standard]" sqlalchemy psycopg2-binary passlib[bcrypt] polars "python-jose[cryptography]"
# 또는 pip install -r requirements.txt

# 3. 환경변수 파일(.env) 생성 및 설정
# backend/.env 파일을 생성하고 아래 내용을 채웁니다.
DATABASE_URL="postgresql://cortex_user:cortex_password@localhost:5432/cortex_db"
SECRET_KEY="<[https://random-string-generator.com/](https://random-string-generator.com/) 에서 생성한 긴 무작위 문자열로 교체>"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=60

# 4. 서버 실행
uvicorn main:app --reload
```

- 백엔드 서버가 `http://127.0.0.1:8000` 에서 실행됩니다.

## 5. 프론트엔드 설정 및 실행

```bash
# 1. 프론트엔드 폴더로 이동 (별도의 터미널을 사용하세요)
cd frontend

# 2. 의존성 설치
npm install

# 3. 환경변수 파일(.env.local) 생성 및 설정
# frontend/.env.local 파일을 생성하고 아래 내용을 채웁니다.
NEXT_PUBLIC_API_URL="[http://127.0.0.1:8000](http://127.0.0.1:8000)"

# 4. 개발 서버 실행
npm run dev
```

- 프론트엔드 개발 서버가 `http://localhost:3000` 에서 실행됩니다.
