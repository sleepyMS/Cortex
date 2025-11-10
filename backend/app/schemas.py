from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import List, Dict, Any, Literal, Union, Optional
from .models import PlanType, BacktestStatus, ProductType, InventoryType, OrderStatus, OptimizationStatus, OptimizationType
import uuid
import enum

from .sanitizers import sanitize_html


# --- 모든 모델의 기반이 될 CamelCaseModel 생성 ---
class CamelCaseModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )

# ==============================================================================
# 0. 크레딧 시스템 관련 스키마 
# ==============================================================================

class CreditBalanceBreakdownEvent(CamelCaseModel):
    """만료 기간이 있는 이벤트성 크레딧 정보"""
    amount: int
    expires_at: datetime

class CreditBalanceBreakdown(CamelCaseModel):
    """종류별 크레딧 상세 내역"""
    purchased: int = 0
    expiring_weekly: int = 0
    event: List[CreditBalanceBreakdownEvent] = Field(default_factory=list)

class CreditBalanceSummary(CamelCaseModel):
    """사용자의 크레딧 잔액 요약 정보 응답 스키마"""
    total_balance: int
    cash_credit_balance: int
    breakdown: CreditBalanceBreakdown

class CreditTransactionLedgerDetail(CamelCaseModel):
    """거래 내역에 포함될 원장 출처 정보"""
    source_type: str
    amount_deducted: int

class CreditTransactionResponse(CamelCaseModel):
    """크레딧 거래 내역 응답 스키마"""
    id: uuid.UUID
    user_id: uuid.UUID 
    total_amount_deducted: int
    discount_pct: float
    related_entity_type: Optional[str] = None
    created_at: datetime
    details: List[CreditTransactionLedgerDetail]

class PaginatedMeta(CamelCaseModel):
    total_items: int
    item_count: int
    items_per_page: int
    total_pages: int
    current_page: int

class PaginatedCreditTransactions(CamelCaseModel):
    items: List[CreditTransactionResponse] # 기존 스키마 재활용
    meta: PaginatedMeta

class CostEstimationRequest(CamelCaseModel):
    """비용 견적 요청 스키마"""
    backtest_duration_years: float = Field(..., ge=0)
    min_timeframe_minutes: int = Field(..., ge=1)
    trials: int = Field(1, ge=1)

class CostEstimationResponse(CamelCaseModel):
    """비용 견적 응답 스키마"""
    original_cost: int
    discount_pct: float
    final_cost: int
    user_balance: int
    is_sufficient: bool

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

class UserProfileSocialLinks(CamelCaseModel):
    twitter: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None

class UserProfileResponse(CamelCaseModel):
    """프로필 관리 탭에서 사용할 데이터 스키마"""
    username: Optional[str]
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    social_links: Optional[UserProfileSocialLinks] = None
    featured_strategy_id: Optional[uuid.UUID] = None

class UserProfileSocialLinksUpdate(CamelCaseModel):
    twitter: Optional[str] = ""
    github: Optional[str] = ""
    website: Optional[str] = ""

class UserProfileUpdate(CamelCaseModel):
    """프로필 수정을 위한 입력 스키마"""
    username: str = Field(..., min_length=3)
    bio: Optional[str] = Field(None, max_length=200)
    social_links: Optional[UserProfileSocialLinksUpdate] = None
    featured_strategy_id: Optional[uuid.UUID] = None

class UserUpdateProfile(CamelCaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=100)

    # 사용자 입력값 자동 살균
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
    role: Optional[Literal["user", "admin"]] = None
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

# --- DashboardSummary 내부용 스키마 정의 ---
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
    latest_signups: List[LatestSignupItem] = Field(default_factory=list) 

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
    credit_surcharge_multiplier: float 
    monthly_credit_reward: int

