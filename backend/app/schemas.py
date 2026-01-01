# file: backend/app/schemas.py

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, model_validator
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

class AIModelCostEstimationRequest(CamelCaseModel):
    """AI 모델 학습 비용 견적 요청"""
    training_type: Literal["new", "retrain"] = Field("new")
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    timeframe: str = "1h"
    epochs: int = 100
    model_id: Optional[str] = None
    hidden_size: int = 64
    num_layers: int = 2

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
    payment_method_details: Optional[str]
    payment_gateway_customer_key: Optional[str] = None
    next_plan_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: Optional[datetime]
    plan: PlanSchema
    next_plan: Optional[PlanSchema] = None

# --- 구독 관련 Request 스키마 ---
class BillingKeyRegistrationRequest(CamelCaseModel):
    """구독 카드 등록 요청"""
    plan_id: uuid.UUID = Field(..., description="구독하려는 플랜의 ID")
    auth_key: str = Field(..., description="Toss Payments 프론트엔드 SDK로부터 받은 임시 인증 키")

class SubscriptionChangeRequest(CamelCaseModel):
    """구독 플랜 변경 요청"""
    plan_id: uuid.UUID = Field(..., description="변경하려는 플랜의 ID")

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
    offset: int = 0

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
    cross_direction: Literal["above", "below"] = "above"

    @field_validator('cross_direction', mode='before')
    @classmethod
    def set_default_if_empty(cls, v):
        if not v or v == "":
            return "above"
        return v

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

class AISignalLogic(BaseLogicBlock):
    """
    AI 모델 기반 신호 로직 블록.
    
    ONNX 모델을 사용하여 BUY/HOLD/SELL 예측을 수행합니다.
    
    evaluation_mode:
    - "threshold": signal_type의 확률이 min_confidence 이상일 때 True
    - "highest": signal_type이 가장 높은 확률을 가질 때 True (argmax)
    - "direction": 회귀 모델용 - 예측값 부호로 판단 (>0 BUY, <0 SELL)
    - "confidence": 회귀 모델용 - 95% 신뢰구간 기반 (하한>0 BUY, 상한<0 SELL)
    """
    type: Literal["ai_signal"]
    model_id: str  # AI 모델 UUID
    
    # Task type for determining which fields to use
    task_type: Optional[Literal["classification", "regression"]] = "classification"
    
    # Classification 전용 (signalType이 필요)
    signal_type: Optional[Literal["buy", "sell", "hold"]] = None  # 분류 모델용
    
    evaluation_mode: Literal["threshold", "highest", "direction", "confidence"] = "highest"
    min_confidence: Optional[float] = Field(None, ge=0.0, le=1.0)  # threshold 모드용 최소 신뢰도 (classification)
    
    # Regression 전용 파라미터
    direction_signal: Optional[Literal["positive", "negative"]] = None  # direction/confidence 모드용
    
    # Regression threshold 모드용 파라미터
    threshold: Optional[float] = Field(None, description="예측값 임계값 (예: 2.0 → 2% 이상)")
    condition_operator: Optional[Literal[">", "<", ">=", "<="]] = Field(
        None, description="임계값 조건 연산자"
    )
    
    # Regression MC Dropout Uncertainty 파라미터
    use_uncertainty: bool = Field(False, description="MC Dropout 불확실성 추정 사용 여부")
    mc_dropout_samples: int = Field(10, ge=5, le=50, description="MC Dropout 샘플 수")
    uncertainty_threshold: Optional[float] = Field(
        None, ge=0.0, 
        description="최대 허용 불확실성 - 이 값 이상이면 신호 무시"
    )
    
    # 프론트엔드 표시용 (읽기 전용)
    model_name: Optional[str] = None
    training_end_date: Optional[str] = None  # 미래 참조 경고용
    
    @model_validator(mode='after')
    def validate_task_mode_compatibility(self) -> 'AISignalLogic':
        """
        task_type과 evaluation_mode의 호환성을 검증합니다.
        
        - Classification: 'highest', 'threshold' 모드만 사용 가능, signal_type 필수
        - Regression: 'direction', 'confidence', 'threshold' 모드 사용 가능
        """
        task = self.task_type or "classification"
        mode = self.evaluation_mode
        
        if task == "classification":
            # 분류 모델 검증
            if mode in ["direction", "confidence"]:
                raise ValueError(
                    f"evaluation_mode '{mode}'는 회귀(regression) 모델에서만 사용 가능합니다. "
                    f"분류 모델에서는 'highest' 또는 'threshold' 모드를 사용하세요."
                )
            if not self.signal_type:
                raise ValueError(
                    "분류(classification) 모델에서는 signal_type ('buy', 'sell', 'hold')이 필수입니다."
                )
        
        elif task == "regression":
            # 회귀 모델 검증
            if mode == "highest":
                raise ValueError(
                    "evaluation_mode 'highest'는 분류(classification) 모델에서만 사용 가능합니다. "
                    "회귀 모델에서는 'direction', 'confidence', 또는 'threshold' 모드를 사용하세요."
                )
            if mode in ["direction", "confidence"] and not self.direction_signal:
                raise ValueError(
                    f"회귀 모델의 '{mode}' 모드에서는 direction_signal ('positive', 'negative')이 필수입니다."
                )
            # Note: threshold mode uses defaults if threshold/condition_operator not provided
            # threshold defaults to 0.0, condition_operator defaults to '>'
        
        return self

