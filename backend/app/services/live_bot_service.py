# file: backend/app/services/live_bot_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload, selectinload
from fastapi import HTTPException, status
from typing import List, Optional, Literal
from datetime import datetime, timezone
import uuid
import logging
import pandas as pd

from .. import models, schemas
from ..services.plan_service import plan_service
from ..services.strategy_service import strategy_service
from ..services.api_key_service import api_key_service
from ..services.market_data_service import market_data_service
from ..services.signal_service import signal_service
from ..services.risk_manager import risk_manager
from ..engine.live_trading_engine import LiveTradingEngine
from ..engine.paper_trading_engine import PaperTradingEngine
from ..celery_app import celery_app

logger = logging.getLogger(__name__)

class LiveBotService:
    """
    실시간 자동매매 봇의 생성, 조회, 상태 업데이트 및 삭제를 담당하는 비동기 서비스.
    """
    def __init__(self):
        self.plan_service = plan_service
        self.strategy_service = strategy_service
        self.api_key_service = api_key_service
        self.market_data_service = market_data_service
        self.signal_service = signal_service

    async def create_live_bot(
        self,
        db: AsyncSession,
        user: models.User,
        live_bot_create: schemas.LiveBotCreate
    ) -> models.LiveBot:
        """새로운 라이브 자동매매 봇을 생성하고 Celery 큐에 시작 태스크를 추가합니다."""
        # 1. 플랜 기반 동시 실행 봇 개수 제한 검사
        user_features = await self.plan_service.get_user_plan_features(user, db)
        concurrent_limit = user_features.live_bots_limit
        
        active_bots_query = select(func.count(models.LiveBot.id)).filter(
            models.LiveBot.user_id == user.id,
            models.LiveBot.status.in_(['active', 'paused', 'initializing'])
        )
        active_bots_result = await db.execute(active_bots_query)
        active_bots_count = active_bots_result.scalar_one()

        if active_bots_count >= concurrent_limit:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"동시 실행 봇 제한({concurrent_limit}개)을 초과했습니다. 플랜을 업그레이드해주세요."
            )

        # 2. 전략 및 API 키 유효성 검사 (소유권 포함)
        strategy = await self.strategy_service.get_strategy_by_id(db, live_bot_create.strategy_id)
        if not strategy or strategy.author_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 전략을 찾을 수 없거나 권한이 없습니다.")

        # Paper 모드에서는 API 키가 없을 수 있음
        api_key_record = None
        if live_bot_create.api_key_id:
            api_key_record = await self.api_key_service.get_api_key_by_id(db, live_bot_create.api_key_id)
            if not api_key_record or api_key_record.user_id != user.id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="선택한 API 키를 찾을 수 없거나 권한이 없습니다.")
            
            if not api_key_record.is_active:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="비활성화된 API 키입니다.")

        # 3. 라이브 봇 DB 레코드 생성
        db_live_bot = models.LiveBot(
            user_id=user.id,
            strategy_id=live_bot_create.strategy_id,
            api_key_id=live_bot_create.api_key_id,
            status='initializing',
            initial_capital=live_bot_create.initial_capital,
            execution_interval=live_bot_create.execution_interval,
            trailing_stop_config=live_bot_create.trailing_stop_config,
            mode=live_bot_create.mode # mode 필드 추가
        )
        db.add(db_live_bot)
        await db.flush()  # ID 생성
        
        # 관계 데이터를 eager load하기 위해 다시 조회
        result = await db.execute(
            select(models.LiveBot)
            .options(
                selectinload(models.LiveBot.strategy),
                selectinload(models.LiveBot.api_key)
            )
            .filter(models.LiveBot.id == db_live_bot.id)
        )
        loaded_bot = result.scalar_one()
        
        return loaded_bot

    async def execute_bot_cycle(self, db: AsyncSession, bot: models.LiveBot) -> dict:
        """
        단일 봇의 매매 사이클(데이터 수집 -> 신호 생성 -> 주문 실행/시뮬레이션)을 실행합니다.
        """
        try:
            # ========== 추가: 리스크 체크 ==========
            # 1. 일일 손실 한도 체크
            if not await risk_manager.check_daily_loss_limit(db, bot):
                return {
                    "bot_id": bot.id, 
                    "status": "paused", 
                    "reason": "Daily loss limit reached"
                }
            
            # 2. 에러 임계값 체크
            if not await risk_manager.check_error_threshold(db, bot):
                return {
                    "bot_id": bot.id, 
                    "status": "error", 
                    "reason": "Too many consecutive errors"
                }
            # ========================================
            
            if bot.mode == 'live':
                # ========== Live Trading 구현 ==========
                # 1. API 키 조회
                if not bot.api_key:
                    bot.api_key = await self.api_key_service.get_api_key_by_id(db, bot.api_key_id)
                
                if not bot.api_key or not bot.api_key.is_active:
                    return {
                        "bot_id": bot.id,
                        "status": "error",
                        "reason": "Invalid or inactive API key"
                    }
                
                # 2. 전략 로드
                if not bot.strategy:
                    bot.strategy = await self.strategy_service.get_strategy_by_id(db, bot.strategy_id)
                
                # 3. 현재가 조회
                latest_data = await self.market_data_service.get_latest_data(
                    db, bot.ticker, bot.execution_interval, limit=1
                )
                
                if latest_data.empty:
                    return {"bot_id": bot.id, "status": "skipped", "reason": "No market data"}
                
                current_price = latest_data.iloc[-1]['close']
                
                # 4. 신호 생성 (최근 200개 캔들 기준)
                ohlcv_df = await self.market_data_service.get_latest_data(
                    db, bot.ticker, bot.execution_interval, limit=200
                )
                
                strategy_schema = schemas.StrategyCreate.model_validate(
                    schemas.Strategy.model_validate(bot.strategy).model_dump()
                )
                
                signals_df = self.signal_service.generate_signals_from_dataframe(
                    ohlcv_df, strategy_schema, bot.execution_interval
                )
                
                last_signal = signals_df.iloc[-1]['signal'] if not signals_df.empty else 'none'
                
                # 5. Live Trading Engine 실행
                engine = LiveTradingEngine(bot, bot.api_key, bot.strategy)
                
                try:
                    result = await engine.execute_cycle(last_signal, current_price)
                    
                    # 6. 결과 처리
                    if result['status'] == 'success':
                        # 포지션 정보 업데이트
                        if result['action'] in ['long_entry', 'short_entry']:
                            bot.position_size = result['quantity'] if result['side'] == 'long' else -result['quantity']
                            bot.entry_price = result['price']
                        elif result['action'] in ['long_exit', 'short_exit']:
                            bot.position_size = 0.0
                            bot.entry_price = None
                            
                            # 거래 로그 저장
                            if result.get('pnl') is not None:
                                trade_log = models.TradeLog(
                                    live_bot_id=bot.id,
                                    timestamp=datetime.now(timezone.utc),
                                    side=result['action'],
                                    price=result['price'],
                                    quantity=result['quantity'],
                                    pnl=result['pnl'],
                                    reason="Live trading signal"
                                )
                                db.add(trade_log)
                                
                                # 리스크 관리
                                await risk_manager.update_daily_pnl(db, bot, result['pnl'])
                                await risk_manager.update_trade_statistics(db, bot, result['pnl'])
                        
                        bot.last_signal = last_signal
                        bot.last_run_at = datetime.now(timezone.utc)
                        
                        await risk_manager.update_drawdown(db, bot)
                        await risk_manager.reset_error_count(db, bot)
                        
                        db.add(bot)
                        await db.commit()
                        
                        return {"bot_id": bot.id, "status": "success", "result": result}
                    
                    else:
                        return {"bot_id": bot.id, "status": result['status'], "reason": result.get('reason', 'Unknown')}
                
                finally:
                    await engine.close()
                # ========================================

            # 1. 전략 로드
            if not bot.strategy:
                bot.strategy = await self.strategy_service.get_strategy_by_id(db, bot.strategy_id)

            # 전략 데이터 검증 및 티커 추출
            target_ticker = bot.ticker  # ========== 수정: DB에서 직접 가져오기 ==========
            
            strategy_schema = schemas.StrategyCreate.model_validate(
                schemas.Strategy.model_validate(bot.strategy).model_dump()
            )

            # 2. 데이터 준비
            limit = 200 
            ohlcv_df = await self.market_data_service.get_latest_data(
                db, target_ticker, bot.execution_interval, limit=limit
            )
            
            if ohlcv_df.empty:
                return {"bot_id": bot.id, "status": "skipped", "reason": "No data"}

            # 3. 신호 생성
            signals_df = self.signal_service.generate_signals_from_dataframe(
                ohlcv_df, strategy_schema, bot.execution_interval
            )
            
            # 4. 엔진 실행
            engine = PaperTradingEngine(bot, ohlcv_df, signals_df, strategy_schema)
            
            # 마지막 캔들(현재 시점)에 대해 실행
            last_timestamp = ohlcv_df.index[-1]
            
            # 이미 실행한 캔들인지 확인 (중복 실행 방지)
            if bot.last_run_at and bot.last_run_at.replace(tzinfo=timezone.utc) >= last_timestamp.replace(tzinfo=timezone.utc):
                return {"bot_id": bot.id, "status": "skipped", "reason": "Already processed this candle"}

            result = engine.execute_single_step(last_timestamp)
            
            # 5. 상태 업데이트
            bot.current_balance = result['current_balance']
            bot.position_size = result['position_size']
            bot.entry_price = result['entry_price'] if result['entry_price'] else bot.entry_price
            bot.last_signal = result['last_signal']
            bot.last_run_at = datetime.now(timezone.utc)
            
            # ========== 추가: TP/SL 상태 저장 ==========
            if hasattr(engine, 'sl_price'):
                bot.sl_price = engine.sl_price
            if hasattr(engine, 'tp_price'):
                bot.tp_price = engine.tp_price
            # ==========================================
            
            db.add(bot)
            
            # 6. 트레이드 로그 저장 및 리스크 관리
            if result.get('trades'):
                for trade in result['trades']:
                    trade_log = models.TradeLog(
                        backtest_id=None,
                        live_bot_id=bot.id,
                        timestamp=trade['timestamp'],
                        side=trade['side'],
                        price=trade['price'],
                        quantity=trade['quantity'],
                        commission=trade['commission'],
                        pnl=trade['pnl'],
                        reason=trade['reason']
                    )
                    db.add(trade_log)
                    
                    # ========== 추가: 거래 발생 시 리스크 관리 ==========
                    if trade['pnl'] is not None:
                        # 일일 손익 업데이트
                        await risk_manager.update_daily_pnl(db, bot, trade['pnl'])
                        
                        # 거래 통계 업데이트
                        await risk_manager.update_trade_statistics(db, bot, trade['pnl'])
                    # =================================================
            
            # ========== 추가: MDD 업데이트 ==========
            await risk_manager.update_drawdown(db, bot)
            # ========================================
            
            # ========== 추가: 성공 시 에러 카운트 리셋 ==========
            await risk_manager.reset_error_count(db, bot)
            # ==================================================
            
            await db.commit()
            return {"bot_id": bot.id, "status": "success", "last_signal": bot.last_signal}

        except Exception as e:
            logger.error(f"Error executing bot cycle for {bot.id}: {e}", exc_info=True)
            
            # ========== 추가: 에러 기록 ==========
            await risk_manager.record_error(db, bot, str(e))
            await db.commit()
            # ====================================
            
            return {"bot_id": bot.id, "status": "error", "error": str(e)}

    async def get_live_bots_by_user(
        self, db: AsyncSession, user_id: uuid.UUID, skip: int = 0, limit: int = 100
    ) -> List[models.LiveBot]:
        """사용자 본인의 라이브 봇 목록을 비동기로 조회합니다."""
        query = select(models.LiveBot).options(
            joinedload(models.LiveBot.strategy),
            joinedload(models.LiveBot.api_key)
        ).filter(models.LiveBot.user_id == user_id).order_by(models.LiveBot.started_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()

    async def update_bot_status(
        self, db: AsyncSession, bot_to_update: models.LiveBot, new_status: Literal["active", "paused", "stopped"]
    ) -> models.LiveBot:
        """라이브 봇의 상태를 업데이트하고, 필요시 Celery 태스크를 제어합니다."""
        if bot_to_update.status == new_status:
            return bot_to_update
        
        if bot_to_update.status in ['stopped', 'error']:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"'{bot_to_update.status}' 상태의 봇은 제어할 수 없습니다.")
        
        if new_status == "stopped":
            if bot_to_update.celery_task_id:
                # Celery 태스크를 중지시키는 핵심 로직
                celery_app.control.revoke(str(bot_to_update.celery_task_id), terminate=True)
                bot_to_update.stopped_at = datetime.now(timezone.utc)
                logger.info(f"LiveBot ID {bot_to_update.id} (Task ID: {bot_to_update.celery_task_id}) received 'stop' command.")
            else:
                # Task ID가 없는 경우
                logger.warning(f"LiveBot ID {bot_to_update.id} has no Celery Task ID but was marked as stopped.")
        
        bot_to_update.status = new_status
        db.add(bot_to_update)
        await db.flush()
        return bot_to_update

    async def delete_live_bot(self, db: AsyncSession, bot_id: uuid.UUID) -> bool:
        """라이브 봇을 삭제합니다."""
        result = await db.execute(select(models.LiveBot).filter(models.LiveBot.id == bot_id))
        bot_to_delete = result.scalar_one_or_none()

        if not bot_to_delete:
            return False

        if bot_to_delete.status in ['active', 'paused', 'initializing']:
            logger.info(f"LiveBot ID {bot_to_delete.id} is active. Stopping before deletion.")
            try:
                # update_bot_status를 호출하여 봇 상태를 'stopped'로 변경하고 Celery 태스크를 중지시킵니다.
                await self.update_bot_status(db, bot_to_delete, "stopped")
            except Exception as e:
                logger.error(f"Failed to stop LiveBot {bot_to_delete.id} before deletion: {e}", exc_info=True)
                # 이 경우 봇 레코드가 삭제되지 않고 함수가 예외를 발생시킵니다.
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="봇 삭제 전 중지 실패. 먼저 수동으로 봇을 중지해주세요.")
        
        await db.delete(bot_to_delete)
        await db.flush()
        return True

    async def get_live_bot_with_relations(
        self, db: AsyncSession, bot_id: uuid.UUID, user_id: uuid.UUID
    ) -> models.LiveBot:
        """관계 데이터를 포함한 봇 조회"""
        result = await db.execute(
            select(models.LiveBot)
            .options(
                selectinload(models.LiveBot.strategy),
                selectinload(models.LiveBot.api_key)
            )
            .filter(
                models.LiveBot.id == bot_id,
                models.LiveBot.user_id == user_id
            )
        )
        bot = result.scalar_one_or_none()
        
        if not bot:
            raise HTTPException(status_code=404, detail="Bot not found")
        
        return bot

live_bot_service = LiveBotService()