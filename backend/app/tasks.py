# file: backend/app/tasks.py

from celery import Celery
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
import logging
from datetime import datetime, timezone
import uuid
import asyncio
from .services.market_data_service import market_data_service
from .services.signal_service import signal_service

from sqlalchemy.orm import joinedload

import ccxt.async_support as ccxt

from .celery_app import celery_app
from .database import AsyncSessionLocal
from . import models
from .security import decrypt_data
from . import schemas

logger = logging.getLogger(__name__)

ALLOWED_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"]

async def _db_task_wrapper(task_func, *args, **kwargs):
    """Celery Task 내에서 비동기 DB 세션을 안전하게 사용하기 위한 래퍼"""
    async with AsyncSessionLocal() as session:
        async with session.begin():
            await task_func(session, *args, **kwargs)

@celery_app.task(bind=True, name="fetch_and_store_ohlcv")
def fetch_and_store_ohlcv_task(self, ticker: str, timeframe: str, since: int = None, limit: int = 500):
    """CCXT 비동기 호출을 사용하여 OHLCV 데이터를 저장하는 Celery Task"""
    async def _async_run(session: AsyncSession, ticker: str, timeframe: str, since: int, limit: int):
        if timeframe not in ALLOWED_TIMEFRAMES:
            logger.error(f"Unsupported timeframe: {timeframe}")
            return
        logger.info(f"Starting async OHLCV fetch for {ticker} ({timeframe})")
        exchange = ccxt.binance()
        try:
            ohlcv = await exchange.fetch_ohlcv(ticker, timeframe, since=since, limit=limit)
            if not ohlcv:
                logger.warning(f"No OHLCV data returned for {ticker} ({timeframe}).")
                return
            table_name = f"ohlcv_{timeframe}"
            sql_query = text(f"""
                INSERT INTO {table_name} (time, ticker, open, high, low, close, volume)
                VALUES (:time, :ticker, :open, :high, :low, :close, :volume)
                ON CONFLICT (time, ticker) DO UPDATE SET
                    open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
                    close = EXCLUDED.close, volume = EXCLUDED.volume;
            """)
            data_to_insert = [
                {"time": datetime.fromtimestamp(item[0] / 1000, tz=timezone.utc), "ticker": ticker, 
                 "open": item[1], "high": item[2], "low": item[3], "close": item[4], "volume": item[5]}
                for item in ohlcv
            ]
            await session.execute(sql_query, data_to_insert)
            logger.info(f"Successfully stored {len(data_to_insert)} OHLCV records for {ticker} ({timeframe}).")
        except ccxt.NetworkError as e:
            logger.error(f"CCXT Network Error for {ticker}: {e}", exc_info=True)
            self.retry(exc=e)
        finally:
            await exchange.close()

    asyncio.run(_db_task_wrapper(_async_run, ticker, timeframe, since, limit))

@celery_app.task(bind=True, default_retry_delay=300, max_retries=3, name="run_backtest")
def run_backtest_task(self, backtest_id: uuid.UUID):
    """실제 백테스팅 시뮬레이션을 비동기로 실행하는 Celery 태스크."""
    async def _async_run(session: AsyncSession, backtest_id: uuid.UUID):
        result = await session.execute(select(models.Backtest).filter(models.Backtest.id == backtest_id))
        backtest = result.scalar_one_or_none()

        if not backtest or backtest.status in ['completed', 'failed', 'canceled']:
            return

        backtest.status = 'running'
        backtest.updated_at = datetime.now(timezone.utc)
        
        logger.info(f"Simulating backtest ID {backtest_id}...")
        await asyncio.sleep(5) 
        
        backtest.status = 'completed'
        backtest.completed_at = datetime.now(timezone.utc)
        logger.info(f"Backtest ID {backtest_id} completed successfully.")

    async def _update_status_on_error(session: AsyncSession, backtest_id: uuid.UUID):
        result = await session.execute(select(models.Backtest).filter(models.Backtest.id == backtest_id))
        backtest = result.scalar_one_or_none()
        if backtest and backtest.status == 'running':
            backtest.status = 'failed'
            backtest.completed_at = datetime.now(timezone.utc)
    
    try:
        asyncio.run(_db_task_wrapper(_async_run, backtest_id))
    except Exception as exc:
        logger.error(f"Backtest ID {backtest_id} encountered an error: {exc}", exc_info=True)
        asyncio.run(_db_task_wrapper(_update_status_on_error, backtest_id))
        raise

