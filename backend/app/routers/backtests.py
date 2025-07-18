# backend/app/routers/backtests.py

from fastapi import APIRouter

router = APIRouter()

@router.post("/backtests")
async def run_new_backtest():
    # 여기에 실제 백테스팅 실행 로직이 들어갑니다.
    return {"message": "Backtest started successfully", "result_id": 123}