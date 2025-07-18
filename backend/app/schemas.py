# file: backend/app/schemas.py

from pydantic import BaseModel, EmailStr
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True # orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str | None = None # refresh_token 필드 추가

class TokenData(BaseModel):
    email: str | None = None

# Refresh Token 요청을 위한 스키마
class RefreshTokenRequest(BaseModel):
    refresh_token: str