@celery_app.task(bind=True, default_retry_delay=60, max_retries=3, name="run_live_bot")
def run_live_bot_task(self, bot_id: uuid.UUID):
    """자동매매 봇의 메인 루프를 비동기로 실행하는 Celery 태스크."""

    async def _async_run(session: AsyncSession, bot_id: uuid.UUID):
        # 봇과 관련 전략 정보를 함께 로드 (Eager Loading)
        result = await session.execute(
            select(models.LiveBot)
            .options(
                joinedload(models.LiveBot.strategy),
                joinedload(models.LiveBot.api_key)
            )
            .filter(models.LiveBot.id == bot_id)
        )
        bot = result.scalar_one_or_none()

        if not bot or bot.status == 'stopped':
            logger.warning(f"LiveBot task for bot ID {bot_id} is stopping or bot not found.")
            return

        if bot.status != 'active':
            bot.status = 'active'
            await session.commit()
        
        logger.info(f"LiveBot ID {bot_id}: Starting main trading loop for strategy '{bot.strategy.name}'.")

        # TODO: api_key 복호화 및 거래소 클라이언트 초기화 (비동기)
        # api_key = decrypt_data(bot.api_key.api_key_encrypted)
        # secret_key = decrypt_data(bot.api_key.secret_key_encrypted)
        # exchange = ccxt.binance({'apiKey': api_key, 'secret': secret_key})

        while True:
            # 1. 루프 시작 시 DB에서 최신 봇 상태 확인
            await session.refresh(bot)
            
            if bot.status == 'paused':
                logger.info(f"LiveBot ID {bot_id} is paused. Waiting for 30 seconds...")
                await asyncio.sleep(30)
                continue
            elif bot.status in ['stopped', 'error']:
                logger.info(f"LiveBot ID {bot_id} received command '{bot.status}'. Exiting loop.")
                break

            # 2. 실제 트레이딩 로직 실행
            try:
                logger.info(f"LiveBot ID {bot_id}: Executing trading logic cycle...")
                strategy_payload = schemas.SignalCalculationRequest(
                    ticker=bot.ticker,
                    timeframe=bot.timeframe,
                    long_entry_rules=bot.strategy.long_entry_rules,
                    long_exit_rules=bot.strategy.long_exit_rules,
                    short_entry_rules=bot.strategy.short_entry_rules,
                    short_exit_rules=bot.strategy.short_exit_rules,
                )
                
                # 3. 최신 데이터로 신호 계산
                signals_response = await signal_service.generate_signals(db=session, request=strategy_payload)
                
                # TODO: 4. 신호 기반으로 주문 실행 로직 구현
                # if signals_response.signals:
                #    latest_signal = signals_response.signals[-1]
                #    # 포지션 관리 및 주문 실행 (e.g., await exchange.create_order(...))
                #    logger.info(f"LiveBot ID {bot_id}: Signal '{latest_signal.signal_type}' detected at {latest_signal.time}.")

                bot.last_run_at = datetime.now(timezone.utc)
                await session.commit()

            except Exception as e:
                logger.error(f"LiveBot ID {bot_id}: Error during trading logic execution: {e}", exc_info=True)
                # 일시적인 오류일 수 있으므로 루프는 계속 진행

            # 5. 다음 캔들을 위해 대기 (타임프레임에 맞춰 조절 필요)
            await asyncio.sleep(60)

        # 루프 종료 후 최종 상태 업데이트
        if bot.status != 'error':
            bot.status = 'stopped'
        bot.stopped_at = datetime.now(timezone.utc)
        await session.commit()
        logger.info(f"LiveBot ID {bot_id} gracefully stopped.")

    # Task 에러 발생 시 봇 상태를 'error'로 변경하는 로직
    async def _update_status_on_error(session: AsyncSession, bot_id: uuid.UUID):
        result = await session.execute(select(models.LiveBot).filter(models.LiveBot.id == bot_id))
        bot = result.scalar_one_or_none()
        if bot and bot.status not in ['stopped', 'error']:
            bot.status = 'error'
            bot.stopped_at = datetime.now(timezone.utc)
            await session.commit()
    
    try:
        # 비동기 Task 실행
        asyncio.run(_db_task_wrapper(_async_run, bot_id))
    except Exception as exc:
        logger.error(f"LiveBot ID {bot_id} encountered a critical unhandled error: {exc}", exc_info=True)
        asyncio.run(_db_task_wrapper(_update_status_on_error, bot_id))
        self.retry(exc=exc) # Celery가 재시도하도록 예외 발생