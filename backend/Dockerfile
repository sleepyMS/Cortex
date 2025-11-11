# --- 1. Build Stage ---
# Python 3.11을 기반으로 빌드 환경을 구성합니다.
FROM python:3.11-slim as builder

WORKDIR /app

# 시스템 의존성 설치 (PostgreSQL 클라이언트 등)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Poetry (의존성 관리 도구) 설치 - 만약 requirements.txt를 쓰신다면 pip로 대체
# 여기서는 requirements.txt를 사용한다고 가정하겠습니다.
COPY requirements.txt .

# 가상환경을 생성하고 의존성을 설치합니다.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# --- 2. Final Stage ---
# 가벼운 slim 이미지에서 최종 이미지를 구성합니다.
FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치 (실행에 필요한 최소한)
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# 빌드 스테이지에서 생성된 가상환경을 복사합니다.
COPY --from=builder /opt/venv /opt/venv

# 애플리케이션 코드를 복사합니다.
COPY . /app

# 실행 스크립트에 실행 권한을 부여합니다.
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 가상환경을 PATH에 추가합니다.
ENV PATH="/opt/venv/bin:$PATH"

# Entrypoint 설정 (DB 마이그레이션 등을 위함)
ENTRYPOINT ["/entrypoint.sh"]

# 기본 실행 명령어 (API 서버) - 이 부분은 배포 시 덮어쓰게 됩니다.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]