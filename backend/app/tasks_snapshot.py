# file: backend/app/tasks_snapshot.py
# 동기 버전의 collect_bot_performance_snapshots

from datetime import datetime, timezone
from sqlalchemy import select
from .database import SyncSessionLocal
from . import models
from .services.market_data_service import market_data_service
import logging

logger = logging.getLogger(__name__)

def collect_bot_performance_snapshots_sync():
    """
    모든 활성 봇의 성과 스냅샷을 수집합니다 (1시간마다 실행 권장).
    차트 데이터로 사용됩니다.
    동기 버전으로 io_bound_queue(eventlet)에서 안전하게 실행됩니다.
    """
    with SyncSessionLocal() as db:
        # 활성 봇 조회
        query = select(models.LiveBot).filter(
            models.LiveBot.status.in_(['active', 'paused'])
        )
        result = db.execute(query)
        bots = result.scalars().all()
        
        if not bots:
            logger.info("No active bots to collect snapshots")
            return "No active bots"
        
        snapshot_time = datetime.now(timezone.utc)
        
        for bot in bots:
            # 변수 초기화
            unrealized_pnl = 0.0
            current_price = 0.0
            
            # 미실현 손익 및 현재가 조회
            if bot.position_size != 0 and bot.entry_price:
                try:
                    # 현재가 조회 (동기 버전 사용)
                    df = market_data_service.get_latest_data_sync(
                        db=db,
                        ticker=bot.ticker,
                        timeframe=bot.execution_interval,
                        limit=1
                    )
                    
                    if not df.empty:
                        current_price = df.iloc[-1]['close']
                        
                        # 미실현 손익 계산
                        if bot.position_size > 0:  # Long position
                            unrealized_pnl = (current_price - bot.entry_price) * abs(bot.position_size) * bot.leverage
                        else:  # Short position
                            unrealized_pnl = (bot.entry_price - current_price) * abs(bot.position_size) * bot.leverage
                except Exception as e:
                    logger.warning(f"Failed to calculate unrealized PnL for bot {bot.id}: {e}")
                    unrealized_pnl = 0.0

            # 총 자산(Equity) 계산
            equity = bot.current_balance or bot.initial_capital
            if bot.position_size != 0 and current_price > 0:
                 equity = bot.current_balance + (abs(bot.position_size) * current_price)

            logger.info(f"[Snapshot] Bot {bot.id}: Pos={bot.position_size}, Price={current_price}, Balance={bot.current_balance}, Equity={equity}")

            # 실현 손익은 total_pnl
            realized_pnl = bot.total_pnl
            
            snapshot = models.BotPerformanceSnapshot(
                bot_id=bot.id,
                snapshot_date=snapshot_time,
                balance=equity,
                position_size=bot.position_size,
                unrealized_pnl=unrealized_pnl,
                realized_pnl=realized_pnl,
                total_trades=bot.total_trades
            )
            db.add(snapshot)
        
        db.commit()
        logger.info(f"Collected performance snapshots for {len(bots)} bots")
        return f"Collected {len(bots)} snapshots"
