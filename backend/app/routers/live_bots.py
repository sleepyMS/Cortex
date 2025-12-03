# file: backend/app/routers/live_bots.py

from fastapi import APIRouter, HTTPException, Depends, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

from .. import schemas, models
from ..dependencies import get_async_db, get_current_active_user, create_owner_verifier
from ..services.live_bot_service import live_bot_service
from ..limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/live-bots", tags=["Live Bots"])

get_verified_live_bot = create_owner_verifier(models.LiveBot, path_param_name="live_bot_id")

@router.post("/", response_model=schemas.LiveBot, status_code=status.HTTP_201_CREATED, summary="Deploy and start a new live bot")
@limiter.limit("20/hour")
async def create_live_bot(
    live_bot_create: schemas.LiveBotCreate,
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """새로운 자동매매 봇을 배포하고 시작합니다."""
    # Paper 모드에서는 api_key_id가 없을 수 있음
    if live_bot_create.mode == "live" and not live_bot_create.api_key_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Live mode requires an API key"
        )
    
    new_bot = await live_bot_service.create_live_bot(db, current_user, live_bot_create)
    logger.info(f"New live bot (ID: {new_bot.id}) created for user {current_user.email}.")
    return new_bot

@router.get("/", response_model=List[schemas.LiveBot], summary="Get list of user's live bots")
async def get_live_bots(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """현재 사용자의 자동매매 봇 목록을 비동기로 조회합니다."""
    bots = await live_bot_service.get_live_bots_by_user(db, current_user.id, skip, limit)
    logger.info(f"User {current_user.email} fetched {len(bots)} live bots.")
    return bots

@router.get("/{live_bot_id}", response_model=schemas.LiveBot, summary="Get details of a specific live bot")
async def get_live_bot_by_id(
    live_bot_id: uuid.UUID,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 자동매매 봇의 상세 정보를 조회합니다. (소유권 자동 검증)"""
    return await live_bot_service.get_live_bot_with_relations(
        db, live_bot_id, current_user.id
    )

@router.put("/{live_bot_id}", response_model=schemas.LiveBot, summary="Update the status of a live bot")
async def update_live_bot_status(
    live_bot_update: schemas.LiveBotUpdate,
    live_bot_to_update: models.LiveBot = Depends(get_verified_live_bot),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 자동매매 봇의 상태(active, paused, stopped)를 업데이트합니다."""
    updated_bot = await live_bot_service.update_bot_status(db, live_bot_to_update, live_bot_update.status)
    logger.info(f"Live bot ID {updated_bot.id} status updated to '{updated_bot.status}'.")
    return updated_bot

@router.delete("/{live_bot_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a live bot")
async def delete_live_bot(
    live_bot_to_delete: models.LiveBot = Depends(get_verified_live_bot),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 자동매매 봇을 삭제합니다. (소유권 자동 검증)"""
    await live_bot_service.delete_live_bot(db, live_bot_to_delete.id)
    logger.info(f"Live bot ID {live_bot_to_delete.id} deleted by user {live_bot_to_delete.user_id}.")

@router.get("/{live_bot_id}/logs", response_model=List[schemas.BotTradeLogEntry], summary="Get bot trade logs")
async def get_bot_logs(
    live_bot_id: uuid.UUID,
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    live_bot: models.LiveBot = Depends(get_verified_live_bot),
    db: AsyncSession = Depends(get_async_db)
):
    """봇의 거래 로그를 조회합니다."""
    from sqlalchemy import select
    
    query = select(models.TradeLog).filter(
        models.TradeLog.live_bot_id == live_bot_id
    ).order_by(
        models.TradeLog.timestamp.desc()
    ).offset(skip).limit(limit)
    
    result = await db.execute(query)
    trades = result.scalars().all()
    
    logger.info(f"User retrieved {len(trades)} trade logs for bot {live_bot_id}")
    return trades

@router.get("/{live_bot_id}/analytics", response_model=schemas.BotAnalytics, summary="Get bot analytics")
async def get_bot_analytics(
    live_bot_id: uuid.UUID,
    live_bot: models.LiveBot = Depends(get_verified_live_bot),
    db: AsyncSession = Depends(get_async_db)
):
    """봇의 성과 분석 데이터를 조회합니다."""
    from sqlalchemy import select, func
    
    # 거래 로그 조회
    query = select(models.TradeLog).filter(
        models.TradeLog.live_bot_id == live_bot_id
    )
    result = await db.execute(query)
    trades = result.scalars().all()
    
    # 통계 계산
    total_trades = len(trades)
    winning_trades = sum(1 for t in trades if t.pnl and t.pnl > 0)
    losing_trades = sum(1 for t in trades if t.pnl and t.pnl < 0)
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0.0
    
    # 수익 지표
    total_pnl = live_bot.total_pnl
    total_return_pct = (total_pnl / live_bot.initial_capital * 100) if live_bot.initial_capital else 0.0
    
    # 거래 분석
    winning_pnls = [t.pnl for t in trades if t.pnl and t.pnl > 0]
    losing_pnls = [t.pnl for t in trades if t.pnl and t.pnl < 0]
    
    avg_win = sum(winning_pnls) / len(winning_pnls) if winning_pnls else None
    avg_loss = sum(losing_pnls) / len(losing_pnls) if losing_pnls else None
    largest_win = max(winning_pnls) if winning_pnls else None
    largest_loss = min(losing_pnls) if losing_pnls else None
    
    # Profit Factor
    total_wins = sum(winning_pnls) if winning_pnls else 0
    total_losses = abs(sum(losing_pnls)) if losing_pnls else 0
    profit_factor = (total_wins / total_losses) if total_losses > 0 else None
    
    # Sharpe Ratio (간단한 계산)
    if len(trades) > 1:
        import numpy as np
        pnls = [t.pnl for t in trades if t.pnl is not None]
        if pnls:
            returns = np.array(pnls)
            sharpe_ratio = (np.mean(returns) / np.std(returns)) * np.sqrt(252) if np.std(returns) > 0 else None
        else:
            sharpe_ratio = None
    else:
        sharpe_ratio = None
    
    # 런타임 계산
    runtime = datetime.now(timezone.utc) - live_bot.started_at
    total_runtime = str(runtime).split('.')[0]  # 소수점 제거
    
    analytics = schemas.BotAnalytics(
        bot_id=live_bot_id,
        total_trades=total_trades,
        winning_trades=winning_trades,
        losing_trades=losing_trades,
        win_rate=win_rate,
        total_pnl=total_pnl,
        total_return_pct=total_return_pct,
        daily_pnl=live_bot.daily_pnl,
        max_drawdown=live_bot.max_drawdown,
        sharpe_ratio=sharpe_ratio,
        profit_factor=profit_factor,
        avg_win=avg_win,
        avg_loss=avg_loss,
        largest_win=largest_win,
        largest_loss=largest_loss,
        avg_holding_time=None,  # TODO: 구현
        total_runtime=total_runtime
    )
    
    logger.info(f"User retrieved analytics for bot {live_bot_id}")
    return analytics

@router.get("/{live_bot_id}/performance", response_model=List[schemas.BotPerformanceSnapshotResponse], summary="Get bot performance history")
async def get_bot_performance_history(
    live_bot_id: uuid.UUID,
    days: int = Query(30, ge=1, le=365),
    live_bot: models.LiveBot = Depends(get_verified_live_bot),
    db: AsyncSession = Depends(get_async_db)
):
    """봇의 성과 히스토리를 조회합니다 (차트 데이터용)."""
    from sqlalchemy import select
    from datetime import timedelta
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    query = select(models.BotPerformanceSnapshot).filter(
        models.BotPerformanceSnapshot.bot_id == live_bot_id,
        models.BotPerformanceSnapshot.snapshot_date >= start_date
    ).order_by(models.BotPerformanceSnapshot.snapshot_date.asc())
    
    result = await db.execute(query)
    snapshots = result.scalars().all()
    
    logger.info(f"User retrieved {len(snapshots)} performance snapshots for bot {live_bot_id}")
    return snapshots

@router.post("/{live_bot_id}/panic-sell", summary="Emergency position close")
async def panic_sell(
    live_bot_id: uuid.UUID,
    live_bot: models.LiveBot = Depends(get_verified_live_bot),
    db: AsyncSession = Depends(get_async_db)
):
    """긴급 청산: 모든 포지션을 즉시 종료하고 봇을 중지합니다."""
    # Paper 모드: 포지션만 강제 청산
    if live_bot.mode == 'paper':
        if live_bot.position_size != 0:
            # 현재 가격 조회
            from ..services.market_data_service import market_data_service
            
            try:
                latest_data = await market_data_service.get_latest_data(
                    db, live_bot.ticker, live_bot.execution_interval, limit=1
                )
                current_price = latest_data.iloc[-1]['close'] if not latest_data.empty else 0.0
            except Exception as e:
                logger.error(f"Failed to get current price for panic sell: {e}")
                current_price = live_bot.entry_price or 0.0
            
            # 포지션 방향 확인
            position_side = "LONG" if live_bot.position_size > 0 else "SHORT"
            exit_side = "LONG_EXIT" if live_bot.position_size > 0 else "SHORT_EXIT"
            quantity = abs(live_bot.position_size)
            
            # PnL 계산
            if live_bot.entry_price:
                if live_bot.position_size > 0:  # LONG
                    pnl = (current_price - live_bot.entry_price) * quantity
                else:  # SHORT
                    pnl = (live_bot.entry_price - current_price) * quantity
            else:
                pnl = 0.0
            
            # 거래 로그 생성
            trade_log = models.TradeLog(
                live_bot_id=live_bot.id,
                timestamp=datetime.now(timezone.utc),
                side=exit_side,
                price=current_price,
                quantity=quantity,
                commission=0.0,
                pnl=pnl,
                current_balance=live_bot.current_balance + pnl if live_bot.current_balance else live_bot.initial_capital + pnl,
                reason="Panic sell - Emergency position close"
            )
            db.add(trade_log)
            
            # 포지션 청산
            live_bot.position_size = 0.0
            live_bot.entry_price = None
            live_bot.sl_price = None
            live_bot.tp_price = None
            
            # 잔액 업데이트
            if live_bot.current_balance:
                live_bot.current_balance += pnl
            else:
                live_bot.current_balance = live_bot.initial_capital + pnl
            
            # 총 PnL 업데이트
            live_bot.total_pnl += pnl
            
            logger.warning(f"PANIC SELL executed for bot {live_bot_id} (Paper mode): {exit_side} {quantity} @ {current_price}, PnL: {pnl}")
        
        live_bot.status = 'stopped'
        live_bot.stopped_at = datetime.now(timezone.utc)
        live_bot.last_error = "Panic sell triggered by user"
        
        db.add(live_bot)
        await db.commit()
        
        return {
            "status": "success",
            "message": "Panic sell executed. All positions closed.",
            "mode": "paper"
        }
    
    # Live 모드: TODO - 실제 거래소 API 호출
    else:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Panic sell for live mode not yet implemented"
        )

