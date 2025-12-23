# file: backend/app/celery_beat.py

from .celery_app import celery_app
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'fetch-btc-usdt-1h-every-hour': {
        'task': 'fetch_and_store_ohlcv',
        'schedule': crontab(minute='*/60'),
        'args': ('BTCUSDT', '1h'),
    },
    'fetch-btc-usdt-5m-every-5-mins': {
        'task': 'fetch_and_store_ohlcv',
        'schedule': crontab(minute='*/5'),
        'args': ('BTCUSDT', '5m'),
    },
    'fetch-btc-usdt-15m-every-15-mins': {
        'task': 'fetch_and_store_ohlcv',
        'schedule': crontab(minute='*/15'),
        'args': ('BTCUSDT', '15m'),
    },
    'process-daily-recurring-payments': {
        'task': 'process_daily_recurring_payments',
        'schedule': crontab(hour=0, minute=0),  # 매일 오전 0시 KST
    },
    'collect-bot-snapshots-hourly': {
        'task': 'collect_bot_performance_snapshots',
        'schedule': crontab(minute='*'), 
    },
    # 'collect-bot-snapshots-hourly': {
    #     'task': 'collect_bot_performance_snapshots',
    #     'schedule': crontab(minute=0),  # 매시 정각
    # },
    # --- 자동매매 봇 관리를 위한 스케줄 추가 ---
    'run-all-active-bots-every-minute': {
        'task': 'run_all_active_bots',
        'schedule': crontab(minute='*'),
    },
    # --- AI 모델 재학습 점검 ---
    'check-and-retrain-ai-models-daily': {
        'task': 'app.tasks_ai.check_and_retrain_models',
        'schedule': crontab(hour=3, minute=0), # 매일 새벽 3시
    },
}