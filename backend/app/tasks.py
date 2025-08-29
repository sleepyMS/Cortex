# file: backend/app/tasks.py
"""
Cortex 프로젝트의 모든 Celery 백그라운드 작업을 정의합니다.

이 파일은 CPU 바운드 작업과 I/O 바운드 작업을 분리하여 처리하는
고성능 아키텍처를 따릅니다. 각 작업은 지정된 전용 큐에서 실행됩니다.

- CPU-Bound Tasks (run_backtest):
  - 'cpu_bound_queue'에서 실행됩니다.
  - 무거운 계산(백테스팅 시뮬레이션)을 담당하며, 멀티코어 활용을 위해
    별도의 프로세스 기반 워커에서 처리됩니다.

- I/O-Bound Tasks (run_all_active_bots, fetch_and_store_ohlcv):
  - 'io_bound_queue'에서 실행됩니다.
  - 네트워크 통신, DB 조회 등 대기 시간이 긴 작업을 담당하며,
    단일 프로세스 내 수많은 동시성을 처리하기 위해 eventlet/gevent 기반 워커에서 처리됩니다.
"""

import asyncio
import time
import uuid
from datetime import datetime, timezone

import ccxt
import ccxt.async_support as ccxt_async
from celery.utils.log import get_task_logger
from sqlalchemy import select, text, update
from sqlalchemy.orm import joinedload

# --- 1. 필요한 모듈 및 서비스 임포트 ---
from .celery_app import celery_app
from .database import AsyncSessionLocal, SyncSessionLocal

from . import models, schemas
from .engine.backtesting_engine import BacktestingEngine
from .utils.communication import WebSocketManager, EventPublisher
from .services.market_data_service import market_data_service
from .services.signal_service import signal_service


logger = get_task_logger(__name__)


# ==============================================================================
# Part 1: I/O-Bound Tasks (자동매매, 데이터 수집 등)
# ==============================================================================

async def _run_single_bot_cycle_async(bot: models.LiveBot) -> dict:
    """
    [비동기 헬퍼] 한 개의 활성 봇에 대한 거래 로직을 한 번 실행하고 결과를 반환합니다.
    이 함수는 오직 run_all_active_bots 내부의 asyncio.run() 세상에서만 사용됩니다.
    """
    try:
        logger.info(f"Bot ID {bot.id}: [ASYNC] Starting trading logic cycle for strategy '{bot.strategy.name}'.")
        
        # TODO: 여기에 실제 비동기 자동매매 로직을 구현합니다.
        await asyncio.sleep(1)  # 예시: 네트워크 I/O 대기 시간 1초

        async with AsyncSessionLocal() as session:
            stmt = update(models.LiveBot).where(models.LiveBot.id == bot.id).values(last_run_at=datetime.now(timezone.utc))
            await session.execute(stmt)
            await session.commit()

        return {"bot_id": bot.id, "status": "success"}
    except Exception as e:
        logger.error(f"Bot ID {bot.id}: [ASYNC] Cycle failed: {e}", exc_info=True)
        return {"bot_id": bot.id, "status": "failed", "error": str(e)}

@celery_app.task(name="run_all_active_bots", queue="io_bound_queue")
def run_all_active_bots():
    """
    [하이브리드 디스패처] 모든 활성 봇을 찾아 비동기적으로 동시에 실행합니다.
    """
    logger.info("Dispatcher Task: Starting to run all active bots.")

    async def _run_all_concurrently():
        bots_to_run = []
        with SyncSessionLocal() as session:
            result = session.execute(
                select(models.LiveBot)
                .options(joinedload(models.LiveBot.strategy), joinedload(models.LiveBot.api_key))
                .filter(models.LiveBot.status.in_(['active', 'initializing']))
            )
            bots_to_run = result.scalars().all()
            
            if not bots_to_run:
                return "No active or initializing bots to run."
            
            for bot in bots_to_run:
                if bot.status == 'initializing':
                    bot.status = 'active'
                    session.add(bot)
            session.commit()

        bot_tasks = [_run_single_bot_cycle_async(bot) for bot in bots_to_run]
        results = await asyncio.gather(*bot_tasks, return_exceptions=True)

        success_count = sum(1 for r in results if isinstance(r, dict) and r.get("status") == "success")
        failed_count = len(results) - success_count
        logger.info(f"Dispatcher Task: Finished. Success: {success_count}, Failed: {failed_count}.")
        return f"Processed {len(bots_to_run)} bots concurrently. Success: {success_count}, Failed: {failed_count}."

    return asyncio.run(_run_all_concurrently())


@celery_app.task(bind=True, name="fetch_and_store_ohlcv", queue="io_bound_queue")
def fetch_and_store_ohlcv(self, ticker: str, timeframe: str, since: int = None, limit: int = 500):
    """[동기] OHLCV 데이터 수집 태스크 (네트워크 I/O 위주)"""
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
        logger.warning(f"CCXT Network Error for {ticker}. Retrying in 60s...", exc_info=False)
        self.retry(exc=e, countdown=60)
    except Exception as e:
        logger.error(f"Unhandled exception in fetch_and_store_ohlcv: {e}", exc_info=True)
        raise self.retry(exc=e)


# ==============================================================================
# Part 2: CPU-Bound Tasks (백테스팅, 최적화 등)
# ==============================================================================

