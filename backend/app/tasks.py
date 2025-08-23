# file: backend/app/tasks.py
"""
Cortex 프로젝트의 모든 Celery 백그라운드 작업을 정의합니다.

이 파일은 두 가지 주요 아키텍처 패턴을 사용합니다:
1.  순수 동기(Synchronous) 태스크:
    - 대상: 백테스팅, 데이터 수집 등 안정성이 최우선인 작업.
    - 구현: Celery 태스크를 일반적인 동기 함수(def)로 작성하고, 동기 DB 세션(SyncSessionLocal)을 사용합니다.
    - 장점: Celery/OS 호환성 문제로부터 자유로우며, 코드가 단순하고 예측 가능합니다.

2.  하이브리드(Hybrid) 비동기 태스크 (`run_all_active_bots`):
    - 대상: 다수의 자동매매 봇을 동시에 처리해야 하는, 높은 I/O 동시성이 필수적인 작업.
    - 구현: Celery 태스크 자체는 동기(def)로 정의하여 안정성을 확보하고,
             내부에서 `asyncio.run()`과 `asyncio.gather`를 사용하여 실제 로직을 비동기적으로 동시에 처리합니다.
    - 장점: Celery 자체의 안정성을 유지하면서, 특정 태스크에 한해 비동기의 성능 이점을 안전하게 활용합니다.
"""

import asyncio
import time
import uuid
from datetime import datetime, timezone

import ccxt
import ccxt.async_support as ccxt_async
from celery.utils.log import get_task_logger
from sqlalchemy import select, text, update
from sqlalchemy.orm import joinedload, Session

from .celery_app import celery_app
from .database import AsyncSessionLocal, SyncSessionLocal
from . import models

logger = get_task_logger(__name__)


# ==============================================================================
# Part 1: 자동매매 봇을 위한 하이브리드 아키텍처
# ==============================================================================

async def _run_single_bot_cycle_async(bot: models.LiveBot) -> dict:
    """
    [비동기 헬퍼] 한 개의 활성 봇에 대한 거래 로직을 한 번 실행하고 결과를 반환합니다.
    이 함수는 오직 run_all_active_bots 내부의 asyncio.run() 세상에서만 사용됩니다.
    """
    try:
        # bot 객체에 이미 api_key와 strategy 관계가 로드되어 있어야 합니다.
        logger.info(f"Bot ID {bot.id}: [ASYNC] Starting trading logic cycle for strategy '{bot.strategy.name}'.")

        # TODO: 여기에 실제 비동기 자동매매 로직을 구현합니다.
        # api_key = bot.api_key.get_decrypted_api_key() # 암호화된 키 복호화
        # secret = bot.api_key.get_decrypted_secret_key()
        # exchange = ccxt_async.binance({'apiKey': api_key, 'secret': secret})
        # ticker = await exchange.fetch_ticker('BTC/USDT')
        # ... 로직 ...
        # await exchange.close()
        await asyncio.sleep(1)  # 예시: 네트워크 I/O 대기 시간 1초

        async with AsyncSessionLocal() as session:
            stmt = update(models.LiveBot).where(models.LiveBot.id == bot.id).values(last_run_at=datetime.now(timezone.utc))
            await session.execute(stmt)
            await session.commit()

        return {"bot_id": bot.id, "status": "success"}
    except Exception as e:
        logger.error(f"Bot ID {bot.id}: [ASYNC] Cycle failed: {e}", exc_info=True)
        return {"bot_id": bot.id, "status": "failed", "error": str(e)}

