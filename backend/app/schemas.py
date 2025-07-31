# file: backend/app/schemas.py

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Dict, Any, Literal, Union, Optional

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str | None = None

class UserUpdateProfile(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=100)

class UserUpdatePassword(BaseModel):
    old_password: str = Field(..., min_length=8, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=255)

class UserAdminUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_email_verified: Optional[bool] = None
    role: Optional[Literal["user", "admin", "pro"]] = None
    new_password: Optional[str] = Field(None, min_length=8, max_length=255)


class User(BaseModel): # 응답용 스키마 (GET /users/me 등)
    id: int
    email: EmailStr
    username: str | None
    is_active: bool
    is_email_verified: bool
    role: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str | None = None

class TokenData(BaseModel):
    email: str | None = None

class AuthCode(BaseModel):
    code: str

class AuthCodeWithState(AuthCode):
    state: str

class SocialUserProfile(BaseModel):
    provider: str
    social_id: str
    email: EmailStr
    username: str | None = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class DashboardSummary(BaseModel): # 👈 관리자 대시보드 스키마
    total_users: int = 0
    active_users: int = 0
    total_strategies: int = 0
    public_strategies: int = 0
    total_backtests_run: int = 0
    total_successful_backtests: int = 0
    total_live_bots: int = 0
    active_live_bots: int = 0
    overall_pnl: float = 0.0
    latest_signups: List[User] = Field(default_factory=list) # User 스키마 사용

    class Config:
        from_attributes = True

class SocialCallbackRequest(BaseModel):
    code: str
    state: str | None = None

# --- Email Verification & Password Reset Schemas ---
class EmailVerificationRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address to send verification link")

class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=32, description="Verification token received via email")

class PasswordResetRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address for password reset")

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=32, description="Reset token received via email")
    new_password: str = Field(..., min_length=8, max_length=255)


# --- Strategy Schemas ---
class IndicatorValue(BaseModel):
    indicatorKey: str
    values: Dict[str, Any]
    timeframe: str

class Condition(BaseModel):
    type: Literal["indicator", "value"]
    name: str
    value: Union[IndicatorValue, float]

class SignalBlockData(BaseModel):
    id: str
    type: Literal["signal"]
    conditionA: Optional[Condition] = None
    operator: str
    conditionB: Optional[Condition] = None
    children: List["SignalBlockData"] = Field(default_factory=list)
    logicOperator: Literal["AND", "OR"]

SignalBlockData.update_forward_refs()

class StrategyBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: str | None = Field(None, max_length=500)
    is_public: bool = False

class StrategyCreate(StrategyBase):
    rules: Dict[Literal["buy", "sell"], List[SignalBlockData]] = Field(
        ...,
        description="Buy and sell rules defined as a dictionary of signal blocks."
    )

class StrategyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    rules: Optional[Dict[Literal["buy", "sell"], List[SignalBlockData]]] = None
    is_public: Optional[bool] = None

class Strategy(StrategyBase):
    id: int
    author_id: int
    rules: Dict[Literal["buy", "sell"], List[SignalBlockData]]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Backtesting Schemas ---
class BacktestCreate(BaseModel):
    strategy_id: int
    ticker: str = Field(..., description="Trading pair ticker, e.g., 'BTC/USDT'")
    start_date: datetime = Field(..., description="Start date for backtest period (UTC)")
    end_date: datetime = Field(..., description="End date for backtest period (UTC)")
    initial_capital: float = Field(10000.0, ge=1.0, description="Initial capital for backtest")
    additional_parameters: Dict[str, Any] = Field(default_factory=dict)

class TradeLogEntry(BaseModel):
    timestamp: datetime
    side: Literal["buy", "sell"]
    price: float
    quantity: float
    commission: Optional[float] = None
    pnl: Optional[float] = None
    current_balance: Optional[float] = None

    class Config:
        from_attributes = True

class BacktestResultSummary(BaseModel):
    total_return_pct: Optional[float] = None
    mdd_pct: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    win_rate_pct: Optional[float] = None
    pnl_curve_json: Optional[Dict[str, Any]] = None
    trade_summary_json: Optional[Dict[str, Any]] = None
    executed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Backtest(BaseModel):
    id: int
    user_id: int
    strategy_id: int
    status: str
    parameters: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    result: Optional[BacktestResultSummary] = None
    # Backtest 응답 시 Strategy 정보 포함 (latest_backtests 등에서 사용)
    strategy: Optional[StrategyBase] = None # strategy_id만 있으면 안 되므로 StrategyBase 포함

    class Config:
        from_attributes = True


