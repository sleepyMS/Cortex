from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import List, Dict, Any, Literal, Union, Optional
from .models import PlanType
import uuid

from .models import PlanType
from .sanitizers import sanitize_html


# --- 모든 모델의 기반이 될 CamelCaseModel 생성 ---
class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
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

    # 👇 [개선] 사용자 입력값 자동 살균
    @field_validator('username')
    @classmethod
    def sanitize_username(cls, value: Optional[str]) -> Optional[str]:
        if value:
            return sanitize_html(value)
        return value

class UserUpdatePassword(CamelCaseModel):
    old_password: str = Field(..., min_length=8, max_length=255)
    new_password: str = Field(..., min_length=8, max_length=255)

class UserAdminUpdate(CamelCaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_email_verified: Optional[bool] = None
    role: Optional[Literal["user", "admin", "Basic", "Trader", "Pro"]] = None
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

# --- [개선] DashboardSummary 내부용 스키마 정의 ---
class LatestSignupItem(CamelCaseModel):
    id: uuid.UUID
    email: EmailStr
    username: Optional[str]
    created_at: datetime

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
    latest_signups: List[LatestSignupItem] = Field(default_factory=list) # 👈 [개선] List[Any] 대신 명시적 타입 사용

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
    id: uuid.UUID
    name: PlanType 
    price: float
    features: PlanFeatureSchema

class SubscriptionSchema(CamelCaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    plan_id: uuid.UUID
    status: str
    current_period_end: Optional[datetime]
    plan: PlanSchema

class User(UserBase):
    id: uuid.UUID
    is_active: bool
    is_email_verified: bool
    role: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    subscription: Optional[SubscriptionSchema] = None
    
# --- UserDashboardSummary 내부용 스키마 정의 ---
class LatestBacktestItem(CamelCaseModel):
    id: uuid.UUID
    status: str
    created_at: datetime

class LatestLiveBotItem(CamelCaseModel):
    id: uuid.UUID
    status: str
    started_at: datetime

class UserDashboardSummary(CamelCaseModel):
    email: EmailStr
    username: str | None
    user_id: uuid.UUID
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
    latest_backtests: List[LatestBacktestItem] = Field(default_factory=list) 
    latest_live_bots: List[LatestLiveBotItem] = Field(default_factory=list)  

class CheckoutRequest(CamelCaseModel):
    plan_id: uuid.UUID

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

class BaseLogicBlock(CamelCaseModel):
    id: str
    type: str
    children: Optional[List['LogicBlock']] = Field(None, description="Nested AND conditions")
    logic_operator: Optional[Literal["AND", "OR"]] = Field(None, description="Operator for children blocks")


class ComparisonLogic(BaseLogicBlock):
    type: Literal["comparison"]
    operand_a: Union[IndicatorValue, float, int, None] = None
    operator: str
    operand_b: Union[IndicatorValue, float, int, None] = None

class CrossoverLogic(BaseLogicBlock):
    type: Literal["crossover"]
    main_line: Union[IndicatorValue, float, int, None] = None
    signal_line: Union[IndicatorValue, float, int, None] = None
    cross_direction: Literal["above", "below"]

class StateLogic(BaseLogicBlock):
    type: Literal["state"]
    indicator: Optional[IndicatorValue] = None
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    state_action: Literal["enter", "exit", "within"]

class TrendSignalLogic(BaseLogicBlock):
    type: Literal["trend_signal"]
    indicator: Optional[IndicatorValue] = None
    signal: Literal["buy", "sell", "none"]

class ChannelLogic(BaseLogicBlock):
    type: Literal["channel"]
    indicator: Optional[IndicatorValue] = None
    channel_zone: Literal["upper", "middle", "lower", "kumo"]
    action: Literal["enter", "exit", "within"]

class DivergenceLogic(BaseLogicBlock):
    type: Literal["divergence"]
    indicator: Optional[IndicatorValue] = None
    divergence_type: Literal["bullish", "bearish", "hidden_bullish", "hidden_bearish"]
    
class PatternLogic(BaseLogicBlock):
    type: Literal["pattern"]
    pattern_key: str
    direction: Literal["bullish", "bearish", "any"]

LogicBlock = Union[
    ComparisonLogic, CrossoverLogic, StateLogic, TrendSignalLogic, ChannelLogic, DivergenceLogic, PatternLogic
]
AnnotatedLogicBlock = Field(..., discriminator='type')

class PositionRules(CamelCaseModel):
    logic_operator: Literal["AND", "OR"] = "OR"
    blocks: List[LogicBlock] = Field(default_factory=list)

class TpslLogic(CamelCaseModel):
    take_profit_pct: Optional[float] = None
    stop_loss_pct: Optional[float] = None
    atr_stop_loss_multiplier: Optional[float] = None
    atr_take_profit_multiplier: Optional[float] = None
    atr_period: Optional[int] = None

    trailing_stop_enabled: bool = Field(False)
    trailing_stop_activation_pct: Optional[float] = Field(None, ge=0)
    trailing_stop_callback_pct: Optional[float] = Field(None, gt=0)

class TargetCoin(CamelCaseModel):
    ticker: str
    allocation_pct: float = Field(100.0, ge=0, le=100)

class StrategyBase(CamelCaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: str | None = Field(None, max_length=500)
    is_public: bool = False

    @field_validator('name', 'description')
    @classmethod
    def sanitize_fields(cls, value: Optional[str]) -> Optional[str]:
        if value:
            return sanitize_html(value)
        return value

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
    
    @field_validator('name', 'description')
    @classmethod
    def sanitize_fields(cls, value: Optional[str]) -> Optional[str]:
        if value:
            return sanitize_html(value)
        return value

class BacktestResultSummaryForCard(CamelCaseModel):
    total_return_pct: Optional[float] = None
    win_rate_pct: Optional[float] = None

class Strategy(CamelCaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
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
    paid_feature_level: PlanType = PlanType.BASIC
    latest_backtest_summary: Optional[BacktestResultSummaryForCard] = None

    # 👈 [개선 4] DB에서 target_coins가 NULL일 경우에도 항상 list를 반환하도록 보장
    @field_validator('target_coins', mode='before')
    @classmethod
    def validate_target_coins(cls, v):
        return v if v is not None else []
    
class ApiKeyCreate(CamelCaseModel):
    exchange: str = Field(..., min_length=2, max_length=50)
    api_key: str = Field(..., min_length=10)
    secret_key: str = Field(..., min_length=10)
    memo: Optional[str] = Field(None, max_length=255)
    is_active: bool = True

class ApiKeyResponse(CamelCaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    exchange: str
    memo: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

class ParameterOverride(CamelCaseModel):
    """단일 파라미터 오버라이드를 위한 스키마"""
    path: str
    value: Any

class BacktestExecutionParameters(CamelCaseModel):
    """백테스트 실행에 필요한 모든 상세 파라미터를 그룹화"""
    leverage: float = Field(1.0, gt=0, description="레버리지 배율")
    fee: float = Field(0.04, ge=0, description="거래 수수료 (%)")
    overrides: Optional[List[ParameterOverride]] = Field(None, description="전략의 기본값을 덮어쓰는 파라미터 목록")
    tpsl_logic: Optional[TpslLogic] = None

class BacktestCreate(CamelCaseModel):
    strategy_id: uuid.UUID
    start_date: datetime = Field(..., description="Start date for backtest period (UTC)")
    end_date: datetime = Field(..., description="End date for backtest period (UTC)")
    initial_capital: float = Field(10000.0, ge=1.0, description="Initial capital for backtest")
    parameters: BacktestExecutionParameters

class TradeLogEntry(CamelCaseModel):
    timestamp: datetime
    side: Literal["buy", "sell"]
    price: float
    quantity: float
    commission: Optional[float] = None
    pnl: Optional[float] = None
    current_balance: Optional[float] = None
    reason: Optional[str] = None

class BacktestResultSummary(CamelCaseModel):
    total_return_pct: Optional[float] = None
    mdd_pct: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    win_rate_pct: Optional[float] = None
    pnl_curve_json: Optional[List[Dict[str, Any]]] = None
    trade_summary_json: Optional[Dict[str, Any]] = None
    executed_at: Optional[datetime] = None

    profit_factor: Optional[float] = None
    sortino_ratio: Optional[float] = None
    cagr_pct: Optional[float] = None
    total_trades: Optional[int] = None
    winning_trades: Optional[int] = None
    losing_trades: Optional[int] = None

class Backtest(CamelCaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    strategy_id: uuid.UUID
    status: str
    parameters: Dict[str, Any]
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[BacktestResultSummary] = None
    strategy: Optional[Strategy] = None

class LiveBotCreate(CamelCaseModel):
    strategy_id: uuid.UUID
    api_key_id: uuid.UUID
    initial_capital: Optional[float] = Field(None, ge=0.0, description="Initial capital for the live bot")
    ticker: str = Field(..., description="Trading pair for the bot")

class LiveBotUpdate(CamelCaseModel):
    status: Optional[Literal["active", "paused", "stopped"]] = None

class LiveBot(CamelCaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    strategy_id: uuid.UUID
    api_key_id: uuid.UUID
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
    backtest_id: Optional[uuid.UUID] = Field(None)
    is_public: bool = True

    @field_validator('title', 'content')
    @classmethod
    def sanitize_fields(cls, value: str) -> str:
        return sanitize_html(value)

class CommunityPostUpdate(CamelCaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    content: Optional[str] = Field(None, min_length=10)
    is_public: Optional[bool] = None

    @field_validator('title', 'content')
    @classmethod
    def sanitize_fields(cls, value: Optional[str]) -> Optional[str]:
        if value:
            return sanitize_html(value)
        return value

class CommunityPostResponse(CamelCaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    backtest_id: Optional[uuid.UUID] = None
    title: str
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    likes_count: int = 0
    comments_count: int = 0

class CommentCreate(CamelCaseModel):
    content: str = Field(..., min_length=1, max_length=500)

    @field_validator('content')
    @classmethod
    def sanitize_fields(cls, value: str) -> str:
        return sanitize_html(value)

class CommentResponse(CamelCaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    author_id: uuid.UUID
    content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class LikeCreate(CamelCaseModel):
    pass

class LikeResponse(CamelCaseModel):
    user_id: uuid.UUID
    post_id: uuid.UUID
    status: bool = True

# ==============================================================================
# 4. 시장 데이터 및 신호 계산 관련 스키마
# ==============================================================================

class OHLCVData(CamelCaseModel):
    """단일 OHLCV 캔들스틱 데이터를 위한 스키마"""
    time: int  
    open: float
    high: float
    low: float
    close: float
    volume: float

class IndicatorConfig(CamelCaseModel):
    """단일 지표 설정 정보를 위한 스키마"""
    indicator_key: str  # 예: "SMA"
    values: Dict[str, Any]  # 예: {"period": 20}
    outputs: List[str] # 예: ["sma"]

class IndicatorCalculationRequest(CamelCaseModel):
    """지표 계산 요청을 위한 스키마"""
    ticker: str
    timeframe: str
    indicators: List[IndicatorConfig]

class IndicatorDataPoint(CamelCaseModel):
    """계산된 지표의 단일 데이터 포인트"""
    time: int
    value: float | None

class IndicatorCalculationResponse(CamelCaseModel):
    """지표 계산 결과 응답 스키마"""
    # Key: "SMA_20", Value: [IndicatorDataPoint, ...]
    results: Dict[str, List[IndicatorDataPoint]]

class SignalDataPoint(CamelCaseModel):
    """단일 신호 데이터 포인트"""
    time: int  # UTCTimestamp
    signal_type: Literal["long_entry", "long_exit", "short_entry", "short_exit"]

class SignalCalculationRequest(CamelCaseModel):
    """실시간 신호 계산 요청을 위한 스키마"""
    ticker: str = Field("BTC/USDT", description="대상 티커")
    timeframe: str = Field("1h", description="대상 타임프레임")
    # 사용자가 편집 중인 규칙을 그대로 받습니다.
    long_entry_rules: Optional[PositionRules] = None
    long_exit_rules: Optional[PositionRules] = None
    short_entry_rules: Optional[PositionRules] = None
    short_exit_rules: Optional[PositionRules] = None
    
class SignalCalculationResponse(CamelCaseModel):
    """신호 계산 결과 응답 스키마"""
    signals: List[SignalDataPoint] = Field(default_factory=list)