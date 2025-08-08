from pydantic import BaseModel, EmailStr, Field, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import List, Dict, Any, Literal, Union, Optional
import enum

# --- 모든 모델의 기반이 될 CamelCaseModel 생성 ---
class CamelCaseModel(BaseModel):
    """
    들어오는 camelCase JSON을 snake_case 모델 필드로 변환하고,
    나가는 snake_case 모델 필드를 camelCase JSON으로 변환하는 기본 모델
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True, # 별칭(camelCase)과 필드명(snake_case) 둘 다로 데이터를 받을 수 있도록 허용
        from_attributes=True,  # ORM 모델로부터 자동 변환 지원
    )

# ==============================================================================
# 1. 사용자, 인증, 구독 관련 스키마
# ==============================================================================

class UserBase(CamelCaseModel):
    email: EmailStr
    username: str | None = None

class UserCreate(CamelCaseModel):
    email: EmailStr
    password: str
    username: str | None = None

class UserUpdateProfile(CamelCaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=100)

class UserUpdatePassword(CamelCaseModel):
    old_password: str = Field(..., min_length=8, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=255)

class UserAdminUpdate(CamelCaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_email_verified: Optional[bool] = None
    role: Optional[Literal["user", "admin", "pro", "trader"]] = None
    new_password: Optional[str] = Field(None, min_length=8, max_length=255)

class Token(CamelCaseModel):
    access_token: str
    token_type: str
    refresh_token: str | None = None

class TokenData(CamelCaseModel):
    email: str | None = None

class AuthCode(CamelCaseModel):
    code: str

class AuthCodeWithState(AuthCode):
    state: str

class SocialUserProfile(CamelCaseModel):
    provider: str
    social_id: str
    email: EmailStr
    username: str | None = None

class RefreshTokenRequest(CamelCaseModel):
    refresh_token: str

class DashboardSummary(CamelCaseModel):
    total_users: int = 0
    active_users: int = 0
    total_strategies: int = 0
    public_strategies: int = 0
    total_backtests_run: int = 0
    total_successful_backtests: int = 0
    total_live_bots: int = 0
    active_live_bots: int = 0
    overall_pnl: float = 0.0
    latest_signups: List[Any] = Field(default_factory=list)

class SocialCallbackRequest(CamelCaseModel):
    code: str
    state: str | None = None

class EmailVerificationRequest(CamelCaseModel):
    email: EmailStr = Field(..., description="Email address to send verification link")

class VerifyEmailRequest(CamelCaseModel):
    token: str = Field(..., min_length=32, description="Verification token received via email")

class PasswordResetRequest(CamelCaseModel):
    email: EmailStr = Field(..., description="Email address for password reset")

class ResetPasswordRequest(CamelCaseModel):
    token: str = Field(..., min_length=32, description="Reset token received via email")
    new_password: str = Field(..., min_length=8, max_length=255)

class PlanType(str, enum.Enum):
    BASIC = "basic"
    TRADER = "trader"
    PRO = "pro"

class PlanFeatureSchema(CamelCaseModel):
    max_coins_per_backtest: int
    max_strategies: int
    live_bots_limit: int
    daily_backtest_count: int
    max_backtest_duration_years: Optional[int]
    supported_timeframes: str
    community_access: bool
    telegram_alerts: bool
    advanced_features_access: bool
    portfolio_backtest_access: bool

class PlanSchema(CamelCaseModel):
    id: int
    name: str
    price: float
    features: PlanFeatureSchema

class SubscriptionSchema(CamelCaseModel):
    id: int
    user_id: int
    plan_id: int
    status: str
    current_period_end: Optional[datetime]
    plan: PlanSchema

class User(UserBase):
    id: int
    is_active: bool
    is_email_verified: bool
    role: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    subscription: Optional[SubscriptionSchema] = None
    
class UserDashboardSummary(CamelCaseModel):
    email: EmailStr
    username: str | None
    user_id: int
    created_at: datetime
    is_email_verified: bool
    current_plan_name: str
    current_plan_price: float
    subscription_end_date: Optional[datetime]
    subscription_is_active: bool
    max_backtests_per_day: int
    concurrent_bots_limit: int
    allowed_timeframes: List[str]
    total_backtests_run_by_user: int
    successful_backtests_by_user: int
    total_live_bots_by_user: int
    active_live_bots_by_user: int
    latest_backtests: List[Any] = Field(default_factory=list)
    latest_live_bots: List[Any] = Field(default_factory=list)

class CheckoutRequest(CamelCaseModel):
    plan_id: int

class CheckoutResponse(CamelCaseModel):
    checkout_url: str

# ==============================================================================
# 2. 전략, 백테스팅, 자동매매 관련 스키마
# ==============================================================================

class IndicatorValue(CamelCaseModel):
    indicator_key: str
    outputs: List[str]
    values: Dict[str, Any]
    timeframe: str

class ComparisonLogic(CamelCaseModel):
    id: str
    type: Literal["comparison"]
    operand_a: Union[IndicatorValue, float]
    operator: str
    operand_b: Union[IndicatorValue, float]

class CrossoverLogic(CamelCaseModel):
    id: str
    type: Literal["crossover"]
    main_line: IndicatorValue
    signal_line: Union[IndicatorValue, float]
    cross_direction: Literal["above", "below"]

class StateLogic(CamelCaseModel):
    id: str
    type: Literal["state"]
    indicator: IndicatorValue
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    state_action: Literal["enter", "exit", "within"]

class TrendSignalLogic(CamelCaseModel):
    id: str
    type: Literal["trend_signal"]
    indicator: IndicatorValue
    signal: Literal["buy", "sell", "none"]

class ChannelLogic(CamelCaseModel):
    id: str
    type: Literal["channel"]
    indicator: IndicatorValue
    channel_zone: Literal["upper", "middle", "lower", "kumo"]
    action: Literal["enter", "exit", "within"]

class DivergenceLogic(CamelCaseModel):
    id: str
    type: Literal["divergence"]
    indicator: IndicatorValue
    divergence_type: Literal["bullish", "bearish", "hidden_bullish", "hidden_bearish"]
    
class PatternLogic(CamelCaseModel):
    id: str
    type: Literal["pattern"]
    pattern_key: str
    direction: Literal["bullish", "bearish", "any"]

LogicBlock = Union[ComparisonLogic, CrossoverLogic, StateLogic, TrendSignalLogic, ChannelLogic, DivergenceLogic, PatternLogic]

class PositionRules(CamelCaseModel):
    logic_operator: Literal["AND", "OR"] = "OR"
    blocks: List[LogicBlock] = Field(default_factory=list)

class TpslLogic(CamelCaseModel):
    take_profit_pct: Optional[float] = None
    stop_loss_pct: Optional[float] = None
    atr_stop_loss_multiplier: Optional[float] = None
    atr_take_profit_multiplier: Optional[float] = None
    atr_period: Optional[int] = None

class TargetCoin(CamelCaseModel):
    ticker: str
    allocation_pct: float = Field(100.0, ge=0, le=100)

class StrategyBase(CamelCaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: str | None = Field(None, max_length=500)
    is_public: bool = False

class StrategyCreate(StrategyBase):
    long_entry_rules: Optional[PositionRules] = None
    long_exit_rules: Optional[PositionRules] = None
    short_entry_rules: Optional[PositionRules] = None
    short_exit_rules: Optional[PositionRules] = None
    tpsl_logic: Optional[TpslLogic] = None
    target_coins: List[TargetCoin] = Field(default_factory=list)

class StrategyUpdate(CamelCaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None
    long_entry_rules: Optional[PositionRules] = None
    long_exit_rules: Optional[PositionRules] = None
    short_entry_rules: Optional[PositionRules] = None
    short_exit_rules: Optional[PositionRules] = None
    tpsl_logic: Optional[TpslLogic] = None
    target_coins: Optional[List[TargetCoin]] = None

class Strategy(CamelCaseModel):
    id: int
    author_id: int
    name: str
    description: Optional[str] = None
    is_public: bool
    long_entry_rules: Optional[PositionRules] = None
    long_exit_rules: Optional[PositionRules] = None
    short_entry_rules: Optional[PositionRules] = None
    short_exit_rules: Optional[PositionRules] = None
    tpsl_logic: Optional[TpslLogic] = None
    target_coins: List[TargetCoin]
    created_at: datetime
    updated_at: Optional[datetime] = None
    paid_feature_level: Literal["basic", "trader", "pro"] = "basic"

class ApiKeyCreate(CamelCaseModel):
    exchange: str = Field(..., min_length=2, max_length=50)
    api_key: str = Field(..., min_length=10)
    secret_key: str = Field(..., min_length=10)
    memo: Optional[str] = Field(None, max_length=255)
    is_active: bool = True

class ApiKeyResponse(CamelCaseModel):
    id: int
    user_id: int
    exchange: str
    memo: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

class BacktestCreate(CamelCaseModel):
    strategy_id: int
    ticker: str = Field(..., description="Trading pair ticker, e.g., 'BTC/USDT'")
    start_date: datetime = Field(..., description="Start date for backtest period (UTC)")
    end_date: datetime = Field(..., description="End date for backtest period (UTC)")
    initial_capital: float = Field(10000.0, ge=1.0, description="Initial capital for backtest")
    additional_parameters: Dict[str, Any] = Field(default_factory=dict)

class TradeLogEntry(CamelCaseModel):
    timestamp: datetime
    side: Literal["buy", "sell"]
    price: float
    quantity: float
    commission: Optional[float] = None
    pnl: Optional[float] = None
    current_balance: Optional[float] = None

class BacktestResultSummary(CamelCaseModel):
    total_return_pct: Optional[float] = None
    mdd_pct: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    win_rate_pct: Optional[float] = None
    pnl_curve_json: Optional[List[Dict[str, Any]]] = None
    trade_summary_json: Optional[Dict[str, Any]] = None
    executed_at: Optional[datetime] = None

class Backtest(CamelCaseModel):
    id: int
    user_id: int
    strategy_id: int
    status: str
    parameters: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[BacktestResultSummary] = None
    strategy: Optional[Strategy] = None

class LiveBotCreate(CamelCaseModel):
    strategy_id: int
    api_key_id: int
    initial_capital: Optional[float] = Field(None, ge=0.0, description="Initial capital for the live bot")
    ticker: str = Field(..., description="Trading pair for the bot")

class LiveBotUpdate(CamelCaseModel):
    status: Optional[Literal["active", "paused", "stopped"]] = None

class LiveBot(CamelCaseModel):
    id: int
    user_id: int
    strategy_id: int
    api_key_id: int
    status: str
    started_at: datetime
    stopped_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    initial_capital: Optional[float] = None
    strategy: Optional[Strategy] = None
    api_key: Optional[ApiKeyResponse] = None

# ==============================================================================
# 3. 커뮤니티 관련 스키마
# ==============================================================================

class CommunityPostCreate(CamelCaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    content: str = Field(..., min_length=10)
    backtest_id: Optional[int] = Field(None, description="Optional ID of backtest result to share")
    is_public: bool = True

class CommunityPostUpdate(CamelCaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    content: Optional[str] = Field(None, min_length=10)
    is_public: Optional[bool] = None

class CommunityPostResponse(CamelCaseModel):
    id: int
    author_id: int
    backtest_id: Optional[int] = None
    title: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    likes_count: int = 0
    comments_count: int = 0

class CommentCreate(CamelCaseModel):
    content: str = Field(..., min_length=1, max_length=500)

class CommentResponse(CamelCaseModel):
    id: int
    post_id: int
    author_id: int
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class LikeCreate(CamelCaseModel):
    pass

class LikeResponse(CamelCaseModel):
    user_id: int
    post_id: int
    status: bool = True