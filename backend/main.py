# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# dotenv 로딩을 main.py 시작 부분에서 명시적으로 수행
# 👈 load_dotenv를 임포트하고 호출 경로를 지정
from dotenv import load_dotenv, find_dotenv
import os

# .env 파일의 위치를 명시적으로 찾아서 로드 (프로젝트 루트 또는 backend 폴더)
# backend 폴더에 .env 파일이 있다면:
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
# 또는 프로젝트 루트에 .env 파일이 있다면:
# load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
# 아니면 find_dotenv()를 사용하면 자동으로 찾아줌 (하지만 확실한 경로가 더 좋음)
# load_dotenv(find_dotenv()) # 모든 상위 디렉토리에서 .env를 찾음

# 로깅 설정 초기화
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# database에서 engine_fastapi만 임포트
from .app.database import engine_fastapi

# 모든 라우터들을 임포트
from .app.routers import auth, users, backtests, strategies, api_keys, plans, subscriptions, live_bots, community, admin


# FastAPI 애플리케이션 인스턴스 생성
app = FastAPI(
    title="Project Cortex API",
    description="암호화폐 퀀트 트레이딩 플랫폼 API",
    version="0.1.0",
)

# CORS 미들웨어 설정
origins = [
    "http://localhost:3000",
    # 향후 실제 배포될 프론트엔드 도메인을 추가해야 합니다.
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 포함
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(users.router, prefix="/api")
app.include_router(backtests.router, prefix="/api", tags=["Backtesting"])
app.include_router(strategies.router, prefix="/api") 
app.include_router(api_keys.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(live_bots.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


# 서버가 살아있는지 확인하기 위한 루트 엔드포인트
@app.get("/")
def read_root():
    return {"message": "Welcome to Project Cortex API"}