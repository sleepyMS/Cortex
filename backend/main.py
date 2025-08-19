# file: backend/main.py

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from dotenv import load_dotenv
from datetime import datetime

from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# .env 파일 로드
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# --- 애플리케이션 모듈 임포트 ---
from .app.limiter import limiter
from .app.database import engine, Base 
from .app.services.plan_service import plan_service 
from .app.routers import (
    auth, users, backtests, strategies, api_keys, 
    plans, subscriptions, live_bots, community, admin, market_data
)

# 로깅 설정 초기화
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# FastAPI 애플리케이션 인스턴스 생성
app = FastAPI(
    title="Project Cortex API",
    description="암호화폐 퀀트 트레이딩 플랫폼 API",
    version="0.1.0",
)

# --- 미들웨어 및 예외 핸들러 설정 ---

app.state.limiter = limiter

async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """API 요청 제한 초과 시 커스텀 응답을 반환합니다."""
    error_detail = "너무 많은 요청을 보냈습니다. 잠시 후 다시 시도해주세요."
    retry_after = getattr(exc, 'retry_after', None)
    if retry_after:
        error_detail = f"너무 많은 요청을 보냈습니다. {int(retry_after)}초 후에 다시 시도해주세요."
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": error_detail}
    )

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# CORS 미들웨어 설정
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 애플리케이션 생명주기(Lifecycle) 이벤트 핸들러 ---

@app.on_event("startup")
async def on_startup():
    """애플리케이션 시작 시, DB에 연결하여 테이블을 생성하고 초기 데이터를 시딩합니다."""
    logger.info("Application startup event triggered.")
    async with engine.begin() as conn:
        logger.info("Creating database tables if they do not exist...")
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables verified.")
    
    # Session을 사용하여 초기 데이터 시딩
    # get_async_db 의존성을 직접 사용하는 대신, SessionLocal을 사용하여 세션 생성
    from .app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        try:
            await plan_service.seed_initial_plans(session)
            await session.commit()
            logger.info("Initial plans seeded successfully.")
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed to seed initial plans: {e}", exc_info=True)

# --- API 라우터 포함 ---

app.include_router(auth.router, prefix="/api", tags=["Authentication"])
app.include_router(users.router, prefix="/api", tags=["Users"])
app.include_router(strategies.router, prefix="/api", tags=["Strategies"])
app.include_router(backtests.router, prefix="/api", tags=["Backtesting"])
app.include_router(live_bots.router, prefix="/api", tags=["Live Bots"])
app.include_router(api_keys.router, prefix="/api", tags=["API Keys"])
app.include_router(plans.router, prefix="/api", tags=["Subscription Plans"])
app.include_router(subscriptions.router, prefix="/api", tags=["Subscriptions"])
app.include_router(market_data.router, prefix="/api", tags=["Market Data"])
app.include_router(community.router, prefix="/api", tags=["Community"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])


# 서버 헬스 체크 엔드포인트
@app.get("/api/health", tags=["Health Check"])
def health_check():
    """서버의 상태를 확인하는 간단한 엔드포인트입니다."""
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}