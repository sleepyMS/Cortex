# # file: backfill_data.py (프로젝트 루트에 생성)

# import time
# from datetime import datetime, timezone
# import ccxt
# from backend.app.tasks import fetch_and_store_ohlcv_task

# # 👈 1. 백필링을 원하는 코인과 타임프레임 목록을 여기에 정의합니다.
# TARGETS = [
#     {'ticker': 'BTCUSDT', 'timeframe': '1h'},
#     {'ticker': 'BTCUSDT', 'timeframe': '1d'},
#     {'ticker': 'ETH/USDT', 'timeframe': '1h'},
#     {'ticker': 'ETH/USDT', 'timeframe': '1d'},
# ]

# # 👈 2. 데이터 수집을 시작할 날짜를 정의합니다. (ISO 8601 형식)
# START_DATE_STR = '2023-01-01T00:00:00Z'

# def timeframe_to_milliseconds(timeframe: str) -> int:
#     """타임프레임 문자열을 millisecond로 변환합니다."""
#     amount = int(timeframe[:-1])
#     unit = timeframe[-1]
#     if unit == 'm':
#         return amount * 60 * 1000
#     elif unit == 'h':
#         return amount * 60 * 60 * 1000
#     elif unit == 'd':
#         return amount * 24 * 60 * 60 * 1000
#     elif unit == 'w':
#         return amount * 7 * 24 * 60 * 60 * 1000
#     # 'M' (월)은 가변적이므로 여기서는 단순 계산 (정확한 계산 필요 시 로직 추가)
#     elif unit == 'M':
#         return amount * 30 * 24 * 60 * 60 * 1000
#     return 0

# def run_backfill():
#     """
#     TARGETS에 정의된 모든 코인/타임프레임에 대해
#     START_DATE_STR부터 현재까지의 과거 데이터를 가져옵니다.
#     """
#     print("Starting historical data backfilling process...")
    
#     # 👈 3. API 속도 제한(Rate Limit)을 준수하기 위해 CCXT 인스턴스를 사용합니다.
#     exchange = ccxt.binance()
#     # CCXT의 rateLimit는 millisecond 단위이므로 초 단위로 변환
#     # API 요청 사이에 최소한의 딜레이를 주어 IP 차단을 방지합니다.
#     api_delay_seconds = exchange.rateLimit / 1000

#     start_timestamp = int(datetime.fromisoformat(START_DATE_STR.replace('Z', '+00:00')).timestamp() * 1000)
#     now_timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)

#     for target in TARGETS:
#         ticker = target['ticker']
#         timeframe = target['timeframe']
        
#         print(f"\n--- Start backfilling for {ticker} ({timeframe}) from {START_DATE_STR} ---")
        
#         since = start_timestamp
#         timeframe_ms = timeframe_to_milliseconds(timeframe)
#         limit = 1000 # 한 번에 가져올 최대 캔들 수 (거래소마다 다름)

#         while since < now_timestamp:
#             print(f"Dispatching task for {ticker} starting from {datetime.fromtimestamp(since/1000, tz=timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}")
            
#             # 👈 4. 이미 만들어둔 Celery 태스크를 호출하여 작업을 위임합니다.
#             fetch_and_store_ohlcv_task.delay(
#                 ticker=ticker,
#                 timeframe=timeframe,
#                 since=since,
#                 limit=limit
#             )
            
#             # 👈 5. 다음 요청 시작 시간을 계산합니다.
#             # (limit개의 캔들 * 캔들 1개의 시간) 만큼未来로 이동
#             since += timeframe_ms * limit
            
#             # 👈 6. 거래소 API Rate Limit 준수
#             time.sleep(api_delay_seconds)
            
#         print(f"--- Finished dispatching all tasks for {ticker} ({timeframe}) ---")

#     print("\nAll backfilling tasks have been dispatched. Check Celery worker logs for progress.")
#     print("It may take a significant amount of time for all data to be processed and stored.")

# if __name__ == "__main__":
#     run_backfill()