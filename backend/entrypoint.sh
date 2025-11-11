#!/bin/sh

# entrypoint.sh

echo "Waiting for PostgreSQL..."
# DB가 준비될 때까지 대기 (실제로는 docker-compose의 depends_on이나 K8s의 init-container 사용)
# 여기서는 간단하게 sleep을 사용하거나, DB 준비 스크립트를 추가할 수 있습니다.
# (이 부분은 인프라 환경에 따라 달라지므로 우선 생략)

echo "Applying database migrations..."
# Alembic 마이그레이션 실행
alembic upgrade head

echo "Starting command..."
# CMD로 전달된 명령어를 실행합니다 (예: uvicorn...)
exec "$@"