# --- Live Bot Schemas ---
class LiveBotCreate(BaseModel):
    strategy_id: int
    api_key_id: int
    initial_capital: Optional[float] = Field(None, ge=0.0, description="Initial capital for the live bot")
    ticker: str = Field(..., description="Trading pair for the bot")

class LiveBotUpdate(BaseModel):
    status: Optional[Literal["active", "paused", "stopped"]] = None

class LiveBot(BaseModel):
    id: int
    user_id: int
    strategy_id: int
    api_key_id: int
    status: str
    started_at: datetime
    stopped_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    initial_capital: Optional[float] = None
    # LiveBot 응답 시 Strategy 및 ApiKey 정보 포함 (latest_live_bots 등에서 사용)
    strategy: Optional[StrategyBase] = None
    api_key: Optional["ApiKeyResponse"] = None # ApiKeyResponse를 문자열로 참조

    class Config:
        from_attributes = True

# LiveBot.update_forward_refs() # 필요한 경우 재귀적 참조 해결 (ApiKEyResponse가 문자열 참조라)


# --- API Key Schemas ---
class ApiKeyCreate(BaseModel):
    exchange: str = Field(..., min_length=2, max_length=50)
    api_key: str = Field(..., min_length=10)
    secret_key: str = Field(..., min_length=10)
    memo: Optional[str] = Field(None, max_length=255)
    is_active: bool = True

class ApiKeyResponse(BaseModel):
    id: int
    user_id: int
    exchange: str
    memo: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Subscription & Plan Schemas ---
class Plan(BaseModel):
    id: int
    name: str
    price: float
    features: Dict[str, Any]

    class Config:
        from_attributes = True

class Subscription(BaseModel):
    id: int
    user_id: int
    plan_id: int
    status: str
    current_period_end: datetime
    payment_gateway_sub_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    plan: Plan

    class Config:
        from_attributes = True

class CheckoutRequest(BaseModel):
    plan_id: int

class CheckoutResponse(BaseModel):
    checkout_url: str


# --- Community Schemas ---
class CommunityPostCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    content: str = Field(..., min_length=10)
    backtest_id: Optional[int] = Field(None, description="Optional ID of backtest result to share")
    is_public: bool = True

class CommunityPostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    content: Optional[str] = Field(None, min_length=10)
    is_public: Optional[bool] = None

class CommunityPostResponse(BaseModel):
    id: int
    author_id: int
    backtest_id: Optional[int] = None
    title: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    likes_count: int = 0
    comments_count: int = 0

    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)

class CommentResponse(BaseModel):
    id: int
    post_id: int
    author_id: int
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LikeCreate(BaseModel):
    pass

class LikeResponse(BaseModel):
    user_id: int
    post_id: int
    status: bool = True

    class Config:
        from_attributes = True

# --- 👇 일반 사용자 대시보드 요약 스키마 추가 👇 ---
class UserDashboardSummary(BaseModel):
    # 사용자 정보 요약
    email: EmailStr
    username: Optional[str] = None
    user_id: int
    created_at: datetime
    is_email_verified: bool # 👈 이메일 인증 여부

    # 구독 정보
    current_plan_name: str
    current_plan_price: float
    subscription_end_date: Optional[datetime] = None
    subscription_is_active: bool # 👈 구독 활성 여부
    max_backtests_per_day: int
    concurrent_bots_limit: int
    allowed_timeframes: List[str]

    # 백테스트 통계
    total_backtests_run_by_user: int
    successful_backtests_by_user: int

    # 라이브 봇 통계
    total_live_bots_by_user: int
    active_live_bots_by_user: int

    # 최근 활동
    # Backtest와 LiveBot 스키마에 필요한 정보가 포함되도록 수정 (strategy, api_key)
    latest_backtests: List[Backtest] = Field(default_factory=list)
    latest_live_bots: List[LiveBot] = Field(default_factory=list)

    class Config:
        from_attributes = True