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
from .models import BacktestStatus

from . import models, schemas
from .engine.backtesting_engine import BacktestingEngine
from .utils.communication import WebSocketManager, EventPublisher
from .event_bus import publish_event
from .services.market_data_service import market_data_service
from .services.signal_service import signal_service
from .services.marketplace_service import marketplace_service
from .services.notification_service import notification_service 
from .services.subscription_service import subscription_service



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
    
@celery_app.task(name="fulfill_order_task", queue="io_bound_queue")
def fulfill_order_task(order_id: str, gateway_transaction_id: str):
    """ 결제가 완료된 주문에 대해 자산을 지급하는 I/O-Bound Task"""
    logger.info(f"Starting fulfillment for order ID: {order_id}")
    
    async def _fulfill():
        async with AsyncSessionLocal() as session:
            try:
                # 실제 비즈니스 로직은 marketplace_service에 위임
                await marketplace_service.fulfill_order(session, uuid.UUID(order_id), gateway_transaction_id)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Critical error fulfilling order {order_id}: {e}", exc_info=True)
                # Task 실패 시, celery_app.py의 DatabaseTask가 DB 상태를 'failed'로 처리해 줄 수 있음
                raise

    return asyncio.run(_fulfill())


# ==============================================================================
# Part 2: CPU-Bound Tasks (백테스팅, 최적화 등)
# ==============================================================================

