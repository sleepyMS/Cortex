# file: backend/main.py

from fastapi import FastAPI, Request, status 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging
import os
from dotenv import load_dotenv

from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from .app.limiter import limiter

# .env 파일 로드
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# database 및 서비스, 라우터 임포트
from .app.database import engine_fastapi, get_db
from .app.services.plan_service import plan_service
from .app.routers import auth, users, backtests, strategies, api_keys, plans, subscriptions, live_bots, community, admin, market_data

# 로깅 설정 초기화
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# FastAPI 애플리케이션 인스턴스 생성
app = FastAPI(
    title="Project Cortex API",
    description="암호화폐 퀀트 트레이딩 플랫폼 API",
    version="0.1.0",
)

app.state.limiter = limiter

async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
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
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 애플리케이션 시작 이벤트 핸들러
@app.on_event("startup")
def on_startup():
    logger.info("Application startup event triggered.")
    try:
        db: Session = next(get_db())
        plan_service._seed_initial_plans(db)
        logger.info("Initial plans seeded successfully.")
    except Exception as e:
        logger.error(f"Failed to seed initial plans: {e}", exc_info=True)
    finally:
        db.close()

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
app.include_router(market_data.router, prefix="/api")



# 서버가 살아있는지 확인하기 위한 루트 엔드포인트
@app.get("/")
def read_root():
    return {"message": "Welcome to Project Cortex API"}