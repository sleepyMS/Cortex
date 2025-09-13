# file: backend/app/models.py
import enum
import uuid 
from typing import List, Optional
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, JSON,
    ForeignKey, UniqueConstraint, CheckConstraint, Enum, Text
)
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# ==============================================================================
# 1. 사용자, 인증, 구독 관련 모델
# ==============================================================================

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    CANCELED = "canceled"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    role = Column(String(50), nullable=False, default="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    bio = Column(String(200), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    social_links = Column(JSONB, nullable=True) # 예: {"twitter": "...", "github": "..."}
    
    # ForeignKey 제약조건을 추가하여 데이터 무결성 보장
    featured_strategy_id = Column(UUID(as_uuid=True), ForeignKey("strategies.id"), nullable=True)

    social_accounts = relationship("SocialAccount", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    strategies = relationship(
        "Strategy",
        foreign_keys="[Strategy.author_id]", # Strategy 모델의 author_id를 사용하도록 명시
        back_populates="author",
        cascade="all, delete-orphan"
    )
    backtests = relationship("Backtest", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    live_bots = relationship("LiveBot", back_populates="user", cascade="all, delete-orphan")
    community_posts = relationship(
        "CommunityPost",
        foreign_keys="[CommunityPost.author_id]", # CommunityPost의 author_id를 사용하도록 명시
        back_populates="author",
        cascade="all, delete-orphan"
    )
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    email_verification_tokens = relationship("EmailVerificationToken", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")

class SocialAccount(Base):
    """사용자의 소셜 로그인 계정 정보 모델"""
    __tablename__ = "social_accounts"
    __table_args__ = (UniqueConstraint('provider', 'provider_user_id', name='_provider_user_uc'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)
    provider_user_id = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    username = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="social_accounts")


class PlanType(str, enum.Enum):
    BASIC = "Basic"
    TRADER = "Trader"
    PRO = "Pro"

    
class Plan(Base):
    """구독 플랜 모델"""
    __tablename__ = "plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Enum(PlanType), unique=True, nullable=False)
    price = Column(Float, nullable=False)
    features = relationship("PlanFeature", back_populates="plan", uselist=False, cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="plan")

class PlanFeature(Base):
    """플랜별 기능 제한 모델"""
    __tablename__ = "plan_features"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    max_strategies = Column(Integer, nullable=False)
    max_coins_per_backtest = Column(Integer, nullable=False)
    live_bots_limit = Column(Integer, nullable=False)
    daily_backtest_count = Column(Integer, nullable=False)
    max_backtest_duration_years = Column(Integer, nullable=True)
    supported_timeframes = Column(String, nullable=False)
    
    community_access = Column(Boolean, default=False, nullable=False)
    telegram_alerts = Column(Boolean, default=False, nullable=False)
    advanced_features_access = Column(Boolean, default=False, nullable=False)
    portfolio_backtest_access = Column(Boolean, default=False, nullable=False)

    plan = relationship("Plan", back_populates="features")

class Subscription(Base):
    """사용자 구독 정보 모델"""
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False)
    status = Column(String(50), nullable=False, default='active')
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    payment_gateway_customer_key = Column(String(255), nullable=True, comment="PG사 빌링키 (Toss 등)")
    payment_method_details = Column(String(255), nullable=True, comment="카드 정보 요약 (현대카드 1234)")
    payment_gateway_sub_id = Column(String(255), unique=True, nullable=True)
    refresh_token = Column(String(512), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user = relationship("User", back_populates="subscription")
    plan = relationship("Plan", back_populates="subscriptions")


# ==============================================================================
# 2. 전략, 백테스팅, 자동매매 관련 모델
# ==============================================================================

class Strategy(Base):
    """투자 전략 모델"""
    __tablename__ = "strategies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    
    long_entry_rules = Column(JSON, nullable=True)
    long_exit_rules = Column(JSON, nullable=True)
    short_entry_rules = Column(JSON, nullable=True)
    short_exit_rules = Column(JSON, nullable=True)
    tpsl_logic = Column(JSON, nullable=True)
    
    target_coins = Column(JSON, nullable=False, server_default=text("'[]'"))

    is_public = Column(Boolean, default=False, nullable=False)
    paid_feature_level = Column(String(50), default=PlanType.BASIC, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    author = relationship("User", foreign_keys=[author_id], back_populates="strategies")
    backtests = relationship("Backtest", back_populates="strategy", cascade="all, delete-orphan")
    live_bots = relationship("LiveBot", back_populates="strategy", cascade="all, delete-orphan")
    purchases = relationship("UserPurchasedStrategy", back_populates="strategy")

class Backtest(Base):
    """백테스팅 실행 기록 모델"""
    __tablename__ = "backtests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    strategy_id = Column(UUID(as_uuid=True), ForeignKey("strategies.id"), nullable=False)

    celery_task_id = Column(String, index=True, nullable=True)
    
    status = Column(String(50), nullable=False, default='pending')
    parameters = Column(JSON, nullable=False)
    strategy_snapshot = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="backtests")
    strategy = relationship("Strategy", back_populates="backtests", lazy="joined")
    result = relationship("BacktestResult", back_populates="backtest", uselist=False, cascade="all, delete-orphan", lazy="joined")
    trade_logs = relationship("TradeLog", back_populates="backtest", cascade="all, delete-orphan")
    community_post = relationship("CommunityPost", back_populates="backtest", uselist=False, cascade="all, delete-orphan")

class BacktestResult(Base):
    """백테스팅 결과 요약 모델"""
    __tablename__ = "backtest_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    backtest_id = Column(UUID(as_uuid=True), ForeignKey("backtests.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_return_pct = Column(Float, nullable=True)
    mdd_pct = Column(Float, nullable=True)
    sharpe_ratio = Column(Float, nullable=True)
    win_rate_pct = Column(Float, nullable=True)
    pnl_curve_json = Column(JSON, nullable=True)
    drawdown_curve_json = Column(JSON, nullable=True)
    trade_summary_json = Column(JSON, nullable=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    profit_factor = Column(Float, nullable=True)
    sortino_ratio = Column(Float, nullable=True)
    cagr_pct = Column(Float, nullable=True)
    calmar_ratio = Column(Float, nullable=True)
    ulcer_index = Column(Float, nullable=True)
    avg_profit_loss_ratio = Column(Float, nullable=True)
    k_ratio = Column(Float, nullable=True)
    longest_flat_days = Column(Integer, nullable=True)
    avg_holding_period_days = Column(Float, nullable=True)
    total_trades = Column(Integer, nullable=True)
    winning_trades = Column(Integer, nullable=True)
    losing_trades = Column(Integer, nullable=True)
    backtest_score = Column(Float, nullable=True)
    score_factors = Column(JSONB, nullable=True)

    backtest = relationship("Backtest", back_populates="result")

class TradeLog(Base):
    """백테스팅 또는 자동매매의 개별 거래 기록 모델"""
    __tablename__ = "trade_logs"
    __table_args__ = (
        CheckConstraint(
            '(backtest_id IS NOT NULL AND live_bot_id IS NULL) OR '
            '(backtest_id IS NULL AND live_bot_id IS NOT NULL)',
            name='_trade_log_exclusive_parent_check'
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    backtest_id = Column(UUID(as_uuid=True), ForeignKey("backtests.id", ondelete="CASCADE"), nullable=True)
    live_bot_id = Column(UUID(as_uuid=True), ForeignKey("live_bots.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    side = Column(String(10), nullable=False)
    price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    commission = Column(Float, nullable=True)
    pnl = Column(Float, nullable=True)
    current_balance = Column(Float, nullable=True)

    reason = Column(String(50), nullable=True, default="Signal")

    backtest = relationship("Backtest", back_populates="trade_logs")
    live_bot = relationship("LiveBot", back_populates="trade_logs")

class ApiKey(Base):
    """사용자의 거래소 API 키 모델 (암호화 저장 필수)"""
    __tablename__ = "api_keys"
    __table_args__ = (UniqueConstraint('user_id', 'exchange', name='_user_exchange_uc'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exchange = Column(String(100), nullable=False)
    api_key_encrypted = Column(String(512), nullable=False)
    secret_key_encrypted = Column(String(512), nullable=False)
    memo = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user = relationship("User", back_populates="api_keys")
    live_bots = relationship("LiveBot", back_populates="api_key", cascade="all, delete-orphan")


class LiveBot(Base):
    """자동매매 봇 인스턴스 모델"""
    __tablename__ = "live_bots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    strategy_id = Column(UUID(as_uuid=True), ForeignKey("strategies.id"), nullable=False)
    api_key_id = Column(UUID(as_uuid=True), ForeignKey("api_keys.id"), nullable=False)

    celery_task_id = Column(String, index=True, nullable=True)
    
    status = Column(String(50), default='active', nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    stopped_at = Column(DateTime(timezone=True), nullable=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    initial_capital = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user = relationship("User", back_populates="live_bots")
    strategy = relationship("Strategy", back_populates="live_bots")
    api_key = relationship("ApiKey", back_populates="live_bots")
    trade_logs = relationship("TradeLog", back_populates="live_bot", cascade="all, delete-orphan")


# ==============================================================================
# 3. 커뮤니티 관련 모델
# ==============================================================================

class CommunityPost(Base):
    """커뮤니티 게시물 모델"""
    __tablename__ = "community_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    backtest_id = Column(UUID(as_uuid=True), ForeignKey("backtests.id"), unique=True, nullable=True)
    title = Column(String(255), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    author = relationship("User", foreign_keys=[author_id], back_populates="community_posts")
    backtest = relationship("Backtest", back_populates="community_post")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    """게시물 댓글 모델"""
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id = Column(UUID(as_uuid=True), ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    post = relationship("CommunityPost", back_populates="comments")
    author = relationship("User", back_populates="comments")

class Like(Base):
    """게시물 좋아요 모델"""
    __tablename__ = "likes"
    __table_args__ = (UniqueConstraint('user_id', 'post_id', name='_user_post_uc'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="likes")
    post = relationship("CommunityPost", back_populates="likes")

class RefreshToken(Base):
    """리프레시 토큰 모델 (JWT 리프레시 토큰 관리용)"""
    __tablename__ = "refresh_tokens"
    __table_args__ = (UniqueConstraint('user_id', 'jti', name='_user_jti_uc'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jti = Column(String(255), unique=True, nullable=False, index=True)
    hashed_token = Column(String(512), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="refresh_tokens")

# ==============================================================================
# 4. 이메일 인증 및 비밀번호 재설정 토큰 모델
# ==============================================================================

class EmailVerificationToken(Base):
    """이메일 주소 확인을 위한 토큰 모델"""
    __tablename__ = "email_verification_tokens"
    __table_args__ = (UniqueConstraint('user_id', 'jti', name='_user_email_verif_jti_uc'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jti = Column(String(255), unique=True, nullable=False, index=True)
    hashed_token = Column(String(512), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="email_verification_tokens")

class PasswordResetToken(Base):
    """비밀번호 재설정을 위한 토큰 모델"""
    __tablename__ = "password_reset_tokens"
    __table_args__ = (UniqueConstraint('user_id', 'jti', name='_user_password_reset_jti_uc'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jti = Column(String(255), unique=True, nullable=False, index=True)
    hashed_token = Column(String(512), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="password_reset_tokens")

# ==============================================================================
# 5. 시계열 데이터 모델 (TimescaleDB Hypertables)
# ==============================================================================

class OHLCV1h(Base):
    """
    1시간봉 OHLCV 데이터 모델. Alembic이 테이블 구조를 인식하도록 하기 위해 정의합니다.
    실제 하이퍼테이블 변환은 마이그레이션 스크립트에서 수동으로 처리합니다.
    """
    __tablename__ = "ohlcv_1h"
    __table_args__ = (
        # Upsert를 위한 고유 제약 조건
        UniqueConstraint('time', 'ticker', name='_ohlcv_1h_time_ticker_uc'),
        # 데이터 조회 성능 최적화를 위한 인덱스
        # SQLAlchemy 2.0+ 에서는 Index 객체를 직접 사용합니다.
        # from sqlalchemy import Index
        # Index('idx_ohlcv_1h_ticker_time', 'ticker', postgresql_ops={'time': 'DESC'}),
    )

    time = Column(DateTime(timezone=True), primary_key=True)
    ticker = Column(Text, primary_key=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)

# file: backend/app/models.py (파일 하단에 추가)

# ==============================================================================
# 6. 마켓플레이스 및 인벤토리 관련 모델 (신규 추가)
# ==============================================================================

class ProductType(str, enum.Enum):
    STRATEGY = "STRATEGY"
    SHOP_ITEM = "SHOP_ITEM"

class InventoryType(str, enum.Enum):
    UNLOCK = "UNLOCK"      # 한 번만 구매 가능
    CONSUMABLE = "CONSUMABLE"  # 여러 번 구매 및 소진 가능

class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELED = "CANCELED"

class ShopItemDetail(Base):
    """상점 아이템의 고유 속성(메타데이터)을 저장하는 테이블"""
    __tablename__ = "shop_item_details"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_type = Column(String, unique=True, nullable=False, comment="e.g., OPTIMIZATION_COUPON")
    display_properties = Column(JSON, nullable=False, comment="icon, tier, stats for UI")

class MarketplaceProduct(Base):
    """모든 판매 상품(전략, 아이템)의 통합 모델"""
    __tablename__ = "marketplace_products"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    product_type = Column(Enum(ProductType), nullable=False, index=True)
    inventory_type = Column(Enum(InventoryType), nullable=False)
    linked_resource_id = Column(UUID(as_uuid=True), nullable=False, index=True, comment="strategies.id or shop_item_details.id")
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    product_metadata = Column("metadata", JSON, default={}) # 카테고리, 포지션 타입 등 저장
    representative_backtest_id = Column(UUID(as_uuid=True), ForeignKey("backtests.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    seller = relationship("User")
    shop_item_detail = relationship("ShopItemDetail", 
                                  primaryjoin="and_(MarketplaceProduct.linked_resource_id==foreign(ShopItemDetail.id), MarketplaceProduct.product_type=='SHOP_ITEM')",
                                  uselist=False, lazy="joined")

class MarketplaceOrder(Base):
    """결제 요청 단위인 '주문' 모델"""
    __tablename__ = "marketplace_orders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, index=True)
    payment_gateway = Column(String, nullable=True)
    gateway_transaction_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    buyer = relationship("User")
    items = relationship("MarketplaceOrderItem", back_populates="order", cascade="all, delete-orphan")


class MarketplaceOrderItem(Base):
    """주문에 포함된 개별 상품 항목 모델"""
    __tablename__ = "marketplace_order_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_orders.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    price_at_purchase = Column(Float, nullable=False)

    order = relationship("MarketplaceOrder", back_populates="items")
    product = relationship("MarketplaceProduct")

class UserPurchasedStrategy(Base):
    """사용자가 구매한 전략의 '소유권' 모델"""
    __tablename__ = "user_purchased_strategies"
    __table_args__ = (UniqueConstraint('user_id', 'strategy_id', name='_user_strategy_uc'),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    strategy_id = Column(UUID(as_uuid=True), ForeignKey("strategies.id"), nullable=False, index=True)
    order_item_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_order_items.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")
    strategy = relationship("Strategy")
    order_item = relationship("MarketplaceOrderItem")

class UserInventory(Base):
    """[개선] 사용자가 보유한 '소모성 아이템'의 수량을 관리하는 모델"""
    __tablename__ = "user_inventory"
    __table_args__ = (UniqueConstraint('user_id', 'product_id', name='_user_product_uc'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("marketplace_products.id"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1, server_default="1")
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")
    product = relationship("MarketplaceProduct")
