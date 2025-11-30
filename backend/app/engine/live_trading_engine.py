# file: backend/app/engine/live_trading_engine.py

import ccxt.async_support as ccxt_async
from typing import Dict, Any, Optional
from decimal import Decimal, ROUND_DOWN
import logging
from datetime import datetime, timezone

from .. import models, schemas
from ..services.api_key_service import api_key_service

logger = logging.getLogger(__name__)


class LiveTradingEngine:
    """바이낸스 선물 거래소를 통한 실제 자동매매 실행 엔진"""
    
    def __init__(self, bot: models.LiveBot, api_key: models.ApiKey, strategy: models.Strategy):
        self.bot = bot
        self.strategy = strategy
        self.exchange: Optional[ccxt_async.binanceusdm] = None
        self.api_key = api_key
        
        # 거래소별 최소 주문 수량 (실제로는 exchange.load_markets()에서 가져와야 함)
        self.min_order_sizes = {
            'BTCUSDT': 0.001,
            'ETHUSDT': 0.01,
            'BNBUSDT': 0.1,
            # 기타 심볼 추가...
        }
    
    async def _init_exchange(self):
        """거래소 클라이언트 초기화"""
        if self.exchange:
            return
        
        # API 키 복호화
        decrypted_key = api_key_service.decrypt_api_key(self.api_key.api_key_encrypted)
        decrypted_secret = api_key_service.decrypt_secret_key(self.api_key.secret_key_encrypted)
        
        self.exchange = ccxt_async.binanceusdm({
            'apiKey': decrypted_key,
            'secret': decrypted_secret,
            'enableRateLimit': True,
            'options': {
                'defaultType': 'future',  # 선물 거래
                'adjustForTimeDifference': True,
                'recvWindow': 10000,
            }
        })
        
        # 마켓 정보 로드
        await self.exchange.load_markets()
        logger.info(f"Exchange initialized for bot {self.bot.id}")
    
    async def close(self):
        """거래소 연결 종료"""
        if self.exchange:
            await self.exchange.close()
            logger.info(f"Exchange connection closed for bot {self.bot.id}")
    
    async def setup_position_mode(self):
        """포지션 모드 설정 (Hedge Mode vs One-way Mode)"""
        try:
            # One-way 모드 설정 (롱/숏을 동시에 보유하지 않음)
            await self.exchange.set_position_mode(False)  # False = One-way
            logger.info(f"Position mode set to One-way for bot {self.bot.id}")
        except Exception as e:
            # 이미 설정되어 있으면 에러 무시
            logger.debug(f"Position mode already set: {e}")
    
    async def set_leverage(self):
        """레버리지 설정"""
        try:
            await self.exchange.set_leverage(
                leverage=int(self.bot.leverage),
                symbol=self.bot.ticker
            )
            logger.info(f"Leverage set to {self.bot.leverage}x for {self.bot.ticker}")
        except Exception as e:
            logger.error(f"Failed to set leverage: {e}")
            raise
    
    async def set_margin_mode(self, mode: str = 'ISOLATED'):
        """마진 모드 설정 (ISOLATED or CROSSED)"""
        try:
            await self.exchange.set_margin_mode(mode, self.bot.ticker)
            logger.info(f"Margin mode set to {mode} for {self.bot.ticker}")
        except Exception as e:
            logger.debug(f"Margin mode already set or error: {e}")
    
    async def get_current_position(self) -> Optional[Dict[str, Any]]:
        """현재 포지션 조회"""
        positions = await self.exchange.fetch_positions([self.bot.ticker])
        
        for pos in positions:
            if pos['symbol'] == self.bot.ticker and float(pos['contracts']) != 0:
                return {
                    'side': pos['side'],  # 'long' or 'short'
                    'size': float(pos['contracts']),
                    'entry_price': float(pos['entryPrice']),
                    'unrealized_pnl': float(pos['unrealizedPnl']),
                    'leverage': float(pos['leverage'])
                }
        
        return None
    
    def _calculate_position_size(self, price: float) -> float:
        """포지션 크기 계산 (레버리지 고려)"""
        # 사용 가능한 자본
        usable_capital = self.bot.current_balance or self.bot.initial_capital
        
        # 레버리지 적용
        leveraged_capital = usable_capital * self.bot.leverage
        
        # 수량 계산
        quantity = leveraged_capital / price
        
        # 최소 주문 수량 체크
        min_size = self.min_order_sizes.get(self.bot.ticker, 0.001)
        
        # 소수점 자리수 조정 (거래소별 규칙에 맞게)
        # 예: BTC는 소수점 3자리, ETH는 2자리
        precision = 3 if 'BTC' in self.bot.ticker else 2
        quantity = float(Decimal(str(quantity)).quantize(
            Decimal(f'0.{"0" * precision}'), 
            rounding=ROUND_DOWN
        ))
        
        return max(quantity, min_size)
    
    async def execute_cycle(self, signal: str, current_price: float) -> Dict[str, Any]:
        """
        신호에 따라 실제 주문 실행
        
        Args:
            signal: 'long_entry', 'long_exit', 'short_entry', 'short_exit', 'none'
            current_price: 현재 시장 가격
        
        Returns:
            실행 결과 딕셔너리
        """
        try:
            await self._init_exchange()
            
            # 초기 설정 (최초 1회만)
            if not hasattr(self, '_initialized'):
                await self.setup_position_mode()
                await self.set_leverage()
                await self.set_margin_mode('ISOLATED')
                self._initialized = True
            
            # 현재 포지션 조회
            current_position = await self.get_current_position()
            
            # 신호 처리
            if signal == 'long_entry' and not current_position:
                return await self._open_long(current_price)
            
            elif signal == 'long_exit' and current_position and current_position['side'] == 'long':
                return await self._close_position(current_position)
            
            elif signal == 'short_entry' and not current_position:
                return await self._open_short(current_price)
            
            elif signal == 'short_exit' and current_position and current_position['side'] == 'short':
                return await self._close_position(current_position)
            
            return {
                "status": "no_action",
                "reason": f"No matching condition for signal: {signal}",
                "current_position": current_position
            }
            
        except Exception as e:
            logger.error(f"Live trading execution failed for bot {self.bot.id}: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}
        
        finally:
            # 연결 종료는 서비스 레이어에서 처리
            pass
    
    async def _open_long(self, price: float) -> Dict[str, Any]:
        """롱 포지션 진입"""
        quantity = self._calculate_position_size(price)
        
        logger.info(f"Opening LONG position: {quantity} {self.bot.ticker} @ ~{price}")
        
        # 시장가 매수 주문
        order = await self.exchange.create_market_buy_order(
            symbol=self.bot.ticker,
            amount=quantity
        )
        
        # TP/SL 설정
        await self._set_tp_sl_orders(order, 'long')
        
        return {
            "status": "success",
            "action": "long_entry",
            "order_id": order['id'],
            "price": order.get('average', price),
            "quantity": order['filled'],
            "side": "long"
        }
    
    async def _open_short(self, price: float) -> Dict[str, Any]:
        """숏 포지션 진입"""
        quantity = self._calculate_position_size(price)
        
        logger.info(f"Opening SHORT position: {quantity} {self.bot.ticker} @ ~{price}")
        
        # 시장가 매도 주문
        order = await self.exchange.create_market_sell_order(
            symbol=self.bot.ticker,
            amount=quantity
        )
        
        # TP/SL 설정
        await self._set_tp_sl_orders(order, 'short')
        
        return {
            "status": "success",
            "action": "short_entry",
            "order_id": order['id'],
            "price": order.get('average', price),
            "quantity": order['filled'],
            "side": "short"
        }
    
    async def _close_position(self, position: Dict[str, Any]) -> Dict[str, Any]:
        """포지션 청산"""
        side = position['side']
        quantity = abs(position['size'])
        
        logger.info(f"Closing {side.upper()} position: {quantity} {self.bot.ticker}")
        
        # 롱 포지션은 매도로 청산, 숏 포지션은 매수로 청산
        if side == 'long':
            order = await self.exchange.create_market_sell_order(
                symbol=self.bot.ticker,
                amount=quantity,
                params={'reduceOnly': True}  # 포지션 감소만 (신규 숏 진입 방지)
            )
        else:  # short
            order = await self.exchange.create_market_buy_order(
                symbol=self.bot.ticker,
                amount=quantity,
                params={'reduceOnly': True}
            )
        
        # 기존 TP/SL 주문 취소
        await self._cancel_all_orders()
        
        return {
            "status": "success",
            "action": f"{side}_exit",
            "order_id": order['id'],
            "price": order.get('average'),
            "quantity": order['filled'],
            "pnl": position.get('unrealized_pnl', 0)
        }
    
    async def _set_tp_sl_orders(self, entry_order: Dict, side: str):
        """TP/SL 주문 설정 (바이낸스 선물 방식)"""
        if not self.strategy.tpsl_logic:
            logger.info("No TP/SL logic defined in strategy")
            return
        
        entry_price = entry_order.get('average') or entry_order.get('price')
        quantity = entry_order['filled']
        
        tpsl = self.strategy.tpsl_logic
        
        # Take Profit 설정
        if tpsl.get('take_profit_pct'):
            tp_pct = tpsl['take_profit_pct']
            if side == 'long':
                tp_price = entry_price * (1 + tp_pct / 100)
            else:  # short
                tp_price = entry_price * (1 - tp_pct / 100)
            
            try:
                await self.exchange.create_order(
                    symbol=self.bot.ticker,
                    type='TAKE_PROFIT_MARKET',
                    side='SELL' if side == 'long' else 'BUY',
                    amount=quantity,
                    params={
                        'stopPrice': tp_price,
                        'reduceOnly': True
                    }
                )
                logger.info(f"TP order set at {tp_price}")
            except Exception as e:
                logger.error(f"Failed to set TP order: {e}")
        
        # Stop Loss 설정
        if tpsl.get('stop_loss_pct'):
            sl_pct = tpsl['stop_loss_pct']
            if side == 'long':
                sl_price = entry_price * (1 - sl_pct / 100)
            else:  # short
                sl_price = entry_price * (1 + sl_pct / 100)
            
            try:
                await self.exchange.create_order(
                    symbol=self.bot.ticker,
                    type='STOP_MARKET',
                    side='SELL' if side == 'long' else 'BUY',
                    amount=quantity,
                    params={
                        'stopPrice': sl_price,
                        'reduceOnly': True
                    }
                )
                logger.info(f"SL order set at {sl_price}")
            except Exception as e:
                logger.error(f"Failed to set SL order: {e}")
    
    async def _cancel_all_orders(self):
        """모든 미체결 주문 취소"""
        try:
            await self.exchange.cancel_all_orders(self.bot.ticker)
            logger.info(f"All orders cancelled for {self.bot.ticker}")
        except Exception as e:
            logger.warning(f"Failed to cancel orders: {e}")
    
    async def emergency_close_all(self) -> Dict[str, Any]:
        """긴급 청산: 모든 포지션 즉시 종료"""
        try:
            await self._init_exchange()
            
            # 현재 포지션 조회
            position = await self.get_current_position()
            
            if not position:
                return {"status": "no_position", "message": "No open position to close"}
            
            # 모든 주문 취소
            await self._cancel_all_orders()
            
            # 포지션 청산
            result = await self._close_position(position)
            
            logger.warning(f"EMERGENCY CLOSE executed for bot {self.bot.id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Emergency close failed: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}