# file: backend/app/config.py

from typing import List, Optional
from pathlib import Path
from pydantic import BaseModel, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# .env 파일의 위치 (backend/.env)
BASE_DIR = Path(__file__).resolve().parent.parent


# --- 1. 그룹별 서브 모델 정의 ---

class DatabaseSettings(BaseModel):
    DATABASE_URL: str
    REDIS_URL: str


class AuthSettings(BaseModel):
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: Optional[str] = None

    KAKAO_CLIENT_ID: Optional[str] = None
    KAKAO_CLIENT_SECRET: Optional[str] = None
    KAKAO_REDIRECT_URI: Optional[str] = None

    NAVER_CLIENT_ID: Optional[str] = None
    NAVER_CLIENT_SECRET: Optional[str] = None
    NAVER_REDIRECT_URI: Optional[str] = None


class AppSettings(BaseModel):
    FRONTEND_BASE_URL: str = "http://localhost:3000"
    ENCRYPTION_MASTER_KEY: str
    ENCRYPTION_SALT: str
    ADMIN_EMAIL: Optional[str] = None
    ADMIN_PASSWORD: Optional[str] = None


class EmailSettings(BaseModel):
    MAIL_API_KEY: Optional[str] = None
    MAIL_SENDER_EMAIL: Optional[str] = None
    MAIL_SERVICE_URL: Optional[str] = None


class PaymentSettings(BaseModel):
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    STRIPE_API_BASE_URL: str = "https://api.stripe.com/v1"

    FRONTEND_SUCCESS_PAYMENT_URL: str = "http://localhost:3000/payment/success"
    FRONTEND_CANCEL_PAYMENT_URL: str = "http://localhost:3000/payment/cancel"

    IAMPORT_API_KEY: Optional[str] = None
    IAMPORT_API_SECRET: Optional[str] = None
    IAMPORT_API_BASE_URL: str = "https://api.iamport.kr"

    TOSS_PAYMENTS_SECRET_KEY: Optional[str] = None
    TOSS_PAYMENTS_API_BASE_URL: str = "https://api.tosspayments.com"


class PlanFeatureSettings(BaseModel):
    MAX_BACKTESTS_PER_DAY: int
    CONCURRENT_BOTS_LIMIT: int
    ALLOWED_TIMEFRAMES: List[str]

    @field_validator("ALLOWED_TIMEFRAMES", mode="before")
    def parse_timeframes(cls, v):
        if isinstance(v, str):
            return [tf.strip() for tf in v.split(",")]
        return v


class PlanSettings(BaseModel):
    BASIC: PlanFeatureSettings
    TRADER: PlanFeatureSettings
    PRO: PlanFeatureSettings


# --- 2. 최상위 Settings 클래스 ---

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        env_nested_delimiter="__"  # 👈 중첩 구조는 __ (언더스코어 두 개)로 구분
    )

    DB: DatabaseSettings
    AUTH: AuthSettings
    APP: AppSettings
    EMAIL: EmailSettings
    PAYMENT: PaymentSettings
    PLANS: PlanSettings


# --- 3. 전역 settings 객체 생성 ---

settings = Settings()
