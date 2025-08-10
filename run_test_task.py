# file: run_test_task.py (프로젝트 루트에 생성)

import time
from backend.app.tasks import fetch_and_store_ohlcv_task

def run_test():
    print("Dispatching test task to fetch OHLCV data for BTC/USDT (1h)...")
    
    # Celery 워커에게 'BTC/USDT'의 '1h' 봉 데이터를 가져오라고 명령
    result = fetch_and_store_ohlcv_task.delay(
        ticker="BTC/USDT",
        timeframe="1h",
        limit=10 # 테스트용으로 10개만 가져옴
    )
    
    print(f"Task dispatched with ID: {result.id}")
    print("Check your Celery worker's logs for execution details.")
    print("Waiting 10 seconds for task to complete...")
    time.sleep(10)
    print("Test finished. Check your database for new data in 'ohlcv_1h' table.")

if __name__ == "__main__":
    run_test()