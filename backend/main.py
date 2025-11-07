# file: backend/main.py

import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# --- 1. 애플리케이션 모듈 임포트 ---
# engine -> async_engine으로 이름을 변경하여 명확성을 높입니다.
from app.database import async_engine, Base, AsyncSessionLocal
from app.limiter import limiter
from app.services.plan_service import plan_service
from app.services.marketplace_service import marketplace_service
from app.routers import (
    auth, users, backtests, strategies, api_keys,
    plans, subscriptions, live_bots, community, admin, market_data, marketplace, websockets, indicators, webhook, credits, optimizations
)

# .env 파일 로드
load_dotenv()

# --- 2. (개선) FastAPI 생명주기(Lifecycle) 관리자 ---
# @app.on_event("startup") 대신 최신 권장 방식인 lifespan을 사용합니다.
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    애플리케이션 시작 시 DB 테이블을 생성하고 초기 데이터를 시딩합니다.
    """
    print("INFO:     Application startup...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Session을 사용하여 초기 데이터 시딩
    async with AsyncSessionLocal() as session:
        try:
            # 각 서비스가 자신의 초기 데이터를 책임지도록 호출
            await plan_service.seed_initial_plans(session)
            await marketplace_service.seed_credit_packs(session) 
            
            await session.commit()
            print("INFO:     Initial data seeded successfully.")
        except Exception as e:
            await session.rollback()
            print(f"ERROR:    Failed to seed initial data: {e}")

    yield
    print("INFO:     Application shutdown...")


# --- 3. FastAPI 앱 인스턴스 생성 ---
app = FastAPI(
    title="Project Cortex API",
    description="암호화폐 퀀트 트레이딩 플랫폼 API",
    version="0.1.0",
    lifespan=lifespan  # 개선된 생명주기 관리자 연결
)

# --- 4. 미들웨어 및 예외 핸들러 설정 (기존과 동일, 일부 개선) ---

app.state.limiter = limiter

# 기존 핸들러 대신 slowapi의 기본 핸들러를 사용하여 코드를 간소화할 수 있습니다.
# 더 복잡한 로직이 필요하다면 기존의 custom 핸들러를 사용해도 좋습니다.
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS 미들웨어 설정
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 5. API 라우터 포함 ---

API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX, tags=["Authentication"])
app.include_router(users.router, prefix=API_PREFIX, tags=["Users"])
app.include_router(strategies.router, prefix=API_PREFIX, tags=["Strategies"])
app.include_router(backtests.router, prefix=API_PREFIX, tags=["Backtesting"])
app.include_router(live_bots.router, prefix=API_PREFIX, tags=["Live Bots"])
app.include_router(api_keys.router, prefix=API_PREFIX, tags=["API Keys"])
app.include_router(plans.router, prefix=API_PREFIX, tags=["Subscription Plans"])
app.include_router(subscriptions.router, prefix=API_PREFIX, tags=["Subscriptions"])
app.include_router(market_data.router, prefix=API_PREFIX, tags=["Market Data"])
app.include_router(marketplace.router, prefix=API_PREFIX, tags=["Marketplace"])
app.include_router(community.router, prefix=API_PREFIX, tags=["Community"])
app.include_router(admin.router, prefix=API_PREFIX, tags=["Admin"])
app.include_router(websockets.router, prefix=API_PREFIX, tags=["WebSocket"])
app.include_router(indicators.router, prefix=API_PREFIX, tags=["Indicators"])
app.include_router(webhook.router, prefix=API_PREFIX, tags=["Webhook"]) 
app.include_router(credits.router, prefix=API_PREFIX, tags=["Credits"]) 
app.include_router(optimizations.router, prefix=API_PREFIX, tags=["Optimizations"]) 


@app.get(f"{API_PREFIX}/health", tags=["Health Check"])
def health_check():
    """서버의 상태를 확인하는 간단한 엔드포인트입니다."""
    return {"status": "ok"}