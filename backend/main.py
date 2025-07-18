# backend/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 다른 폴더에 정의한 라우터들을 가져옵니다.
from app.routers import auth, backtests
from app.database import engine, Base

# FastAPI 애플리케이션 인스턴스 생성
app = FastAPI(
    title="Project Cortex API",
    description="암호화폐 퀀트 트레이딩 플랫폼 API",
    version="0.1.0",
)

# CORS 미들웨어 설정
# 프론트엔드(Next.js) 개발 서버인 http://localhost:3000에서의 요청을 허용합니다.
origins = [
    "http://localhost:3000",
    # 향후 실제 배포될 프론트엔드 도메인을 추가해야 합니다.
    # "https://www.your-cortex-project.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # 모든 HTTP 메소드 허용
    allow_headers=["*"], # 모든 HTTP 헤더 허용
)

# API 라우터 포함
# '/api' 라는 경로 하위에 각 라우터의 엔드포인트들을 등록합니다.
app.include_router(auth.router, prefix="/api", tags=["Authentication"])
# app.include_router(users.router, prefix="/api")
app.include_router(backtests.router, prefix="/api", tags=["Backtesting"])


# 서버가 살아있는지 확인하기 위한 루트 엔드포인트
@app.get("/")
def read_root():
    return {"message": "Welcome to Project Cortex API"}