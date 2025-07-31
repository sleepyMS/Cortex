# file: backend/app/models.py

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, JSON,
    ForeignKey, UniqueConstraint, CheckConstraint
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
    username = Column(String(100), unique=True, index=True, nullable=True)
    hashed_password = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_email_verified = Column(Boolean, default=False, nullable=False)
    role = Column(String(50), nullable=False, default="user")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    social_accounts = relationship("SocialAccount", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")
    strategies = relationship("Strategy", back_populates="author", cascade="all, delete-orphan")
    backtests = relationship("Backtest", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    live_bots = relationship("LiveBot", back_populates="user", cascade="all, delete-orphan")
    community_posts = relationship("CommunityPost", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    email_verification_tokens = relationship("EmailVerificationToken", back_populates="user", cascade="all, delete-orphan")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")

class SocialAccount(Base):
    """사용자의 소셜 로그인 계정 정보 모델"""
    __tablename__ = "social_accounts"
    __table_args__ = (UniqueConstraint('provider', 'provider_user_id', name='_provider_user_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(50), nullable=False)
    provider_user_id = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=True)
    username = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="social_accounts")

class Plan(Base):
    """구독 플랜 모델"""
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    price = Column(Float, nullable=False)
    features = Column(JSON, nullable=False)

    subscriptions = relationship("Subscription", back_populates="plan")

class Subscription(Base):
    """사용자 구독 정보 모델"""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    status = Column(String(50), nullable=False, default='active')
    current_period_end = Column(DateTime(timezone=True), nullable=False)
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

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    rules = Column(JSON, nullable=False)
    is_public = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    author = relationship("User", back_populates="strategies")
    backtests = relationship("Backtest", back_populates="strategy", cascade="all, delete-orphan")
    live_bots = relationship("LiveBot", back_populates="strategy", cascade="all, delete-orphan")


class Backtest(Base):
    """백테스팅 실행 기록 모델"""
    __tablename__ = "backtests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    status = Column(String(50), nullable=False, default='pending')
    parameters = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="backtests")
    strategy = relationship("Strategy", back_populates="backtests")
    result = relationship("BacktestResult", back_populates="backtest", uselist=False, cascade="all, delete-orphan")
    trade_logs = relationship("TradeLog", back_populates="backtest", cascade="all, delete-orphan")
    community_post = relationship("CommunityPost", back_populates="backtest", uselist=False, cascade="all, delete-orphan")

class BacktestResult(Base):
    """백테스팅 결과 요약 모델"""
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(Integer, ForeignKey("backtests.id", ondelete="CASCADE"), unique=True, nullable=False)
    total_return_pct = Column(Float, nullable=True)
    mdd_pct = Column(Float, nullable=True)
    sharpe_ratio = Column(Float, nullable=True)
    win_rate_pct = Column(Float, nullable=True)
    pnl_curve_json = Column(JSON, nullable=True)
    trade_summary_json = Column(JSON, nullable=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)

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

    id = Column(Integer, primary_key=True, index=True)
    backtest_id = Column(Integer, ForeignKey("backtests.id", ondelete="CASCADE"), nullable=True)
    live_bot_id = Column(Integer, ForeignKey("live_bots.id", ondelete="CASCADE"), nullable=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    side = Column(String(10), nullable=False)
    price = Column(Float, nullable=False)
    quantity = Column(Float, nullable=False)
    commission = Column(Float, nullable=True)
    pnl = Column(Float, nullable=True)
    current_balance = Column(Float, nullable=True)

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
    memo = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    user = relationship("User", back_populates="api_keys")
    live_bots = relationship("LiveBot", back_populates="api_key", cascade="all, delete-orphan")


class LiveBot(Base):
    """자동매매 봇 인스턴스 모델"""
    __tablename__ = "live_bots"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=False)
    api_key_id = Column(Integer, ForeignKey("api_keys.id"), nullable=False)
    status = Column(String(50), default='active', nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    stopped_at = Column(DateTime(timezone=True), nullable=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    initial_capital = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False) # 👈 created_at 필드 추가

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

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    backtest_id = Column(Integer, ForeignKey("backtests.id"), unique=True, nullable=True)
    title = Column(String(255), nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

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
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    post = relationship("CommunityPost", back_populates="comments")
    author = relationship("User", back_populates="comments")

class Like(Base):
    """게시물 좋아요 모델"""
    __tablename__ = "likes"
    __table_args__ = (UniqueConstraint('user_id', 'post_id', name='_user_post_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("community_posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="likes")
    post = relationship("CommunityPost", back_populates="likes")

class RefreshToken(Base):
    """리프레시 토큰 모델 (JWT 리프레시 토큰 관리용)"""
    __tablename__ = "refresh_tokens"
    __table_args__ = (UniqueConstraint('user_id', 'jti', name='_user_jti_uc'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
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

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
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

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jti = Column(String(255), unique=True, nullable=False, index=True)
    hashed_token = Column(String(512), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="password_reset_tokens")