LogicBlock = Union[
    ComparisonLogic, CrossoverLogic, StateLogic, TrendSignalLogic, 
    ChannelLogic, DivergenceLogic, PatternLogic, AISignalLogic
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
    backtest_score: Optional[float] = None
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

class StrategySummary(StrategyResponseBase):
    """전략의 기본 공개 요약 정보 (민감 정보 제외)"""
    latest_backtest_summary: Optional[BacktestResultSummaryForCard] = None
    marketplace_listing: Optional[MarketplaceListing] = None
    target_coins: List[TargetCoin] = Field(default_factory=list)

class StrategyInList(StrategySummary):
    """'목록' 조회를 위한 응답 스키마 (소유자/구매자용, 규칙 포함)"""
    long_entry_rules: Optional[PositionRules] = None
    long_exit_rules: Optional[PositionRules] = None
    short_entry_rules: Optional[PositionRules] = None
    short_exit_rules: Optional[PositionRules] = None
    tpsl_logic: Optional[TpslLogic] = None
    backtests: List[BacktestHistoryItem] = Field(default_factory=list)

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

class StrategyForBot(StrategyResponseBase):
    """봇에서 사용할 전략 스키마 (backtests 제외)"""
    long_entry_rules: Optional[PositionRules] = None
    long_exit_rules: Optional[PositionRules] = None
    short_entry_rules: Optional[PositionRules] = None
    short_exit_rules: Optional[PositionRules] = None
    tpsl_logic: Optional[TpslLogic] = None
    target_coins: List[TargetCoin] = Field(default_factory=list)
    paid_feature_level: PlanType = PlanType.BASIC
    latest_backtest_summary: Optional[BacktestResultSummaryForCard] = None
    marketplace_listing: Optional[MarketplaceListing] = None

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

    
class BacktestExecutionParameters(CamelCaseModel):
    """백테스트 실행에 필요한 모든 상세 파라미터를 그룹화"""
    leverage: float = Field(1.0, gt=0, description="레버리지 배율")
    fee: float = Field(0.05, ge=0, description="거래 수수료 (%)")
    slippage: float = Field(0.01, ge=0, description="거래 슬리피지 (%)")
    overrides: Optional[List[ParameterOverride]] = Field(None, description="전략의 기본값을 덮어쓰는 파라미터 목록")
    tpsl_logic: Optional[TpslLogic] = None

class BacktestParametersPayload(CamelCaseModel):
    start_date: datetime
    end_date: datetime
    initial_capital: float
    parameters: BacktestExecutionParameters

class BacktestInList(CamelCaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    strategy_id: uuid.UUID
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[BacktestResultSummaryForCard] = None
    strategy: Optional[StrategySummary] = None
    parameters: Optional[BacktestParametersPayload] = None 

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


# --- [성능 최적화] 차트 데이터 분리를 위한 새 스키마 ---

class BacktestResultCore(CamelCaseModel):
    """BacktestResultSummary에서 무거운 차트 데이터를 제외한 핵심 지표만 포함"""
    total_return_pct: Optional[float] = None
    mdd_pct: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    win_rate_pct: Optional[float] = None
    # pnl_curve_json 제외
    # drawdown_curve_json 제외
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


class BacktestChartData(CamelCaseModel):
    """차트 렌더링에 필요한 데이터만 포함 (별도 API로 제공)"""
    pnl_curve_json: List[Dict[str, Any]] = Field(default_factory=list)
    drawdown_curve_json: List[Dict[str, Any]] = Field(default_factory=list)


class BacktestCore(BacktestInList):
    """차트 데이터를 제외한 백테스트 핵심 정보 (빠른 초기 로딩용)"""
    parameters: BacktestParametersPayload  
    strategy_snapshot: Optional[Dict[str, Any]] = None
    strategy: Optional[Strategy] = None 
    result: Optional[BacktestResultCore] = None  # 차트 데이터 제외된 버전


class PaginatedTradeLogs(CamelCaseModel):
    """서버 사이드 페이지네이션을 위한 거래 로그 응답"""
    items: List[TradeLogEntry] = Field(default_factory=list)
    total: int
    page: int
    limit: int
    total_pages: int


class Backtest(BacktestInList):
    parameters: BacktestParametersPayload  
    strategy_snapshot: Optional[Dict[str, Any]] = None
    strategy: Optional[Strategy] = None 
    result: Optional[BacktestResultCore] = None

# ==============================================================================
# Live Bot 관련 추가 스키마
# ==============================================================================
class LiveBotCreate(CamelCaseModel):
    strategy_id: uuid.UUID
    api_key_id: Optional[uuid.UUID] = None  # Paper 모드에서는 선택적
    initial_capital: Optional[float] = Field(None, ge=0.0, description="Initial capital for the bot")
    ticker: str = Field(..., description="Trading pair for the bot")
    execution_interval: str = Field("1h", description="Execution interval (e.g., 1m, 1h)")
    trailing_stop_config: Optional[Dict[str, Any]] = None
    mode: str = Field("paper", description="Trading mode: 'live' or 'paper'")
    
    leverage: float = Field(1.0, ge=1.0, le=125.0, description="Leverage (1-125x)")
    daily_max_loss_pct: Optional[float] = Field(None, ge=0.0, le=100.0, description="Daily max loss %")
    daily_max_loss_enabled: bool = Field(False, description="Enable daily loss limit")

class LiveBotUpdate(CamelCaseModel):
    status: Optional[Literal["active", "paused", "stopped"]] = None

class LiveBot(CamelCaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    strategy_id: uuid.UUID
    api_key_id: Optional[uuid.UUID] = None  # Paper 모드에서는 null 가능
    status: str

    mode: str
    current_balance: Optional[float] = None
    equity: Optional[float] = None
    position_size: float = 0.0
    entry_price: Optional[float] = None
    last_signal: Optional[str] = None
    
    started_at: datetime
    stopped_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
    initial_capital: Optional[float] = None
    execution_interval: str
    trailing_stop_config: Optional[Dict[str, Any]] = None
    strategy: Optional[StrategyForBot] = None
    api_key: Optional[ApiKeyResponse] = None
    
    ticker: str
    leverage: float
    daily_max_loss_pct: Optional[float] = None
    daily_max_loss_enabled: bool
    daily_pnl: float
    total_trades: int
    winning_trades: int
    total_pnl: float
    max_drawdown: float
    last_error: Optional[str] = None
    error_count: int

class BotLog(CamelCaseModel):
    """봇 로그 엔트리"""
    id: uuid.UUID
    bot_id: uuid.UUID
    timestamp: datetime
    level: str  # INFO, WARN, ERROR
    message: str
    metadata: Optional[Dict[str, Any]] = None

class BotTradeLogEntry(CamelCaseModel):
    """봇 거래 로그 (TradeLog 확장)"""
    id: uuid.UUID
    timestamp: datetime
    side: str
    price: float
    quantity: float
    commission: Optional[float] = None
    pnl: Optional[float] = None
    current_balance: Optional[float] = None
    reason: Optional[str] = None

class BotAnalytics(CamelCaseModel):
    """봇 성과 분석 데이터"""
    bot_id: uuid.UUID
    
    # 기본 통계
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    
    # 수익 지표
    total_pnl: float
    total_return_pct: float
    daily_pnl: float
    
    # 리스크 지표
    max_drawdown: float
    sharpe_ratio: Optional[float] = None
    profit_factor: Optional[float] = None
    
    # 거래 분석
    avg_win: Optional[float] = None
    avg_loss: Optional[float] = None
    largest_win: Optional[float] = None
    largest_loss: Optional[float] = None
    
    # 시간 분석
    avg_holding_time: Optional[str] = None
    total_runtime: str

class BotPerformanceSnapshotResponse(CamelCaseModel):
    """성과 스냅샷 응답"""
    snapshot_date: datetime
    balance: float
    position_size: float
    unrealized_pnl: float
    realized_pnl: float
    total_trades: int

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
    limit: int = Field(300, ge=1, le=1000, description="반환할 데이터 포인트 개수")

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
    limit: int = Field(300, ge=1, le=1000, description="반환할 데이터 포인트 개수")
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

class AIModelListPayload(CamelCaseModel):
    """AI 모델을 마켓플레이스에 등록하기 위한 요청 본문"""
    model_id: uuid.UUID
    price: float = Field(..., ge=0)
    description: Optional[str] = None


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

class AIModelProduct(BaseProduct):
    """AI 모델 상품 목록에 표시될 정보"""
    model_type: str  # 'lstm', 'gru', 'tft'
    training_start_date: Optional[str] = None
    training_end_date: Optional[str] = None
    accuracy: Optional[float] = None

class BacktestPublic(CamelCaseModel):
    """마켓플레이스 등 공개용 백테스트 스키마 (민감 정보 제외, 차트 포함)"""
    id: uuid.UUID
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[BacktestResultSummary] = None # 차트 데이터 포함 (Lazy Loading 권한 문제 방지)

class StrategyProductDetailPublic(StrategyProduct):
    """
    비구매자에게 보여줄 공개용 상세 정보.
    전략 규칙 등 민감한 정보는 모두 제외됩니다.
    """
    description: Optional[str] = None
    representative_backtest: Optional[BacktestPublic] = None # 대표 백테스트 결과는 공개 (안전한 스키마 사용)
    
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

    progress: Optional[OptimizationProgress] = None

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
    is_start_date: str = Field(validation_alias="is_start", serialization_alias="isStartDate")
    is_end_date: str = Field(validation_alias="is_end", serialization_alias="isEndDate")
    oos_start_date: str = Field(validation_alias="oos_start", serialization_alias="oosStartDate")
    oos_end_date: str = Field(validation_alias="oos_end", serialization_alias="oosEndDate")
    
    best_params: Dict[str, Any]
    in_sample_metrics: BacktestResultCore
    out_of_sample_metrics: BacktestResultCore

class WFOResult(CamelCaseModel):
    """WFO 전체 결과 스키마"""
    folds: List[WFOFoldResult]
    oos_curve_json: List[Dict[str, Any]] = Field(validation_alias="oos_curve", serialization_alias="oosCurveJson")
    final_equity: float
    total_return_pct: float

class OptimizationJobDetail(OptimizationJobSummary):
    """
    상세 조회용 완전한 최적화 작업 정보.
    프론트엔드의 'OptimizationJobDetail' 타입과 일치합니다.
    """
    config: OptimizationConfig
    progress: Optional[OptimizationProgress] = None
    strategy_snapshot: Optional[Strategy] = Field(None, validation_alias="strategy_snapshot")
    
    # 최적 결과 (전체 시도 중 1위)
    best_trial: Optional[TrialData] = None
    
    # WFO 전용 결과 데이터 (JSONB 내용을 그대로 전달)
    wfo_result: Optional[WFOResult] = None
    
    # Tier 2 분석 데이터
    parameter_importance: Optional[List[Dict[str, Any]]] = None
    
    # 모든 시도 데이터 (대용량 주의, 필요시 페이지네이션 적용)
    trials: List[TrialData] = Field(default_factory=list)
    used_credits: Optional[int] = None

    class Config:
        from_attributes = True


# ==============================================================================
# 9. AI 모델 관련 스키마 
# ==============================================================================

class AIModelStatus(str, enum.Enum):
    """AI 모델 상태"""
    PENDING = "pending"
    TRAINING = "training"
    COMPLETED = "completed"
    FAILED = "failed"


class AIIndicatorConfig(CamelCaseModel):
    """AI 모델에 사용될 기술적 지표 설정"""
    type: str  # RSI, EMA, MACD, BB, ATR 등
    params: Dict[str, Any] = Field(default_factory=dict)


class AIFeatureConfig(CamelCaseModel):
    """AI 모델 피처 설정"""
    sequence_length: int = Field(60, ge=10, le=500, description="시퀀스 길이 (봉 개수)")
    use_ohlcv: bool = True
    ohlcv_columns: List[str] = Field(default_factory=lambda: ["open", "high", "low", "close", "volume"])
    indicators: List[AIIndicatorConfig] = Field(default_factory=list)
    use_returns: bool = True
    use_log_returns: bool = True


class AILabelingConfig(CamelCaseModel):
    """Triple Barrier 라벨링 설정"""
    method: str = Field("triple_barrier", description="라벨링 방법")
    horizon: int = Field(24, ge=1, le=168, description="최대 대기 시간 (봉 개수)")
    profit_target: float = Field(0.02, ge=0.001, le=0.5, description="Take Profit 비율")
    stop_loss: float = Field(0.01, ge=0.001, le=0.5, description="Stop Loss 비율")


class AIArchitectureConfig(CamelCaseModel):
    """AI 모델 아키텍처 설정"""
    hidden_size: int = Field(64, ge=16, le=512)
    num_layers: int = Field(2, ge=1, le=5)
    dropout: float = Field(0.2, ge=0, le=0.5)
    bidirectional: bool = False


class AITrainingConfigSchema(CamelCaseModel):
    """AI 모델 학습 설정"""
    epochs: int = Field(100, ge=10, le=500)
    batch_size: int = Field(64, ge=16, le=256)
    learning_rate: float = Field(0.001, ge=0.0001, le=0.1)
    early_stopping_patience: int = Field(10, ge=3, le=50)
    validation_split: float = Field(0.2, ge=0.1, le=0.4)
    
class SearchRangeSchema(CamelCaseModel):
    min: float
    max: float

class AIOptimizationSearchSpaceSchema(CamelCaseModel):
    hidden_size: SearchRangeSchema
    num_layers: SearchRangeSchema
    dropout: SearchRangeSchema
    learning_rate: SearchRangeSchema
    batch_size: SearchRangeSchema

class AIOptimizationConfigSchema(CamelCaseModel):
    """하이퍼파라미터 최적화 설정 (Optuna)"""
    is_enabled: bool = False
    n_trials: int = Field(20, ge=5, le=100)
    max_epochs_per_trial: int = Field(30, ge=5, le=50)  # 트라이얼당 최대 에폭
    maximize_metric: str = Field("accuracy", pattern="^(accuracy|f1|return|rmse|mae|r2)$")
    search_space: Optional[AIOptimizationSearchSpaceSchema] = None


class AIModelCreate(CamelCaseModel):
    """AI 모델 생성 요청"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    model_type: Literal["lstm", "gru", "tft", "transformer"] = "lstm"
    task_type: Literal["classification", "regression"] = "classification"
    architecture_config: AIArchitectureConfig
    feature_config: AIFeatureConfig
    labeling_config: AILabelingConfig
    training_config: AITrainingConfigSchema
    optimization_config: AIOptimizationConfigSchema = Field(default_factory=lambda: AIOptimizationConfigSchema(is_enabled=False))
    training_symbol: str
    training_timeframe: str
    training_start_date: datetime
    training_end_date: datetime

    @field_validator('name', 'description')
    @classmethod
    def sanitize_fields(cls, value: Optional[str]) -> Optional[str]:
        if value:
            return sanitize_html(value)
        return value


class AITrainingMetrics(CamelCaseModel):
    """학습 결과 메트릭"""
    accuracy: Optional[float] = None
    f1_macro: Optional[float] = None
    precision_macro: Optional[float] = None
    recall_macro: Optional[float] = None
    confusion_matrix: Optional[List[List[int]]] = None
    
    # Regression Metrics
    rmse: Optional[float] = None
    mae: Optional[float] = None
    r2: Optional[float] = None


class AILabelStats(CamelCaseModel):
    """라벨 분포 통계"""
    total_samples: int
    buy_count: int
    hold_count: int
    sell_count: int
    buy_ratio: float
    hold_ratio: float
    sell_ratio: float


class AIEpochLog(CamelCaseModel):
    """에폭별 학습 상태 로그"""
    epoch: int
    train_loss: Optional[float] = None
    val_loss: Optional[float] = None
    accuracy: Optional[float] = None
    rmse: Optional[float] = None
    timestamp: datetime


class AITrainingJobResponse(CamelCaseModel):
    """학습 작업 상태 응답"""
    id: uuid.UUID
    model_id: uuid.UUID
    status: str
    progress_pct: int
    current_epoch: Optional[int] = None
    total_epochs: Optional[int] = None
    current_metrics: Optional[Dict[str, Any]] = None
    epoch_logs: Optional[List[AIEpochLog]] = None
    optimization_result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime


class AIModelSummary(CamelCaseModel):
    """AI 모델 목록 조회용 요약"""
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    model_type: str
    task_type: str = "classification"
    status: AIModelStatus
    training_symbol: str
    training_timeframe: str
    training_start_date: datetime
    training_end_date: datetime
    is_public: bool = False
    is_optimized: bool = False
    created_at: datetime


class AIModelVersionResponse(CamelCaseModel):
    """AI 모델 버전 정보"""
    id: uuid.UUID
    model_id: uuid.UUID
    version_number: int
    created_at: datetime
    training_start_date: datetime
    training_end_date: datetime
    metrics: Optional[Dict[str, Any]] = None
    is_active: bool


class RetrainRequest(CamelCaseModel):
    """AI 모델 재학습 요청"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AIModelDetail(AIModelSummary):
    """AI 모델 상세 정보"""
    user_id: uuid.UUID
    architecture_config: AIArchitectureConfig
    feature_config: AIFeatureConfig
    labeling_config: AILabelingConfig
    training_config: AITrainingConfigSchema
    optimization_config: Optional[AIOptimizationConfigSchema] = None
    training_metrics: Optional[Dict[str, Any]] = None
    validation_metrics: Optional[Dict[str, Any]] = None
    model_weights_path: Optional[str] = None
    updated_at: Optional[datetime] = None
    latest_training_job: Optional[AITrainingJobResponse] = None
    
    # Auto Retrain & Versioning
    is_auto_retrain_enabled: bool = False
    retrain_interval_days: Optional[int] = None
    retrain_data_window_days: Optional[int] = None
    next_retrain_at: Optional[datetime] = None
    active_version_id: Optional[uuid.UUID] = None


class AIModelCreateResponse(CamelCaseModel):
    """AI 모델 생성 응답"""
    model: AIModelSummary
    training_job: AITrainingJobResponse
    task_id: str


class AIPredictionRequest(CamelCaseModel):
    """AI 예측 테스트 요청"""
    symbol: str = Field(..., description="테스트할 심볼")
    timeframe: str = Field("1h", description="타임프레임")


class AIPredictionResponse(CamelCaseModel):
    """AI 예측 결과 응답 (분류)"""
    buy_probability: float
    hold_probability: float
    sell_probability: float
    predicted_class: int
    predicted_label: str
    task_type: Literal["classification"] = "classification"


class AIRegressionPredictionResponse(CamelCaseModel):
    """AI 예측 결과 응답 (회귀)"""
    predicted_value: float
    predicted_target: Optional[str] = "return_pct"
    confidence_interval: Optional[Dict[str, float]] = None
    task_type: Literal["regression"] = "regression"
