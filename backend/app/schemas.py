# file: backend/app/schemas.py

from pydantic import BaseModel, EmailStr
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str | None = None # 선택적으로 사용자 이름도 받도록 추가

class User(BaseModel): # 응답용 스키마
    id: int
    email: EmailStr
    username: str | None
    is_active: bool
    role: str

    class Config:
        from_attributes = True # ORM 모델과 호환되도록 설정

class Token(BaseModel):
    """JWT 토큰 응답 스키마"""
    access_token: str
    token_type: str
    refresh_token: str | None = None

class TokenData(BaseModel):
    """JWT 토큰에 담길 데이터 스키마"""
    email: str | None = None

class AuthCode(BaseModel):
    """Google, Kakao 등 일반적인 OAuth 인가 코드 요청 스키마"""
    code: str

class AuthCodeWithState(AuthCode):
    """Naver와 같이 state 파라미터가 추가로 필요한 OAuth 인가 코드 요청 스키마"""
    state: str

class SocialUserProfile(BaseModel):
    provider: str
    social_id: str
    email: EmailStr
    username: str | None = None

# Refresh Token 요청을 위한 스키마
class RefreshTokenRequest(BaseModel):
    """리프레시 토큰 재발급 요청 스키마"""
    refresh_token: str

class DashboardSummary(BaseModel):
    activeBotsCount: int
    totalProfitLoss: float
    # ... 기타 필요한 데이터

    class Config:
        from_attributes = True # ORM 모델과 호환되도록 설정

class SocialCallbackRequest(BaseModel):
    """모든 소셜 로그인 콜백 요청을 처리하기 위한 통합 스키마"""
    code: str
    state: str | None = None # Naver를 위한 선택적 state 필드