# file: backend/app/config.py

import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict # pydantic-settings 임포트

# Pydantic Settings 설정: .env 파일에서 환경 변수 로드
# SettingsConfigDict는 Pydantic v2+에서 BaseSettings를 위한 설정입니다.
class Settings(BaseSettings):
    # .env 파일을 찾을 위치를 지정합니다.
    # 현재 `backend/app/config.py` 파일에서 `.env` 파일이 `backend/` 폴더에 있으므로,
    # os.path.dirname(__file__)은 'backend/app'을, '..'은 'backend'를 가리킵니다.
    model_config = SettingsConfigDict(env_file='backend/.env', extra='ignore') # 👈 .env 파일 경로 지정

    # --- 데이터베이스 및 Redis 설정 ---
    DATABASE_URL: str
    REDIS_URL: str

    # --- JWT 설정 ---
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- OAuth2 설정 (Google, Kakao, Naver) ---
    # 각 클라이언트 ID, 시크릿, 리다이렉트 URI는 .env 파일에서 로드됩니다.
    # Optional[str]로 설정하여, 해당 소셜 로그인을 사용하지 않을 경우에도 오류 없이 앱이 시작되도록 합니다.
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback" # 기본값 설정 (개발용)

    KAKAO_CLIENT_ID: Optional[str] = None
    KAKAO_CLIENT_SECRET: Optional[str] = None
    KAKAO_REDIRECT_URI: str = "http://localhost:3000/auth/callback" # 기본값 설정 (개발용)

    NAVER_CLIENT_ID: Optional[str] = None
    NAVER_CLIENT_SECRET: Optional[str] = None
    NAVER_REDIRECT_URI: str = "http://localhost:3000/auth/callback" # 기본값 설정 (개발용)

    # --- 프론트엔드 및 이메일 서비스 설정 ---
    FRONTEND_BASE_URL: str = "http://localhost:3000" # 프론트엔드 앱의 기본 URL (이메일 링크 생성용)

    MAIL_API_KEY: Optional[str] = None
    MAIL_SENDER_EMAIL: Optional[str] = None
    MAIL_SERVICE_URL: Optional[str] = None # 이메일 발송 API 엔드포인트

    # --- 암호화 키 (API 키 암호화/복호화용) ---
    # 이 키는 매우 중요하며, 반드시 32자 이상의 강력한 무작위 문자열로 설정해야 합니다.
    # secrets.token_urlsafe(32) 등으로 생성하여 .env에 저장하세요.
    ENCRYPTION_MASTER_KEY: str

    # --- 결제 게이트웨이 설정 (필요 시) ---
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    FRONTEND_SUCCESS_PAYMENT_URL: str = "http://localhost:3000/payment/success"
    FRONTEND_CANCEL_PAYMENT_URL: str = "http://localhost:3000/payment/cancel"

    IAMPORT_API_KEY: Optional[str] = None
    IAMPORT_API_SECRET: Optional[str] = None

    # --- 애플리케이션의 기본 플랜 기능 제한 설정 (DB에 플랜 정보가 없을 경우의 기본값 또는 초기값) ---
    # 이 값들은 initial_db.py에서 DB에 기본 플랜을 삽입할 때 사용될 수 있으며,
    # DB에서 플랜 정보를 가져오기 전의 fallback 값으로 사용될 수 있습니다.
    BASIC_PLAN_MAX_BACKTESTS_PER_DAY: int = 5
    BASIC_PLAN_CONCURRENT_BOTS_LIMIT: int = 0
    BASIC_PLAN_ALLOWED_TIMEFRAMES: List[str] = ["1h"]

    TRADER_PLAN_MAX_BACKTESTS_PER_DAY: int = 50
    TRADER_PLAN_CONCURRENT_BOTS_LIMIT: int = 5
    TRADER_PLAN_ALLOWED_TIMEFRAMES: List[str] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"]

    PRO_PLAN_MAX_BACKTESTS_PER_DAY: int = 9999 # 사실상 무제한
    PRO_PLAN_CONCURRENT_BOTS_LIMIT: int = 20
    PRO_PLAN_ALLOWED_TIMEFRAMES: List[str] = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"]


# 설정 인스턴스 생성
# 이 인스턴스를 다른 서비스나 라우터에서 임포트하여 사용합니다.
settings = Settings()