# file: backend/app/services/risk_manager.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, date
from typing import Optional
import logging

from .. import models

logger = logging.getLogger(__name__)


class RiskManager:
    """봇 리스크 관리 서비스"""
    
    async def check_daily_loss_limit(self, db: AsyncSession, bot: models.LiveBot) -> bool:
        """
        일일 손실 한도 체크
        
        Returns:
            True: 거래 가능
            False: 일일 손실 한도 도달, 거래 중지
        """
        if not bot.daily_max_loss_enabled or bot.daily_max_loss_pct is None:
            return True
        
        # 날짜가 바뀌었으면 리셋
        today = datetime.now(timezone.utc).date()
        if bot.daily_pnl_reset_date != today:
            bot.daily_pnl = 0.0
            bot.daily_pnl_reset_date = today
            db.add(bot)
            logger.info(f"Bot {bot.id}: Daily PnL reset for new day {today}")
        
        # 손실률 계산
        if bot.initial_capital and bot.initial_capital > 0:
            loss_pct = (bot.daily_pnl / bot.initial_capital) * 100
            
            if loss_pct <= -bot.daily_max_loss_pct:
                logger.warning(
                    f"Bot {bot.id} hit daily loss limit: {loss_pct:.2f}% "
                    f"(limit: -{bot.daily_max_loss_pct}%)"
                )
                bot.status = 'paused'
                bot.last_error = f"Daily loss limit reached: {loss_pct:.2f}%"
                db.add(bot)
                return False
        
        return True
    
    async def update_daily_pnl(self, db: AsyncSession, bot: models.LiveBot, trade_pnl: float):
        """거래 발생 시 일일 손익 업데이트"""
        bot.daily_pnl += trade_pnl
        bot.total_pnl += trade_pnl
        db.add(bot)
        logger.info(f"Bot {bot.id}: Daily PnL updated: {bot.daily_pnl:.2f}")
    
    async def update_drawdown(self, db: AsyncSession, bot: models.LiveBot):
        """최대 낙폭(MDD) 업데이트"""
        if bot.equity is None:
            return
        
        current_equity = bot.equity
        
        # 최고점 갱신
        if bot.peak_balance is None or current_equity > bot.peak_balance:
            bot.peak_balance = current_equity
            logger.debug(f"Bot {bot.id}: New peak equity: {bot.peak_balance:.2f}")
        
        # MDD 계산
        if bot.peak_balance and bot.peak_balance > 0:
            drawdown = ((bot.peak_balance - current_equity) / bot.peak_balance) * 100
            if drawdown > bot.max_drawdown:
                bot.max_drawdown = drawdown
                logger.info(f"Bot {bot.id}: New max drawdown: {bot.max_drawdown:.2f}%")
        
        db.add(bot)
        
    async def update_trade_statistics(
        self, 
        db: AsyncSession, 
        bot: models.LiveBot, 
        trade_pnl: float
    ):
        """거래 통계 업데이트"""
        bot.total_trades += 1
        
        if trade_pnl > 0:
            bot.winning_trades += 1
        
        db.add(bot)
        
        # 승률 계산 (로그용)
        if bot.total_trades > 0:
            win_rate = (bot.winning_trades / bot.total_trades) * 100
            logger.info(
                f"Bot {bot.id}: Trade stats - "
                f"Total: {bot.total_trades}, "
                f"Wins: {bot.winning_trades}, "
                f"Win Rate: {win_rate:.1f}%"
            )
    
    async def check_error_threshold(self, db: AsyncSession, bot: models.LiveBot) -> bool:
        """
        연속 에러 횟수 체크
        
        Returns:
            True: 정상
            False: 에러 임계값 초과, 봇 중지 필요
        """
        ERROR_THRESHOLD = 10  # 연속 10회 에러 시 자동 중지
        
        if bot.error_count >= ERROR_THRESHOLD:
            logger.error(
                f"Bot {bot.id} exceeded error threshold ({bot.error_count} errors). "
                f"Stopping bot."
            )
            bot.status = 'error'
            db.add(bot)
            return False
        
        return True
    
    async def record_error(self, db: AsyncSession, bot: models.LiveBot, error_msg: str):
        """에러 기록"""
        bot.error_count += 1
        bot.last_error = error_msg[:500]  # 최대 500자
        db.add(bot)
        logger.error(f"Bot {bot.id}: Error #{bot.error_count}: {error_msg}")
    
    async def reset_error_count(self, db: AsyncSession, bot: models.LiveBot):
        """성공적인 실행 후 에러 카운트 리셋"""
        if bot.error_count > 0:
            bot.error_count = 0
            bot.last_error = None
            db.add(bot)
            logger.info(f"Bot {bot.id}: Error count reset")


# 싱글톤 인스턴스
risk_manager = RiskManager()