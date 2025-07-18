# backend/app/routers/auth.py

from fastapi import APIRouter

router = APIRouter()

@router.post("/auth/signup")
async def signup_user():
    # 여기에 실제 회원가입 로직이 들어갑니다.
    return {"message": "Signup successful"}

@router.post("/auth/login")
async def login_user():
    # 여기에 실제 로그인 로직이 들어갑니다.
    return {"message": "Login successful"}