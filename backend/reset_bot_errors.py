import asyncio
import sys
import os

# Add the current directory to sys.path to make app modules importable
sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from app.models import LiveBot
from sqlalchemy import select

async def reset_errors():
    async with AsyncSessionLocal() as session:
        print("Fetching bots...")
        result = await session.execute(select(LiveBot))
        bots = result.scalars().all()
        
        count = 0
        for bot in bots:
            # Reset error count
            bot.error_count = 0
            # If bot was stopped due to errors (or is initializing/paused), set to active to restart it
            if bot.status in ['paused', 'stopped', 'error', 'initializing']:
                bot.status = 'active'
            
            print(f"Bot {bot.id}: error_count reset to 0, status set to {bot.status}")
            count += 1
            
        await session.commit()
        print(f"Successfully reset {count} bots.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(reset_errors())
