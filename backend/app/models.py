# file: backend/app/models.py

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, JSON,
    ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# ==============================================================================
# 1. 사용자, 인증, 구독 관련 모델
# ==============================================================================

class User(Base):
    """사용자 계정 모델"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True)
    hashed_password = Column(String(255), nullable=True) # 소셜 로그인을 위해 NULL 허용
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(String(50), nullable=False, default="user") # e.g., 'user', 'pro', 'admin'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 양방향 관계 설정
    social_accounts = relationship("SocialAccount", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    strategies = relationship("Strategy", back_populates="author", cascade="all, delete-orphan")
    backtests = relationship("Backtest", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    live_bots = relationship("LiveBot", back_populates="user", cascade="all, delete-orphan")
    community_posts = relationship("CommunityPost", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")

class SocialAccount(Base):
    """사용자의 소셜 로그인 계정 정보 모델"""
    __tablename__ = "social_accounts"
    __table_args__ = (UniqueConstraint('provider', 'provider_user_id', name='_provider_user_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)  # e.g., "google", "kakao"
    provider_user_id = Column(String(255), nullable=False)

    user = relationship("User", back_populates="social_accounts")

class Plan(Base):
    """구독 플랜 모델"""
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    price = Column(Float, nullable=False)
    features = Column(JSON, nullable=False) # e.g., {"concurrent_bots": 5}

    subscriptions = relationship("Subscription", back_populates="plan")

class Subscription(Base):
    """사용자 구독 정보 모델"""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    status = Column(String(50), nullable=False) # 'active', 'canceled', 'past_due'
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    payment_gateway_sub_id = Column(String(255), unique=True)

    user = relationship("User", back_populates="subscription")
    plan = relationship("Plan", back_populates="subscriptions")


# ==============================================================================
# 2. 전략, 백테스팅, 자동매매 관련 모델
# ==============================================================================

class Strategy(Base):
    """투자 전략 모델"""
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    rules = Column(JSON, nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    author = relationship("User", back_populates="strategies")

class Backtest(Base):
    """백테스팅 실행 기록 모델"""
    __tablename__ = "backtests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    status = Column(String(50), nullable=False, default='pending')
    parameters = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="backtests")
    result = relationship("BacktestResult", back_populates="backtest", uselist=False, cascade="all, delete-orphan")
    trade_logs = relationship("TradeLog", back_populates="backtest", cascade="all, delete-orphan")
    community_post = relationship("CommunityPost", back_populates="backtest", uselist=False, cascade="all, delete-orphan")

class BacktestResult(Base):
    """백테스팅 결과 요약 모델"""
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(Integer, ForeignKey("backtests.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_return_pct = Column(Float)
    mdd_pct = Column(Float) # Max Drawdown
    sharpe_ratio = Column(Float)
    win_rate_pct = Column(Float)
    pnl_curve_json = Column(JSON) # e.g., [{"timestamp": ..., "value": ...}]

    backtest = relationship("Backtest", back_populates="result")

class TradeLog(Base):
    """백테스팅 또는 자동매매의 개별 거래 기록 모델"""
    __tablename__ = "trade_logs"

    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(Integer, ForeignKey("backtests.id", ondelete="CASCADE"))
    live_bot_id = Column(Integer, ForeignKey("live_bots.id", ondelete="CASCADE"))
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    side = Column(String(10), nullable=False) # 'buy', 'sell'
    price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    pnl = Column(Float) # 이 거래로 발생한 손익

    backtest = relationship("Backtest", back_populates="trade_logs")
    live_bot = relationship("LiveBot", back_populates="trade_logs")

class ApiKey(Base):
    """사용자의 거래소 API 키 모델 (암호화 저장 필수)"""
    __tablename__ = "api_keys"
    __table_args__ = (UniqueConstraint('user_id', 'exchange', name='_user_exchange_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exchange = Column(String(100), nullable=False)
    api_key_encrypted = Column(String(512), nullable=False)
    secret_key_encrypted = Column(String(512), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="api_keys")

class LiveBot(Base):
    """자동매매 봇 인스턴스 모델"""
    __tablename__ = "live_bots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=False)
    status = Column(String(50), default='active', nullable=False) # 'active', 'paused', 'stopped'
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="live_bots")
    trade_logs = relationship("TradeLog", back_populates="live_bot", cascade="all, delete-orphan")


# ==============================================================================
# 3. 커뮤니티 관련 모델
# ==============================================================================

class CommunityPost(Base):
    """커뮤니티 게시물 모델"""
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    backtest_id = Column(Integer, ForeignKey("backtests.id"), unique=True) # 백테스트 결과 공유 시 연결
    title = Column(String(255), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    author = relationship("User", back_populates="community_posts")
    backtest = relationship("Backtest", back_populates="community_post")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    """게시물 댓글 모델"""
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    post = relationship("CommunityPost", back_populates="comments")
    author = relationship("User", back_populates="comments")

class Like(Base):
    """게시물 좋아요 모델"""
    __tablename__ = "likes"
    __table_args__ = (UniqueConstraint('user_id', 'post_id', name='_user_post_uc'),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="likes")
    post = relationship("CommunityPost", back_populates="likes")

class RefreshToken(Base):
    """리프레시 토큰 모델"""
    __tablename__ = "refresh_tokens"
    __table_args__ = (UniqueConstraint('user_id', 'token', name='_user_token_uc'),)

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(512), unique=True, nullable=False, index=True) # 토큰 자체도 해싱하여 저장
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_revoked = Column(Boolean, default=False)

    user = relationship("User")