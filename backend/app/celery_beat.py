# file: backend/app/celery_beat.py

from .celery_app import celery_app
from celery.schedules import crontab

# celery_app.conf.beat_schedule = {
#     'fetch-btc-usdt-1h-every-hour': {
#         'task': 'fetch_and_store_ohlcv',
#         'schedule': crontab(minute=2, hour='*'),
#         'args': ('BTC/USDT', '1h'),
#     },
#     'fetch-btc-usdt-15m-every-15-mins': {
#         'task': 'fetch_and_store_ohlcv',
#         'schedule': crontab(minute='*/15'),
#         'args': ('BTC/USDT', '15m'),
#     },
#     # --- 자동매매 봇 관리를 위한 스케줄 추가 ---
#     # 'run-all-active-bots-every-minute': {
#     #     'task': 'run_all_active_bots',  # 디스패처 태스크 이름
#     #     'schedule': crontab(minute='*'), # 매 분마다 실행
#     # },
# }
celery_app.conf.beat_schedule = {
    'fetch-btc-usdt-1h-every-hour': {
        'task': 'fetch_and_store_ohlcv',
        'schedule': crontab(minute='*/6'),
        'args': ('BTC/USDT', '1h'),
    },
    'fetch-btc-usdt-15m-every-15-mins': {
        'task': 'fetch_and_store_ohlcv',
        'schedule': crontab(minute='*/5'),
        'args': ('BTC/USDT', '15m'),
    },
    # --- 자동매매 봇 관리를 위한 스케줄 추가 ---
    # 'run-all-active-bots-every-minute': {
    #     'task': 'run_all_active_bots',  # 디스패처 태스크 이름
    #     'schedule': crontab(minute='*'), # 매 분마다 실행
    # },
}