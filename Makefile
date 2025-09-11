# ==============================================================================
# 💻 Project: Cortex - 맞춤형 실행 제어판
# 이 Makefile은 01_Getting_Started.md 문서의 모든 절차를 자동화합니다.
# ==============================================================================

# Python 가상환경 경로 변수 (macOS/Linux 와 Windows 호환)
VENV_ACTIVATE_CMD := . backend/venv/bin/activate

# OS 감지
ifeq ($(OS),Windows_NT)
    VENV_ACTIVATE_CMD := backend/venv/Scripts/activate
endif

# ==============================================================================
# ⚙️ 1. 초기 설정 (최초 1회 실행)
# ==============================================================================
.PHONY: setup
setup:
	@echo "환경 변수 템플릿 파일을 복사합니다..."
	@cp -n backend/.env.example backend/.env || true
	@cp -n frontend/.env.local.example frontend/.env.local || true
	@echo "백엔드 가상환경을 생성합니다..."
	@python -m venv backend/venv
	@echo "백엔드 의존성을 설치합니다 (requirements.txt)..."
	@$(VENV_ACTIVATE_CMD) && pip install -r backend/requirements.txt
	@echo "프론트엔드 의존성을 설치합니다..."
	@npm install --prefix frontend
	@echo "✅ 모든 설정이 완료되었습니다. backend/.env 파일의 SECRET_KEY를 채워주세요."
	@echo "   이후 'make db-init'으로 데이터베이스를 초기화하고, 'make run-dev'로 개발 서버를 실행하세요."


# ==============================================================================
# 💾 2. 데이터베이스 마이그레이션 (Alembic)
# ==============================================================================
.PHONY: db-init
db-init:
	@echo "데이터베이스를 Docker로 실행합니다..."
	@docker-compose up -d
	@echo "Alembic을 초기화하고 첫 마이그레이션을 적용합니다..."
	@$(VENV_ACTIVATE_CMD) && cd backend && alembic upgrade head
	@echo "✅ 데이터베이스 준비 완료."

.PHONY: db-upgrade
db-upgrade:
	@echo "데이터베이스에 최신 변경사항을 적용합니다..."
	@$(VENV_ACTIVATE_CMD) && cd backend && alembic upgrade head

# 사용법: make db-new-migration m="메시지를 여기에 입력"
.PHONY: db-new-migration
db-new-migration:
	@echo "새로운 데이터베이스 마이그레이션 파일을 생성합니다..."
	@$(VENV_ACTIVATE_CMD) && cd backend && alembic revision --autogenerate -m "$(m)"


# ==============================================================================
# 🚀 3. 개발 서버 실행
# ==============================================================================
.PHONY: run-dev
run-dev:
	@echo "필수 서비스(PostgreSQL, Redis)를 Docker로 실행합니다..."
	@docker-compose up -d
	@echo "---"
	@echo "✅ Docker 서비스 준비 완료."
	@echo "이제 아래 명령어를 **각각 새로운 터미널에서** 실행하여 모든 개발 서버를 시작하세요."
	@echo "---"
	@echo "  - API 서버 실행         : make run-backend"
	@echo "  - 프론트엔드 서버 실행  : make run-frontend"
	@echo "  - Celery 워커 (I/O) 실행: make run-worker-io"
	@echo "  - Celery 워커 (CPU) 실행: make run-worker-cpu"
	@echo "  - Celery 스케줄러 실행  : make run-beat"
	@echo "---"

# 개별 서버 실행 명령어들
.PHONY: run-backend
run-backend:
	@echo "🚀 [Backend] FastAPI 서버를 시작합니다 (http://127.0.0.1:8000)"
	@$(VENV_ACTIVATE_CMD) && cd backend && uvicorn main:app --reload

.PHONY: run-frontend
run-frontend:
	@echo "🎨 [Frontend] Next.js 서버를 시작합니다 (http://localhost:3000)"
	@npm run dev --prefix frontend

.PHONY: run-worker-io
run-worker-io:
	@echo "🧑‍🔧 [Celery] I/O-Bound 워커를 시작합니다..."
	@$(VENV_ACTIVATE_CMD) && cd backend && celery -A app.celery_app worker -l info -Q io_bound_queue -P eventlet -c 1000

.PHONY: run-worker-cpu
run-worker-cpu:
	@echo "⚙️ [Celery] CPU-Bound 워커를 시작합니다..."
	@$(VENV_ACTIVATE_CMD) && cd backend && celery -A app.celery_app worker -l info -Q cpu_bound_queue -P solo

.PHONY: run-beat
run-beat:
	@echo "⏰ [Celery] Beat 스케줄러를 시작합니다..."
	@$(VENV_ACTIVATE_CMD) && cd backend && celery -A app.celery_app beat -l info


# ==============================================================================
# 🛑 4. 중지
# ==============================================================================
.PHONY: stop
stop:
	@echo "모든 Docker 서비스를 중지합니다..."
	@docker-compose down