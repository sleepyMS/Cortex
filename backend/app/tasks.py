# file: backend/app/tasks.py

import asyncio
from celery.utils.log import get_task_logger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from sqlalchemy.orm import joinedload
from datetime import datetime, timezone
import uuid
import ccxt.async_support as ccxt

from .celery_app import celery_app
from .database import engine, AsyncSessionLocal # database.py에서 engine을 임포트합니다.
from . import models, schemas
from .services.signal_service import signal_service

logger = get_task_logger(__name__)


# ==============================================================================
# 1. 실제 비동기 로직과 리소스 정리를 모두 담당하는 헬퍼 함수들
#    - try...finally 구문을 사용하여 로직 실행 후 반드시 리소스를 정리합니다.
# ==============================================================================

async def _fetch_and_store_ohlcv(self, ticker: str, timeframe: str, since: int = None, limit: int = 500):
    """OHLCV 데이터를 저장하고 DB 커넥션 풀을 정리하는 비동기 로직"""
    exchange = ccxt.binance()
    try:
        async with AsyncSessionLocal() as session:
            logger.info(f"Starting async OHLCV fetch for {ticker} ({timeframe})")
            ohlcv = await exchange.fetch_ohlcv(ticker, timeframe, since=since, limit=limit)

            if not ohlcv:
                logger.warning(f"No OHLCV data returned for {ticker} ({timeframe}).")
                return "No data received"

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
            await session.commit()
            
            success_message = f"Successfully stored {len(data_to_insert)} OHLCV records for {ticker} ({timeframe})."
            logger.info(success_message)
            return success_message
            
    except ccxt.NetworkError:
        # 네트워크 에러는 래퍼 함수에서 재시도 처리하도록 다시 발생시킵니다.
        raise
    finally:
        # [핵심] 모든 작업이 끝나면, 같은 이벤트 루프 안에서 리소스를 정리합니다.
        await exchange.close()
        logger.debug("Disposing database engine connection pool...")
        await engine.dispose()


async def _run_backtest(backtest_id: str):
    """백테스팅을 실행하고 DB 커넥션 풀을 정리하는 비동기 로직"""
    backtest_uuid = uuid.UUID(backtest_id)
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(models.Backtest).filter(models.Backtest.id == backtest_uuid))
            backtest = result.scalar_one_or_none()

            if not backtest or backtest.status in ['completed', 'failed', 'canceled']:
                warning_message = f"Backtest {backtest_id} is already finished or does not exist."
                logger.warning(warning_message)
                return warning_message

            backtest.status = 'running'
            backtest.updated_at = datetime.now(timezone.utc)
            await session.commit()
            
            logger.info(f"Simulating backtest ID {backtest_id}...")
            # TODO: 실제 백테스팅 시뮬레이션 로직 구현
            await asyncio.sleep(5) 
            
            backtest.status = 'completed'
            backtest.completed_at = datetime.now(timezone.utc)
            await session.commit()
            
            success_message = f"Backtest ID {backtest_id} completed successfully."
            logger.info(success_message)
            return success_message
    finally:
        logger.debug(f"Disposing database engine connection pool for backtest {backtest_id}...")
        await engine.dispose()


async def _run_live_bot(bot_id: str):
    """자동매매 봇을 실행하고 DB 커넥션 풀을 정리하는 비동기 로직"""
    bot_uuid = uuid.UUID(bot_id)
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(models.LiveBot)
                .options(joinedload(models.LiveBot.strategy), joinedload(models.LiveBot.api_key))
                .filter(models.LiveBot.id == bot_uuid)
            )
            bot = result.scalar_one_or_none()

            if not bot or bot.status == 'stopped':
                warning_message = f"LiveBot task for bot ID {bot_id} is stopping or bot not found."
                logger.warning(warning_message)
                return warning_message

            if bot.status != 'active':
                bot.status = 'active'
                await session.commit()
            
            logger.info(f"LiveBot ID {bot_id}: Starting main trading loop for strategy '{bot.strategy.name}'.")

            # TODO: 실제 자동매매 로직 구현
            logger.info(f"LiveBot ID {bot_id}: Executing trading logic cycle...")
            
            bot.last_run_at = datetime.now(timezone.utc)
            await session.commit()
            
            success_message = f"LiveBot ID {bot_id} cycle finished."
            logger.info(success_message)
            return success_message
    finally:
        logger.debug(f"Disposing database engine connection pool for live_bot {bot_id}...")
        await engine.dispose()


# ==============================================================================
# 2. 모든 비동기 처리를 위임하는 단순한 동기 래퍼 태스크
# ==============================================================================

@celery_app.task(bind=True, name="fetch_and_store_ohlcv")
def fetch_and_store_ohlcv(self, ticker: str, timeframe: str, since: int = None, limit: int = 500):
    """동기 래퍼: _fetch_and_store_ohlcv 비동기 함수를 실행합니다."""
    try:
        return asyncio.run(_fetch_and_store_ohlcv(self, ticker, timeframe, since, limit))
    except ccxt.NetworkError as e:
        logger.error(f"CCXT Network Error for {ticker}. Retrying in 60s...", exc_info=False)
        self.retry(exc=e, countdown=60)
    except Exception as e:
        logger.error(f"Unhandled exception in fetch_and_store_ohlcv wrapper: {e}", exc_info=True)
        raise


@celery_app.task(bind=True, default_retry_delay=300, max_retries=3, name="run_backtest")
def run_backtest(self, backtest_id: str):
    """동기 래퍼: _run_backtest 비동기 함수를 실행합니다."""
    try:
        return asyncio.run(_run_backtest(backtest_id))
    except Exception as exc:
        logger.error(f"Unhandled exception in run_backtest wrapper for ID {backtest_id}: {exc}", exc_info=True)
        raise


@celery_app.task(bind=True, default_retry_delay=60, max_retries=3, name="run_live_bot")
def run_live_bot(self, bot_id: str):
    """동기 래퍼: _run_live_bot 비동기 함수를 실행합니다."""
    try:
        return asyncio.run(_run_live_bot(bot_id))
    except Exception as exc:
        logger.error(f"Unhandled exception in run_live_bot wrapper for ID {bot_id}: {exc}", exc_info=True)
        self.retry(exc=exc)