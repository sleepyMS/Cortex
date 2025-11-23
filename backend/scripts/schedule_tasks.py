# file: backend/scripts/schedule_tasks.py
import os
import sys
from datetime import datetime, timezone
from celery import Celery
# --- 설정 ---
# Celery 앱 설정을 가져오기 위해 프로젝트 루트를 경로에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.celery_app import celery_app
def schedule_tasks():
    now = datetime.now(timezone.utc)
    print(f"Checking schedule at {now.isoformat()}...")
    # 1. 매 시간 정각 (0분) -> 1시간봉 데이터 수집
    if now.minute == 0:
        print("Triggering: fetch_and_store_ohlcv (1h)")
        celery_app.send_task('fetch_and_store_ohlcv', args=['BTCUSDT', '1h'])
    # 2. 매 15분마다 (0, 15, 30, 45분) -> 15분봉 데이터 수집
    if now.minute % 15 == 0:
        print("Triggering: fetch_and_store_ohlcv (15m)")
        celery_app.send_task('fetch_and_store_ohlcv', args=['BTCUSDT', '15m'])
    # 3. 매일 자정 (0시 0분) -> 정기 결제 처리
    if now.hour == 0 and now.minute == 0:
        print("Triggering: process_daily_recurring_payments")
        celery_app.send_task('process_daily_recurring_payments')
    # 4. (옵션) 1분마다 실행해야 하는 봇 로직이 있다면 여기에 추가
    # celery_app.send_task('run_all_active_bots')
if __name__ == "__main__":
    schedule_tasks()