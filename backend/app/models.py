# file: backend/app/models.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from .database import Base # database.py에서 정의한 Base 임포트

# SQLAlchemy Base 모델 (모든 모델이 상속받음)
# Base = declarative_base() # database.py로 이동

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user") # 'user', 'admin' 등
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 리프레시 토큰 필드 추가
    refresh_token = Column(String, unique=True, nullable=True, index=True)
    refresh_token_expires_at = Column(DateTime(timezone=True), nullable=True)

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    price = Column(Float, nullable=False)
    features = Column(JSON, nullable=False) # JSON 타입으로 기능 제한 저장 (PostgreSQL 지원)

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # ForeignKey (User.id)
    plan_id = Column(Integer, index=True) # ForeignKey (Plan.id)
    status = Column(String, nullable=False) # 'active', 'canceled', 'past_due'
    current_period_end = Column(DateTime(timezone=True), nullable=False)
    payment_gateway_sub_id = Column(String, unique=True, nullable=True) # 결제사 구독 ID

class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # ForeignKey (User.id)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    rules = Column(JSON, nullable=False) # JSON 타입으로 전략 규칙 저장
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BacktestResult(Base):
    __tablename__ = "backtest_results"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # ForeignKey (User.id)
    result_summary = Column(JSON, nullable=False) # 요약 정보 (수익률, MDD 등)
    trade_log = Column(JSON, nullable=False) # 상세 거래 내역
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True) # ForeignKey (User.id)
    backtest_result_id = Column(Integer, unique=True, nullable=True) # ForeignKey (BacktestResult.id)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, index=True) # ForeignKey (CommunityPost.id)
    user_id = Column(Integer, index=True) # ForeignKey (User.id)
    content = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Like(Base):
    __tablename__ = "likes"

    user_id = Column(Integer, primary_key=True) # Composite Primary Key (user_id, post_id)
    post_id = Column(Integer, primary_key=True) # Composite Primary Key (user_id, post_id)
    created_at = Column(DateTime(timezone=True), server_default=func.now())