@celery_app.task(bind=True, name="run_backtest", queue="cpu_bound_queue", acks_late=True)
def run_backtest(self, backtest_id: str):
    """
    [최종 안정화 버전] '전략 스냅샷' 기반 백테스팅의 전체 과정을 조율합니다.
    경쟁 상태를 해결하기 위한 내부 대기 루프를 포함합니다.
    """
    logger.info(f"Starting backtest orchestration for ID: {backtest_id}")
    backtest_uuid = uuid.UUID(backtest_id)
    session = SyncSessionLocal()
    backtest = None 

    try:
        # --- 단계 1: 경쟁 상태 해결을 위한 DB 조회 및 대기 루프 ---
        MAX_RETRIES = 5
        RETRY_DELAY_SECONDS = 2
        for attempt in range(MAX_RETRIES):
            backtest = session.query(models.Backtest).filter(models.Backtest.id == backtest_uuid).one_or_none()
            if backtest:
                logger.info(f"Backtest {backtest_id} found in DB on attempt {attempt + 1}.")
                break
            
            logger.warning(f"Backtest {backtest_id} not found on attempt {attempt + 1}. Retrying in {RETRY_DELAY_SECONDS}s...")
            time.sleep(RETRY_DELAY_SECONDS)
        
        if not backtest:
            raise ValueError(f"Backtest ID {backtest_id} not found in the database after {MAX_RETRIES} attempts.")
        
        # --- 단계 2: 초기 설정 및 상태 업데이트 ---
        WebSocketManager.send_status_update(backtest_id, "running", "백테스트 초기화 중...", 5)
        
        if backtest.status != BacktestStatus.PENDING:
            logger.warning(f"Backtest {backtest_id} is not in 'pending' state (current: {backtest.status}). Aborting task.")
            return f"Task aborted: Backtest status was '{backtest.status}'."
            
        backtest.status = BacktestStatus.RUNNING
        session.commit()
        
        # DB에 저장된 파라미터와 전략 스냅샷을 Pydantic 스키마로 변환
        params_from_db = schemas.BacktestParametersPayload.model_validate(backtest.parameters)
        snapshot_as_strategy = schemas.StrategyForSnapshot.model_validate(backtest.strategy_snapshot)

        # --- 단계 3: 매매 신호 생성 ---
        WebSocketManager.send_status_update(backtest_id, "running", "매매 신호 생성 중...", 25)
        signals_df, calculation_base_tf = asyncio.run(signal_service.generate_signals(request=snapshot_as_strategy))
        logger.info(f"Backtest {backtest_id}: Signals generated on '{calculation_base_tf}' timeframe.")

        # --- 단계 4: 시세 데이터 로드 ---
        WebSocketManager.send_status_update(backtest_id, "running", f"{calculation_base_tf} 시세 데이터 로딩 중...", 50)
        
        # target_coins가 비어있을 경우를 대비한 기본값 설정
        ticker = snapshot_as_strategy.target_coins[0].ticker if snapshot_as_strategy.target_coins else "BTC/USDT"
        
        ohlcv_df = market_data_service.get_historical_data_sync(
            ticker=ticker,
            timeframe=calculation_base_tf,
            start_date=params_from_db.start_date, 
            end_date=params_from_db.end_date   
        )
        if ohlcv_df.empty:
            raise ValueError("시세 데이터를 로드할 수 없습니다. 기간이나 티커를 확인해주세요.")

        # --- 단계 5: 백테스팅 엔진 실행 ---
        WebSocketManager.send_status_update(backtest_id, "running", "거래를 시뮬레이션하고 있습니다...", 75)
        
        engine = BacktestingEngine(
            ohlcv_df=ohlcv_df, 
            signals_df=signals_df, 
            initial_capital=params_from_db.initial_capital,
            execution_params=params_from_db.parameters,
            strategy_params=schemas.StrategyCreate.model_validate(snapshot_as_strategy.model_dump())
        )

        summary, trade_logs = engine.run()

        # --- 단계 6: 결과 저장 ---
        WebSocketManager.send_status_update(backtest_id, "running", "결과 저장 중...", 90)
        
        # 기존 결과가 있다면 삭제 (재실행 대비)
        session.query(models.BacktestResult).filter_by(backtest_id=backtest_uuid).delete()
        session.query(models.TradeLog).filter_by(backtest_id=backtest_uuid).delete()
        session.flush()

        # 새 결과 및 거래 기록 저장
        new_result = models.BacktestResult(backtest_id=backtest_uuid, **summary)
        session.add(new_result)
        
        if trade_logs:
            log_objects = [models.TradeLog(backtest_id=backtest_uuid, **log) for log in trade_logs]
            session.add_all(log_objects)

        # 최종 상태 업데이트
        backtest.status = BacktestStatus.COMPLETED
        backtest.completed_at = datetime.now(timezone.utc)
        session.commit()

        # --- 단계 7: 완료 이벤트 발행 ---
        publish_event(
            "backtest.completed", 
            {"backtest_id": backtest_id, "user_id": str(backtest.user_id)}
        )
        WebSocketManager.send_status_update(backtest_id, "completed", "백테스트가 성공적으로 완료되었습니다.", 100)
        logger.info(f"Backtest {backtest_id} completed successfully.")
        return f"Backtest ID {backtest_id} completed successfully."

    except Exception as exc:
        logger.error(f"Exception in run_backtest for ID {backtest_id}: {exc}", exc_info=True)
        user_id_on_fail = str(backtest.user_id) if backtest else "unknown"
        
        # --- 예외 발생 시 실패 이벤트 발행 ---
        publish_event(
            "backtest.failed", 
            {"backtest_id": backtest_id, "user_id": user_id_on_fail, "error": str(exc)}
        )
        WebSocketManager.send_status_update(backtest_id, "failed", f"오류가 발생했습니다: {str(exc)}", 100)
        
        # celery_app.py의 on_failure 핸들러가 DB 상태를 최종적으로 'failed'로 업데이트하지만,
        # 즉각적인 상태 변경을 위해 여기서도 시도
        try:
            if backtest and backtest.status == BacktestStatus.RUNNING:
                backtest.status = BacktestStatus.FAILED
                session.commit()
        except Exception as db_exc:
            logger.error(f"Failed to update backtest status to 'failed' for {backtest_id}: {db_exc}")

        # Celery의 재시도 로직에 예외를 전달
        raise self.retry(exc=exc, countdown=60, max_retries=2)

    finally:
        if session:
            session.close()

