# file: backend/app/celery_beat.py

from .celery_app import celery_app
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    'fetch-btc-usdt-1h-every-hour': {
        'task': 'fetch_and_store_ohlcv',
        'schedule': crontab(minute=2, hour='*'),
        'args': ('BTC/USDT', '1h'),
    },
    'fetch-btc-usdt-15m-every-15-mins': {
        'task': 'fetch_and_store_ohlcv',
        'schedule': crontab(minute='*/15'),
        'args': ('BTC/USDT', '15m'),
    },
}