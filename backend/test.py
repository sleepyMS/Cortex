# import secrets
# import string

# characters = string.ascii_letters + string.digits  # 대소문자 + 숫자
# random_str = ''.join(secrets.choice(characters) for _ in range(32))
# print(random_str)

# --------------------------------------------------

# 예시: BTCUSDT 1시간봉 데이터를 2020년 1월 1일부터 현재까지 모두 수집
from app.tasks import backfill_ohlcv

# Celery 워커가 실행 중인 상태에서 아래 코드를 실행
backfill_ohlcv.delay("BTCUSDT", "1h", "2020-01-01T00:00:00Z")