@celery_app.task(name="run_all_active_bots")
def run_all_active_bots():
    """
    [하이브리드 디스패처] DB에서 모든 활성 봇을 찾아 비동기적으로 동시에 실행합니다.
    """
    logger.info("Dispatcher Task: Starting to run all active bots.")

    async def _run_all_concurrently():
        bots_to_run = []
        with SyncSessionLocal() as session:
            # (수정) 'active'와 'initializing' 상태의 봇을 모두 가져옵니다.
            result = session.execute(
                select(models.LiveBot)
                .options(joinedload(models.LiveBot.strategy), joinedload(models.LiveBot.api_key))
                .filter(models.LiveBot.status.in_(['active', 'initializing']))
            )
            bots_to_run = result.scalars().all()
            
            if not bots_to_run:
                return "No active or initializing bots to run."
            
            # 상태 변경 로직: 'initializing' 봇을 'active'로 변경하고 DB에 커밋합니다.
            # 이 코드가 없으면 새로 생성된 봇은 절대 실행되지 않습니다.
            for bot in bots_to_run:
                if bot.status == 'initializing':
                    bot.status = 'active'
                    session.add(bot)
            session.commit()

        # 이제 'active' 상태가 된 봇들을 비동기적으로 실행합니다.
        bot_tasks = [_run_single_bot_cycle_async(bot) for bot in bots_to_run]
        results = await asyncio.gather(*bot_tasks, return_exceptions=True)

        success_count = sum(1 for r in results if isinstance(r, dict) and r.get("status") == "success")
        failed_count = len(results) - success_count
        logger.info(f"Dispatcher Task: Finished. Success: {success_count}, Failed: {failed_count}.")
        return f"Processed {len(bots_to_run)} bots concurrently. Success: {success_count}, Failed: {failed_count}."

    return asyncio.run(_run_all_concurrently())


# ==============================================================================
# Part 2: 그 외의 모든 작업을 위한 순수 동기(Synchronous) 태스크
# ==============================================================================

@celery_app.task(bind=True, name="fetch_and_store_ohlcv")
def fetch_and_store_ohlcv(self, ticker: str, timeframe: str, since: int = None, limit: int = 500):
    """[동기] OHLCV 데이터 수집 태스크"""
    try:
        with SyncSessionLocal() as session:
            exchange = ccxt.binance()
            logger.info(f"Starting sync OHLCV fetch for {ticker} ({timeframe})")
            ohlcv = exchange.fetch_ohlcv(ticker, timeframe, since=since, limit=limit)

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

            session.execute(sql_query, data_to_insert)
            session.commit()
            
            success_message = f"Successfully stored {len(data_to_insert)} OHLCV records for {ticker} ({timeframe})."
            logger.info(success_message)
            return success_message
    except ccxt.NetworkError as e:
        logger.error(f"CCXT Network Error for {ticker}. Retrying in 60s...", exc_info=False)
        self.retry(exc=e, countdown=60)
    except Exception as e:
        logger.error(f"Unhandled exception in fetch_and_store_ohlcv: {e}", exc_info=True)
        raise

@celery_app.task(bind=True, default_retry_delay=300, max_retries=3, name="run_backtest")
def run_backtest(self, backtest_id: str):
    """[동기] 백테스팅 실행 태스크 (견고한 예외 처리 포함)"""
    try:
        with SyncSessionLocal() as session:
            backtest_uuid = uuid.UUID(backtest_id)
            result = session.execute(select(models.Backtest).filter(models.Backtest.id == backtest_uuid))
            backtest = result.scalar_one_or_none()

            if not backtest or backtest.status in ['completed', 'failed', 'canceled']:
                return f"Backtest {backtest_id} is already finished, canceled, or does not exist."

            backtest.status = 'running'
            backtest.updated_at = datetime.now(timezone.utc)
            session.commit()

            logger.info(f"Simulating backtest ID {backtest_id}...")
            # TODO: 여기에 실제 백테스팅 시뮬레이션 로직 구현 (CPU-bound)
            time.sleep(10)

            backtest.status = 'completed'
            backtest.completed_at = datetime.now(timezone.utc)
            session.commit()

            return f"Backtest ID {backtest_id} completed successfully."
    except Exception as exc:
        logger.error(f"Unhandled exception in run_backtest for ID {backtest_id}: {exc}", exc_info=True)
        # 재시도하기 전에 실패 상태를 먼저 DB에 기록합니다.
        try:
            with SyncSessionLocal() as fail_session:
                backtest_uuid = uuid.UUID(backtest_id)
                stmt = update(models.Backtest).where(models.Backtest.id == backtest_uuid).values(status='failed')
                fail_session.execute(stmt)
                fail_session.commit()
        except Exception as db_exc:
            logger.error(f"CRITICAL: Failed to update backtest status to 'failed' for ID {backtest_id}: {db_exc}")
        
        # 재시도를 요청합니다. 모든 재시도가 실패하면, on_failure 핸들러(celery_app.py)가 호출될 수 있습니다.
        self.retry(exc=exc)