class SubscriptionSchema(CamelCaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    plan_id: uuid.UUID
    status: str
    current_period_end: Optional[datetime]
    plan: PlanSchema

class UserSignupResponse(CamelCaseModel):
    """회원가입 성공 시 반환되는 최소한의 사용자 정보"""
    id: uuid.UUID
    email: EmailStr
    username: Optional[str] = None
    is_active: bool
    is_email_verified: bool
    role: str
    created_at: datetime
    
class User(CamelCaseModel):
    id: uuid.UUID
    email: EmailStr
    username: Optional[str] = None
    is_active: bool
    is_email_verified: bool
    role: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    subscription: Optional[SubscriptionSchema] = None
    credit_balance: Optional[CreditBalanceSummary] = None

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
    """전략 생성/수정 시 사용자로부터 입력을 받는 필드를 정의"""
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

class StrategyCloneWithOptimization(CamelCaseModel):
    """최적화 결과를 기반으로 전략 복제 요청 시 사용하는 스키마"""
    optimization_id: uuid.UUID
    trial_id: int
    new_name: Optional[str] = Field(None, min_length=3, max_length=100)

class StrategyForSnapshot(CamelCaseModel):
    id: uuid.UUID
    author_id: uuid.UUID
    name: str
    description: Optional[str] = None
    
    # Dict[str, Any] 대신 정확한 Pydantic 모델 타입으로 지정합니다.
    long_entry_rules: Optional[PositionRules] = None
    long_exit_rules: Optional[PositionRules] = None
    short_entry_rules: Optional[PositionRules] = None
    short_exit_rules: Optional[PositionRules] = None
    tpsl_logic: Optional[TpslLogic] = None
    
    target_coins: List[TargetCoin] # TargetCoin도 명확한 스키마로 지정
    is_public: bool
    paid_feature_level: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

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

class MarketplaceListing(CamelCaseModel):
    """전략의 마켓플레이스 등록 정보를 위한 스키마"""
    product_id: uuid.UUID
    price: float
    category: str
    position_type: Literal['LongOnly', 'ShortOnly', 'LongShort']
    representative_backtest_id: Optional[uuid.UUID] = None

class StrategySummary(CamelCaseModel):
    """다른 스키마에 중첩될 때 사용될 가벼운 전략 정보"""
    id: uuid.UUID
    name: str

class BacktestResultForHistory(CamelCaseModel):
    total_return_pct: float
    win_rate_pct: float
    mdd_pct: float

class BacktestHistoryItem(CamelCaseModel):
    id: uuid.UUID
    created_at: datetime
    result: Optional[BacktestResultForHistory] = None

class BacktestResultSummaryForCard(CamelCaseModel):
    backtest_id: Optional[uuid.UUID] = None 
    total_return_pct: Optional[float] = None
    win_rate_pct: Optional[float] = None
    mdd_pct: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    profit_factor: Optional[float] = None
    sortino_ratio: Optional[float] = None
    calmar_ratio: Optional[float] = None
    avg_profit_loss_ratio: Optional[float] = None
    ulcer_index: Optional[float] = None
    longest_flat_days: Optional[int] = None
    avg_holding_period_days: Optional[float] = None
    k_ratio: Optional[float] = None

# --- [역할 2] API 응답을 위한 베이스 스키마 ---
class StrategyResponseBase(CamelCaseModel):
    """API 응답용 스키마들이 공통으로 가지는 필드를 정의"""
    id: uuid.UUID
    author_id: uuid.UUID
    name: str
    description: Optional[str] = None
    is_public: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

class StrategyInList(StrategyResponseBase):
    """'목록' 조회를 위한 가벼운 응답 스키마"""
    latest_backtest_summary: Optional[BacktestResultSummaryForCard] = None
    marketplace_listing: Optional[MarketplaceListing] = None

class Strategy(StrategyResponseBase):
    """'상세' 조회를 위한 완전한 응답 스키마"""
    long_entry_rules: Optional[PositionRules] = None
    long_exit_rules: Optional[PositionRules] = None
    short_entry_rules: Optional[PositionRules] = None
    short_exit_rules: Optional[PositionRules] = None
    tpsl_logic: Optional[TpslLogic] = None
    target_coins: List[TargetCoin] = Field(default_factory=list)
    paid_feature_level: PlanType = PlanType.BASIC
    latest_backtest_summary: Optional[BacktestResultSummaryForCard] = None
    marketplace_listing: Optional[MarketplaceListing] = None
    backtests: List[BacktestHistoryItem] = Field(default_factory=list)

class BacktestInCreateResponse(CamelCaseModel):
    """
    POST /backtests/ 요청 성공 시 반환되는 응답 스키마.
    요청 시점의 기본 정보만 포함합니다.
    """
    id: uuid.UUID
    userId: uuid.UUID = Field(..., alias="user_id")
    strategyId: uuid.UUID = Field(..., alias="strategy_id")
    status: BacktestStatus
    createdAt: datetime = Field(..., alias="created_at")
    completedAt: Optional[datetime] = Field(None, alias="completed_at")

    class Config:
        from_attributes = True
        alias_generator = to_camel
        populate_by_name = True
    
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
    api_key_preview: Optional[str] = None
    memo: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

class ParameterOverride(CamelCaseModel):
    """단일 파라미터 오버라이드를 위한 스키마"""
    path: str
    value: Any

class BacktestInList(CamelCaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    strategy_id: uuid.UUID
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[BacktestResultSummaryForCard] = None
    strategy: Optional[StrategySummary] = None
    
class BacktestExecutionParameters(CamelCaseModel):
    """백테스트 실행에 필요한 모든 상세 파라미터를 그룹화"""
    leverage: float = Field(1.0, gt=0, description="레버리지 배율")
    fee: float = Field(0.05, ge=0, description="거래 수수료 (%)")
    slippage: float = Field(0.01, ge=0, description="거래 슬리피지 (%)")
    overrides: Optional[List[ParameterOverride]] = Field(None, description="전략의 기본값을 덮어쓰는 파라미터 목록")
    tpsl_logic: Optional[TpslLogic] = None

class BacktestCreate(CamelCaseModel):
    strategy_id: uuid.UUID
    start_date: datetime = Field(..., description="Start date for backtest period (UTC)")
    end_date: datetime = Field(..., description="End date for backtest period (UTC)")
    initial_capital: float = Field(10000.0, ge=1.0, description="Initial capital for backtest")
    parameters: BacktestExecutionParameters

class BacktestCostEstimationRequest(CamelCaseModel):
    """비용 견적 요청을 위한 전용 스키마"""
    strategy_id: uuid.UUID
    start_date: datetime
    end_date: datetime

class TradeLogEntry(CamelCaseModel):
    timestamp: datetime
    side: Literal["LONG_ENTRY", "LONG_EXIT", "SHORT_ENTRY", "SHORT_EXIT"]
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
    drawdown_curve_json: Optional[List[Dict[str, Any]]] = None
    trade_summary_json: Optional[Dict[str, Any]] = None
    executed_at: Optional[datetime] = None

    profit_factor: Optional[float] = None
    sortino_ratio: Optional[float] = None
    cagr_pct: Optional[float] = None
    total_trades: Optional[int] = None
    winning_trades: Optional[int] = None
    losing_trades: Optional[int] = None
    
    calmar_ratio: Optional[float] = None
    avg_profit_loss_ratio: Optional[float] = None
    ulcer_index: Optional[float] = None
    longest_flat_days: Optional[int] = None
    avg_holding_period_days: Optional[float] = None
    k_ratio: Optional[float] = None

    backtest_score: Optional[float] = None
    score_factors: Optional[Any] = None

class BacktestParametersPayload(CamelCaseModel):
    start_date: datetime
    end_date: datetime
    initial_capital: float
    # BacktestCreate에서 받았던 중첩된 parameters 객체를 그대로 포함합니다.
    parameters: BacktestExecutionParameters

class Backtest(BacktestInList):
    parameters: BacktestParametersPayload  
    strategy_snapshot: Optional[Dict[str, Any]] = None
    strategy: Optional[Strategy] = None 
    result: Optional[BacktestResultSummary] = None 

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
    strategy: Optional[StrategySummary] = None
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
    ticker: str = Field("BTCUSDT", description="대상 티커")
    timeframe: str = Field("1h", description="대상 타임프레임")
    # 사용자가 편집 중인 규칙을 그대로 받습니다.
    long_entry_rules: Optional[PositionRules] = None
    long_exit_rules: Optional[PositionRules] = None
    short_entry_rules: Optional[PositionRules] = None
    short_exit_rules: Optional[PositionRules] = None
    
class SignalCalculationResponse(CamelCaseModel):
    """신호 계산 결과 응답 스키마"""
    signals: List[SignalDataPoint] = Field(default_factory=list)

# ==============================================================================
# 5. 마켓플레이스 및 인벤토리 관련 스키마
# ==============================================================================

# --- API 요청(Request) 스키마 ---

class ProductFilters(CamelCaseModel):
    """상품 목록 조회를 위한 필터 및 페이지네이션 파라미터"""
    page: int = Field(1, ge=1)
    limit: int = Field(12, ge=1, le=100)
    product_type: ProductType
    sort_by: Optional[str] = None
    search_term: Optional[str] = None
    categories: Optional[List[str]] = Field(None, query=[])
    position_types: Optional[List[str]] = Field(None, query=[])

class OrderItemCreate(CamelCaseModel):
    """주문 생성 시 포함될 개별 아이템"""
    product_id: uuid.UUID
    quantity: int = Field(1, ge=1)

class OrderCreate(CamelCaseModel):
    """주문 생성을 위한 요청 본문"""
    items: List[OrderItemCreate] = Field(..., min_length=1)

class StrategyListPayload(CamelCaseModel):
    """전략을 마켓플레이스에 등록하기 위한 요청 본문"""
    strategy_id: uuid.UUID
    price: float = Field(..., ge=0)
    category: str
    position_type: Literal['LongOnly', 'ShortOnly', 'LongShort']
    description: Optional[str] = None
    representative_backtest_id: Optional[uuid.UUID] = None


# --- API 응답(Response) 스키마 ---

class ProductAuthor(CamelCaseModel):
    """상품 판매자 정보"""
    username: Optional[str]

class BaseProduct(CamelCaseModel):
    """모든 상품 목록에 공통적으로 포함될 기본 정보"""
    id: uuid.UUID
    name: str
    price: float
    product_type: ProductType
    inventory_type: InventoryType
    product_metadata: Dict[str, Any] 
    author: Optional[ProductAuthor] = None

class StrategyProduct(BaseProduct):
    """전략 상품 목록에 표시될 정보"""
    latest_backtest_summary: Optional[BacktestResultSummaryForCard] = None

class ShopItemProduct(BaseProduct):
    """상점 아이템 목록에 표시될 정보"""
    display_properties: Dict[str, Any]

class StrategyProductDetailPublic(StrategyProduct):
    """
    비구매자에게 보여줄 공개용 상세 정보.
    전략 규칙 등 민감한 정보는 모두 제외됩니다.
    """
    description: Optional[str] = None
    representative_backtest: Optional[Backtest] = None # 대표 백테스트 결과는 공개
    
    # long_entry_rules 등 민감 정보는 여기에 포함시키지 않습니다.

class StrategyProductDetailOwned(StrategyProductDetailPublic):
    """
    구매한 사용자에게만 보여줄 소유자용 상세 정보.
    공개용 정보를 상속받고, 추가로 모든 전략 규칙을 포함합니다.
    """
    long_entry_rules: Optional[PositionRules] = None
    long_exit_rules: Optional[PositionRules] = None
    short_entry_rules: Optional[PositionRules] = None
    short_exit_rules: Optional[PositionRules] = None
    tpsl_logic: Optional[TpslLogic] = None
    target_coins: List[TargetCoin] = Field(default_factory=list)

class ShopItemProductDetail(ShopItemProduct):
    """
    상점 아이템의 모든 상세 정보를 포함하는 스키마.
    """    
    # display_properties는 이미 ShopItemProduct에 포함되어 있으므로
    # 추가적으로 필요한 상세 정보가 있다면 여기에 필드를 정의합니다.
    # 예: "how_to_use": "최적화 페이지에서 쿠폰을 선택하여 사용하세요."
    usage_guide: Optional[str] = None

class PaginatedProductsResponse(CamelCaseModel):
    """페이지네이션된 상품 목록 응답"""
    products: List[Union[StrategyProduct, ShopItemProduct]]
    meta: Dict[str, int]

class UserPurchasedStrategyResponse(CamelCaseModel):
    """구매한 전략 정보 응답"""
    purchase_id: uuid.UUID
    strategy_id: uuid.UUID
    name: str
    author_username: str
    price_paid: float
    purchased_at: datetime

class UserInventoryItemResponse(CamelCaseModel):
    """[개선] 인벤토리 아이템 정보 응답 (수량 기반)"""
    product_id: uuid.UUID
    name: str
    description: str
    display_properties: Dict[str, Any]
    quantity: int 
    purchased_at: datetime # 최초 구매일 또는 마지막 구매일 (정책에 따라 결정)

class OrderItemResponse(CamelCaseModel):
    """주문 내역에 포함된 아이템 정보"""
    quantity: int
    price_at_purchase: float
    product: BaseProduct

class PaymentConfirmPayload(CamelCaseModel):
    """결제 승인 요청을 위한 스키마"""
    payment_key: str
    order_id: str
    amount: int

class OrderResponse(CamelCaseModel):
    """주문 상세 정보 응답"""
    id: uuid.UUID
    buyer_id: uuid.UUID
    total_amount: float
    status: OrderStatus
    created_at: datetime
    items: List[OrderItemResponse]

class OrderCreateResponse(CamelCaseModel):
    """주문 생성(결제 요청) 성공 시 프론트엔드에 반환할 정보"""
    order_id: str
    order_name: str
    amount: int
    customer_name: str
    customer_email: EmailStr
    # success_url, fail_url 등은 프론트엔드에서 동적으로 생성 가능

class BillingKeyRegistrationRequest(CamelCaseModel):
    plan_id: uuid.UUID = Field(..., description="구독하려는 플랜의 ID")
    auth_key: str = Field(..., description="Toss Payments 프론트엔드 SDK로부터 받은 임시 인증 키")


# ==============================================================================
# 8. 최적화(Optimization) 관련 스키마
# ==============================================================================

class ParameterRange(CamelCaseModel):
    """최적화할 파라미터의 탐색 범위"""
    path: str = Field(..., description="파라미터의 JSON 경로 (e.g., long_entry_rules.0.rsi.period)")
    min: float
    max: float
    step: float

class OptimizationConstraint(CamelCaseModel):
    """최적화 제약 조건 (Pruning 기준)"""
    type: Literal["mdd", "min_trades", "win_rate", "profit_factor"]
    operator: Literal[">=", "<="]
    value: float

class WFOSettings(CamelCaseModel):
    """워크포워드 최적화 전용 설정"""
    folds: int = Field(..., ge=2, description="전체 기간을 나눌 구간 수")
    trials_per_fold: int = Field(..., ge=1, description="각 구간별 시도 횟수")
    window_type: Literal["expanding", "sliding"] = Field("expanding", description="윈도우 방식")

class GeneralSettings(CamelCaseModel):
    """일반 최적화 전용 설정"""
    trials: int = Field(..., ge=1, description="총 시도 횟수")

class OptimizationConfig(CamelCaseModel):
    """
    최적화 실행 설정 스냅샷.
    DB의 'OptimizationJob.config' JSONB 컬럼에 이 구조 그대로 저장됩니다.
    """
    objective: str = Field(..., description="1순위 최적화 목표 (e.g., 'cortex_score')")
    start_date: datetime
    end_date: datetime
    initial_capital: float
    
    # 실행 공통 파라미터 (레버리지, 수수료 등)
    common_parameters: BacktestExecutionParameters 
    
    # 탐색 공간 및 제약 조건
    parameter_ranges: List[ParameterRange]
    constraints: List[OptimizationConstraint] = Field(default_factory=list)
    
    # 타입별 세부 설정 (둘 중 하나는 반드시 존재해야 함)
    general_settings: Optional[GeneralSettings] = None
    wfo_settings: Optional[WFOSettings] = None

    @field_validator('wfo_settings')
    @classmethod
    def validate_wfo_settings(cls, v, values):
        # optimization_type이 'wfo'일 때 필수 체크 로직 등을 추가할 수 있습니다.
        return v

class OptimizationCostEstimationRequest(CamelCaseModel):
    """
    최적화 비용 견적 요청을 위한 스키마.
    프론트엔드에서 실시간으로 예상 크레딧을 계산하기 위해 보냅니다.
    """
    strategy_id: uuid.UUID
    start_date: datetime
    end_date: datetime
    # 총 시도 횟수는 프론트엔드에서 이미 계산해서 보내줍니다.
    # (일반: general_trials, WFO: wfo_folds * wfo_trials_per_fold)
    trials: int = Field(..., ge=1, description="총 시도 횟수")
    
class OptimizationCreate(CamelCaseModel):
    """
    POST /optimizations 요청 바디 스키마
    """
    strategy_id: uuid.UUID
    optimization_type: OptimizationType
    
    # 설정 정보 평탄화(Flatten) 수신 후 내부적으로 Config 객체 조립
    start_date: datetime
    end_date: datetime
    initial_capital: float
    
    objective: str
    constraints: List[OptimizationConstraint] = []
    parameter_ranges: List[ParameterRange]
    common_parameters: BacktestExecutionParameters
    
    # 탭에 따라 선택적으로 전달되는 설정들
    general_settings: Optional[GeneralSettings] = None
    wfo_settings: Optional[WFOSettings] = None

class TrialMetric(CamelCaseModel):
    """단일 시도의 핵심 성과 지표 (가벼운 버전)"""
    total_return_pct: float
    mdd_pct: float
    win_rate_pct: float
    backtest_score: float
    # 필요에 따라 추가 (sharpe_ratio 등)

class TrialData(CamelCaseModel):
    """
    단일 최적화 시도(Trial)의 상세 정보.
    DB의 'OptimizationTrial' 테이블과 매핑됩니다.
    """
    trial_id: int
    job_id: uuid.UUID
    params: Dict[str, Any] # 사용된 파라미터 조합
    metrics: Optional[TrialMetric] = None # Pruned/Failed 시 없을 수 있음
    state: Literal["COMPLETE", "PRUNED", "FAIL"]
    created_at: datetime

class PaginatedTrialsResponse(CamelCaseModel):
    """페이지네이션된 Trial 목록 응답"""
    items: List[TrialData]
    total: int         # 전체 Trial 개수
    page: int          # 현재 페이지
    size: int          # 페이지 당 개수
    pages: int         # 전체 페이지 수
    
class OptimizationProgress(CamelCaseModel):
    current_step: int = 0
    total_steps: int = 0
    message: Optional[str] = None

class OptimizationJobSummary(CamelCaseModel):
    """목록 조회용 가벼운 최적화 작업 정보"""
    id: uuid.UUID
    status: OptimizationStatus
    type: OptimizationType
    strategy: StrategySummary # 기존 StrategySummary 재사용
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    # DB의 'result_summary' 컬럼 값을 이 필드로 가져오겠다고 선언
    best_result_summary: Optional[TrialMetric] = Field(None, validation_alias="result_summary")

    # 가져온 result_summary(전체 JSON)에서 필요한 best_metrics만 추출
    @field_validator('best_result_summary', mode='before')
    @classmethod
    def extract_best_metrics(cls, v: Any) -> Any:
        # v는 DB에서 가져온 result_summary 딕셔너리 전체입니다.
        if isinstance(v, dict):
            return v.get("best_metrics")
        return None

class WFOFoldResult(CamelCaseModel):
    """WFO 각 폴드별 결과 스키마"""
    fold_index: int
    is_start_date: str = Field(alias="is_start")
    is_end_date: str = Field(alias="is_end")
    oos_start_date: str = Field(alias="oos_start")
    oos_end_date: str = Field(alias="oos_end")
    best_params: Dict[str, Any]
    in_sample_metrics: BacktestResultSummary
    out_of_sample_metrics: BacktestResultSummary

class WFOResult(CamelCaseModel):
    """WFO 전체 결과 스키마"""
    folds: List[WFOFoldResult]
    oos_curve_json: List[Dict[str, Any]] = Field(alias="oos_curve") # oos_curve -> oosCurveJson 매핑
    final_equity: float
    total_return_pct: float

class OptimizationJobDetail(OptimizationJobSummary):
    """
    상세 조회용 완전한 최적화 작업 정보.
    프론트엔드의 'OptimizationJobDetail' 타입과 일치합니다.
    """
    config: OptimizationConfig
    progress: Optional[OptimizationProgress] = None
    
    # 최적 결과 (전체 시도 중 1위)
    best_trial: Optional[TrialData] = None
    
    # WFO 전용 결과 데이터 (JSONB 내용을 그대로 전달)
    wfo_result: Optional[WFOResult] = None
    
    # Tier 2 분석 데이터
    parameter_importance: Optional[List[Dict[str, Any]]] = None
    
    # 모든 시도 데이터 (대용량 주의, 필요시 페이지네이션 적용)
    trials: List[TrialData] = Field(default_factory=list)
    
    used_credits: Optional[int] = None