# ==============================================================================
# Part 3: Event-Driven Tasks (신규 섹션)
# ==============================================================================

# --- 이벤트 구독자 (Subscribers) ---

@celery_app.task(name="send_purchase_notification_task", queue="io_bound_queue")
def send_purchase_notification_task(order_id: str, buyer_id: str):
    """'order.fulfilled' 이벤트를 구독하여 구매 완료 알림을 보냅니다."""
    logger.info(f"Event received: Sending purchase notification for order {order_id}")
    async def _send():
        async with AsyncSessionLocal() as session:
            await notification_service.send_purchase_confirmation(session, order_id)
    return asyncio.run(_send())

@celery_app.task(name="send_backtest_notification_task", queue="io_bound_queue")
def send_backtest_notification_task(event_name: str, payload: dict):
    """'backtest.completed' 또는 'backtest.failed' 이벤트를 구독하여 알림을 보냅니다."""
    backtest_id = payload.get("backtest_id")
    logger.info(f"Event received: Sending backtest notification for {backtest_id} ({event_name})")
    async def _send():
        async with AsyncSessionLocal() as session:
            if event_name == "backtest.completed":
                await notification_service.send_backtest_completed_notification(session, backtest_id)
            elif event_name == "backtest.failed":
                # notification_service에 실패 알림 함수 추가 필요
                # await notification_service.send_backtest_failed_notification(session, backtest_id, payload.get("error"))
                pass
    return asyncio.run(_send())

@celery_app.task(name="handle_recurring_payment_success_task", queue="io_bound_queue")
def handle_recurring_payment_success_task(payload: dict):
    """'subscription.recurring_payment.succeeded' 이벤트를 처리하여 구독을 갱신합니다."""
    customer_key = payload.get("customer_key")
    payment_data = payload.get("payment_data")
    logger.info(f"Event received: Renewing subscription for user {customer_key}")
    
    async def _renew():
        async with AsyncSessionLocal() as session:
            await subscription_service.activate_or_update_subscription(
                db=session, customer_key=customer_key, payment_data=payment_data
            )
    return asyncio.run(_renew())

@celery_app.task(name="handle_recurring_payment_failure_task", queue="io_bound_queue")
def handle_recurring_payment_failure_task(payload: dict):
    """'subscription.recurring_payment.failed' 이벤트를 처리하여 구독을 취소합니다."""
    customer_key = payload.get("customer_key")
    failure_data = payload.get("failure_data")
    logger.info(f"Event received: Canceling subscription for user {customer_key}")

    async def _cancel():
        async with AsyncSessionLocal() as session:
            await subscription_service.handle_subscription_payment_failure(
                db=session, customer_key=customer_key, failure_data=failure_data
            )
    return asyncio.run(_cancel())


# --- 중앙 이벤트 분배기 (Dispatcher) ---

EVENT_SUBSCRIBERS = {
    "payment.succeeded": ["fulfill_order_task"],
    "order.fulfilled": ["send_purchase_notification_task"],
    "backtest.completed": ["send_backtest_notification_task"],
    "backtest.failed": ["send_backtest_notification_task"],
    "subscription.recurring_payment.succeeded": ["handle_recurring_payment_success_task"],
    "subscription.recurring_payment.failed": ["handle_recurring_payment_failure_task"],
}

@celery_app.task(name="dispatch_event", queue="io_bound_queue")
def dispatch_event(event_name: str, payload: dict):
    """발행된 이벤트를 받아 적절한 구독자 태스크들에게 전달하는 중앙 분배기."""
    if task_names := EVENT_SUBSCRIBERS.get(event_name):
        logger.info(f"Dispatching event '{event_name}' to tasks: {task_names}")
        for task_name in task_names:
            # 모든 payload를 그대로 전달하는 방식으로 통일하여 유연성 확보
            celery_app.send_task(task_name, args=[payload])
    else:
        logger.debug(f"No subscribers for event '{event_name}'.")