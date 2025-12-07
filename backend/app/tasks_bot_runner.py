# file: backend/app/tasks_bot_runner.py
# 봇 실행 전용 태스크 (완전 동기 버전 - eventlet 최적화)

import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from .database import SyncSessionLocal
from . import models
from .services.live_bot_service import live_bot_service
from .services.market_data_service import market_data_service
from .services.signal_service import signal_service
from .services.risk_manager import risk_manager
from .engine.paper_trading_engine import PaperTradingEngine
from . import schemas

logger = logging.getLogger(__name__)


def _run_single_bot_cycle_sync(bot_id: uuid.UUID) -> dict:
    """
    [완전 동기 버전] 한 개의 활성 봇에 대한 거래 로직을 한 번 실행합니다.
    eventlet의 greenlet 기반 동시성을 최대한 활용합니다.
    """
    try:
        with SyncSessionLocal() as session:
            # 봇 객체를 관계 데이터와 함께 조회
            result = session.execute(
                select(models.LiveBot)
                .options(
                    selectinload(models.LiveBot.strategy).selectinload(models.Strategy.backtests),
                    selectinload(models.LiveBot.api_key)
                )
                .filter(models.LiveBot.id == bot_id)
            )
            bot = result.scalar_one_or_none()
            
            if not bot:
                return {"bot_id": str(bot_id), "status": "error", "error": "Bot not found"}

            # === Paper Trading 로직 (동기 버전) ===
            try:
                # 1. 전략 로드
                if not bot.strategy:
                    strategy_result = session.execute(
                        select(models.Strategy).filter(models.Strategy.id == bot.strategy_id)
                    )
                    bot.strategy = strategy_result.scalar_one_or_none()

                target_ticker = bot.ticker
                strategy_schema = schemas.StrategyCreate.model_validate(
                    schemas.Strategy.model_validate(bot.strategy).model_dump(exclude={'backtests'})
                )

                # 2. 데이터 준비 (동기 버전)
                limit = 200
                ohlcv_df = market_data_service.get_latest_data_sync(
                    db=session,
                    ticker=target_ticker,
                    timeframe=bot.execution_interval,
                    limit=200
                )
                
                if ohlcv_df.empty:
                    return {"bot_id": str(bot.id), "status": "skipped", "reason": "No data"}

                # 최근 200개만 사용
                if len(ohlcv_df) > limit:
                    ohlcv_df = ohlcv_df.iloc[-limit:]

                # 3. 신호 생성 (동기)
                signals_df = signal_service.generate_signals_from_dataframe(
                    ohlcv_df, strategy_schema, bot.execution_interval
                )
                
                # 4. 엔진 실행
                engine = PaperTradingEngine(bot, ohlcv_df, signals_df, strategy_schema)
                
                # 마지막 캔들에 대해 실행
                last_timestamp = ohlcv_df.index[-1]
                
                # 중복 실행 방지
                if bot.last_run_at and bot.last_run_at.replace(tzinfo=timezone.utc) >= last_timestamp.replace(tzinfo=timezone.utc):
                    return {"bot_id": str(bot.id), "status": "skipped", "reason": "Already processed this candle"}

                result = engine.execute_single_step(last_timestamp)
                
                # 5. 상태 업데이트
                bot.current_balance = result['current_balance']
                bot.position_size = result['position_size']
                bot.entry_price = result['entry_price'] if result['entry_price'] else bot.entry_price
                bot.last_signal = result['last_signal']
                bot.last_run_at = datetime.now(timezone.utc)
                
                # Equity 계산 (동기 버전)
                equity = bot.current_balance or bot.initial_capital
                if bot.position_size != 0:
                    try:
                        current_df = market_data_service.get_latest_data_sync(
                            db=session,
                            ticker=bot.ticker,
                            timeframe=bot.execution_interval,
                            limit=1
                        )
                        if not current_df.empty:
                            current_price = current_df.iloc[-1]['close']
                            # Equity = Balance + Invested Capital + Unrealized PnL
                            invested_capital = abs(bot.position_size) * bot.entry_price
                            unrealized_pnl = (current_price - bot.entry_price) * bot.position_size
                            equity = bot.current_balance + invested_capital + unrealized_pnl
                    except Exception as e:
                        logger.warning(f"Failed to calculate equity for bot {bot.id}: {e}")
                
                bot.equity = equity

                # TP/SL 상태 저장
                if hasattr(engine, 'sl_price'):
                    bot.sl_price = engine.sl_price
                if hasattr(engine, 'tp_price'):
                    bot.tp_price = engine.tp_price
                
                session.add(bot)
                
                # 6. 트레이드 로그 저장
                if result.get('trades'):
                    for trade in result['trades']:
                        trade_log = models.TradeLog(
                            backtest_id=None,
                            live_bot_id=bot.id,
                            # Paper Trading이라도 실시간 봇이므로 '체결 시간'은 현재 시간으로 기록
                            timestamp=datetime.now(timezone.utc),
                            side=trade['side'],
                            price=trade['price'],
                            quantity=trade['quantity'],
                            commission=trade['commission'],
                            pnl=trade['pnl'],
                            reason=trade['reason']
                        )
                        session.add(trade_log)
                
                session.commit()
                return {"bot_id": str(bot.id), "status": "success", "last_signal": bot.last_signal}

            except Exception as e:
                logger.error(f"Error executing bot cycle for {bot.id}: {e}", exc_info=True)
                session.rollback()
                return {"bot_id": str(bot.id), "status": "error", "error": str(e)}
            
    except Exception as e:
        logger.error(f"Bot ID {bot_id}: [SYNC] Cycle failed: {e}", exc_info=True)
        return {"bot_id": str(bot_id), "status": "failed", "error": str(e)}


def run_all_active_bots_sync():
    """
    [완전 동기 버전] 모든 활성 봇 병렬 실행
    eventlet GreenPool을 사용하여 최대 100개 봇을 동시에 실행합니다.
    """
    import eventlet
    
    bot_ids = []
    with SyncSessionLocal() as session:
        # 1. 실행할 봇 ID 목록 조회
        result = session.execute(
            select(models.LiveBot.id, models.LiveBot.status)
            .filter(models.LiveBot.status.in_(['active', 'initializing']))
        )
        rows = result.all()
        
        if not rows:
            return "No active bots."
        
        # 2. initializing 상태인 봇 active로 변경
        for row in rows:
            bot_id, status = row
            bot_ids.append(bot_id)
            if status == 'initializing':
                session.execute(
                    update(models.LiveBot)
                    .where(models.LiveBot.id == bot_id)
                    .values(status='active')
                )
        session.commit()

    # 3. Eventlet GreenPool로 병렬 실행 (최대 100개 동시)
    pool = eventlet.GreenPool(size=100)
    results = list(pool.imap(_run_single_bot_cycle_sync, bot_ids))
    
    success_count = sum(1 for r in results if isinstance(r, dict) and r.get("status") == "success")
    return f"Processed {len(bot_ids)} bots. Success: {success_count}"