@celery_app.task(bind=True, name="run_backtest", queue="cpu_bound_queue")
def run_backtest(self, backtest_id: str):
    """
    [최종 오케스트레이터] '전략 스냅샷' 기반 백테스팅의 전체 과정을 조율합니다.
    """
    logger.info(f"Starting backtest orchestration for ID: {backtest_id}")
    backtest_uuid = uuid.UUID(backtest_id)
    session = None

    try:
        # --- 단계 1: 초기 설정 및 상태 업데이트 ---
        WebSocketManager.send_status_update(backtest_id, "running", "백테스트를 시작합니다.", 5)
        
        session = SyncSessionLocal()

        backtest = session.query(models.Backtest).filter(
            models.Backtest.id == backtest_uuid
        ).one_or_none()
        
        if not backtest:
            raise ValueError(f"Backtest {backtest_id} not found.")

        if backtest.status != 'pending':
            logger.warning(f"Backtest {backtest_id} not pending (current: {backtest.status}). Aborting.")
            session.close()
            return
            
        backtest.status = 'running'
        session.commit()
        
        execution_params = backtest.parameters
        snapshot_as_strategy = schemas.StrategyCreate(**backtest.strategy_snapshot)

        # --- 단계 2: 매매 신호 생성 ---
        # [수정] 이제 signal_service는 (DataFrame, 계산기준_타임프레임) 튜플을 반환합니다.
        WebSocketManager.send_status_update(backtest_id, "running", "전략에 따른 매매 신호를 생성 중입니다...", 25)
        signals_df, calculation_base_tf = asyncio.run(
            signal_service.generate_signals(
                request=snapshot_as_strategy
            )
        )
        logger.info(f"Backtest {backtest_id}: Signals generated on '{calculation_base_tf}' timeframe.")

        # --- 단계 3: 시세 데이터 로드 ---
        # [수정] 신호가 계산된 '기준 타임프레임'으로 OHLCV 데이터를 가져옵니다.
        WebSocketManager.send_status_update(backtest_id, "running", f"시세 데이터를 로드하고 있습니다 ({calculation_base_tf})...", 50)
        
        ticker = snapshot_as_strategy.target_coins[0].ticker if snapshot_as_strategy.target_coins else "BTC/USDT"
        
        ohlcv_df = market_data_service.get_historical_data_sync(
            ticker=ticker,
            timeframe=calculation_base_tf, # <<< [핵심 수정]
            start_date=datetime.fromisoformat(execution_params['start_date']),
            end_date=datetime.fromisoformat(execution_params['end_date'])  
        )

        if ohlcv_df.empty:
            raise ValueError("시세 데이터를 로드할 수 없습니다. 기간이나 티커를 확인해주세요.")

        # --- 단계 4: 백테스팅 엔진 실행 ---
        WebSocketManager.send_status_update(backtest_id, "running", "거래를 시뮬레이션하고 있습니다...", 75)
        
        engine = BacktestingEngine(
            ohlcv_df=ohlcv_df, 
            signals_df=signals_df, 
            execution_params=execution_params,
            strategy_params=snapshot_as_strategy 
        )

        summary, trade_logs = engine.run()

        # --- 단계 5: 결과 저장 ---
        WebSocketManager.send_status_update(backtest_id, "running", "분석 결과를 데이터베이스에 저장 중입니다...", 90)
        
        session.query(models.BacktestResult).filter_by(backtest_id=backtest_uuid).delete(synchronize_session=False)
        session.query(models.TradeLog).filter_by(backtest_id=backtest_uuid).delete(synchronize_session=False)
        session.flush()

        new_result = models.BacktestResult(backtest_id=backtest_uuid, **summary)
        session.add(new_result)
        
        if trade_logs:
            log_objects = [models.TradeLog(backtest_id=backtest_uuid, **log) for log in trade_logs]
            session.add_all(log_objects)

        backtest_to_update = session.query(models.Backtest).filter(models.Backtest.id == backtest_uuid).one()
        backtest_to_update.status = 'completed'
        backtest_to_update.completed_at = datetime.now(timezone.utc)
        session.commit()

        # --- 단계 6: 완료 알림 ---
        user_id_str = str(backtest_to_update.user_id)
        EventPublisher.publish_backtest_event(
            "BacktestCompleted", 
            {"backtest_id": backtest_id, "user_id": user_id_str}
        )
        WebSocketManager.send_status_update(backtest_id, "completed", "백테스트가 성공적으로 완료되었습니다.", 100)

        logger.info(f"Backtest {backtest_id} completed successfully.")
        return f"Backtest ID {backtest_id} completed successfully."

    except Exception as exc:
        logger.error(f"Exception in run_backtest for ID {backtest_id}: {exc}", exc_info=True)
        
        user_id_on_fail = str(backtest.user_id) if 'backtest' in locals() and backtest else "unknown"
        EventPublisher.publish_backtest_event(
            "BacktestFailed", 
            {"backtest_id": backtest_id, "user_id": user_id_on_fail, "error": str(exc)}
        )
        WebSocketManager.send_status_update(backtest_id, "failed", f"오류가 발생했습니다: {str(exc)}", 100)
        
        if session:
            try:
                failed_backtest = session.query(models.Backtest).filter(models.Backtest.id == backtest_uuid).one_or_none()
                if failed_backtest and failed_backtest.status == 'running':
                    failed_backtest.status = 'failed'
                    session.commit()
            except Exception as db_exc:
                 logger.error(f"Failed to update backtest status to 'failed' for {backtest_id}: {db_exc}")

        raise self.retry(exc=exc, countdown=60, max_retries=2)

    finally:
        if session:
            session.close()