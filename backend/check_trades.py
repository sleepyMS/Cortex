import asyncio
from app import models
from app.database import get_async_db
from sqlalchemy import select

async def main():
    async for db in get_async_db():
        result = await db.execute(
            select(models.TradeLog)
            .order_by(models.TradeLog.timestamp.desc())
            .limit(5)
        )
        logs = result.scalars().all()
        
        print("=== TRADE LOGS ===")
        for l in logs:
            print(f"side={l.side}, pnl={l.pnl}")
        
        bot_result = await db.execute(
            select(models.LiveBot)
            .order_by(models.LiveBot.started_at.desc())
            .limit(2)
        )
        bots = bot_result.scalars().all()
        
        print("\n=== BOTS ===")
        for b in bots:
            print(f"trades={b.total_trades}, pnl={b.total_pnl}")
        break

asyncio.run(main())
