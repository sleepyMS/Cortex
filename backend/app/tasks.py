# file: backend/app/tasks.py (UPDATED)

from celery import Celery
from sqlalchemy.orm import Session
# from fastapi import HTTPException # 👈 HTTPException은 라우터에서만 사용, 여기서는 불필요
import logging
from datetime import datetime, timezone
import time

from .celery_app import celery_app # 👈 celery_app을 별도 파일에서 임포트
# 👈 database 모듈에서 SessionLocal과 engine_celery를 모두 임포트
from .database import SessionLocal, engine_celery 
from . import models # 모델 임포트
from .security import decrypt_data # 👈 API 키 복호화를 위해 임포트
# TODO: 실제 트레이딩 클라이언트 (CCXT) 임포트 필요 (pip install ccxt)
# import ccxt

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, default_retry_delay=300, max_retries=3)
def run_backtest_task(self, backtest_id: int):
    """
    실제 백테스팅 시뮬레이션을 실행하는 Celery 태스크.
    장시간 소요되는 작업이므로 비동기로 처리됩니다.
    """
    db: Session = None # 초기화
    try:
        # 👈 Celery 태스크 내에서는 Celery 전용 엔진을 바인딩하여 세션 생성
        db = SessionLocal(bind=engine_celery) 
        backtest = db.query(models.Backtest).filter(models.Backtest.id == backtest_id).first()

        if not backtest:
            logger.error(f"Backtest record with ID {backtest_id} not found for Celery task.")
            return

        # 이미 완료/실패/취소된 작업이면 다시 실행하지 않음 (멱등성)
        if backtest.status in ['completed', 'failed', 'canceled']:
            logger.info(f"Backtest ID {backtest_id} already in final status ({backtest.status}). Skipping task execution.")
            return

        backtest.status = 'running'
        backtest.updated_at = datetime.now(timezone.utc)
        db.add(backtest)
        db.commit() # 상태 업데이트 커밋
        db.refresh(backtest)
        logger.info(f"Backtest ID {backtest_id} started. Status: running.")

        # --- 실제 백테스팅 시뮬레이션 로직 (Placeholder) ---
        simulation_successful = True 
        
        if simulation_successful:
            result_summary_data = {
                "total_return_pct": 15.5, "mdd_pct": 8.2, "sharpe_ratio": 1.2, "win_rate_pct": 60.0,
                "pnl_curve_json": [{"time": "2023-01-01T00:00:00Z", "value": 10000}, {"time": "2023-12-31T00:00:00Z", "value": 11550}],
                "trade_summary_json": {"total_trades": 100, "winning_trades": 60}
            }
            trade_logs_data = [
                {"timestamp": "2023-01-15T10:00:00Z", "side": "buy", "price": 20000, "quantity": 0.5, "commission": 0.1, "pnl": 0.0, "current_balance": 10000},
                {"timestamp": "2023-01-20T10:00:00Z", "side": "sell", "price": 21000, "quantity": 0.5, "commission": 0.1, "pnl": 500.0, "current_balance": 10500}
            ]
            
            backtest_result = models.BacktestResult(
                backtest_id=backtest.id, total_return_pct=result_summary_data["total_return_pct"],
                mdd_pct=result_summary_data["mdd_pct"], sharpe_ratio=result_summary_data["sharpe_ratio"],
                win_rate_pct=result_summary_data["win_rate_pct"], pnl_curve_json=result_summary_data["pnl_curve_json"],
                trade_summary_json=result_summary_data["trade_summary_json"], executed_at=datetime.now(timezone.utc)
            )
            db.add(backtest_result)

            for log_data in trade_logs_data:
                trade_log = models.TradeLog(
                    backtest_id=backtest.id, timestamp=datetime.fromisoformat(log_data["timestamp"]),
                    side=log_data["side"], price=log_data["price"], quantity=log_data["quantity"],
                    commission=log_data["commission"], pnl=log_data["pnl"], current_balance=log_data["current_balance"]
                )
                db.add(trade_log)

            backtest.status = 'completed'
            backtest.completed_at = datetime.now(timezone.utc)
            logger.info(f"Backtest ID {backtest_id} completed successfully.")
        else:
            backtest.status = 'failed'
            backtest.completed_at = datetime.now(timezone.utc)
            logger.error(f"Backtest ID {backtest_id} failed during simulation.")
        
        db.add(backtest)
        db.commit()
        db.refresh(backtest)

    except Exception as exc:
        logger.error(f"Backtest ID {backtest_id} encountered an error: {exc}", exc_info=True)
        if db:
            db.rollback()
            backtest = db.query(models.Backtest).filter(models.Backtest.id == backtest_id).first()
            if backtest:
                backtest.status = 'failed'
                backtest.completed_at = datetime.now(timezone.utc)
                db.add(backtest)
                db.commit()
                logger.info(f"Backtest ID {backtest_id} marked as failed after error.")
    finally:
        if db:
            db.close()


@celery_app.task(bind=True, default_retry_delay=30, max_retries=5)
def run_live_bot_task(self, bot_id: int):
    db: Session = None
    try:
        # 👈 Celery 태스크 내에서는 Celery 전용 엔진을 바인딩하여 세션 생성
        db = SessionLocal(bind=engine_celery) 
        bot = db.query(models.LiveBot).filter(models.LiveBot.id == bot_id).first()

        if not bot:
            logger.error(f"LiveBot record with ID {bot_id} not found for Celery task. Aborting.")
            return

        if bot.status == 'stopped':
            logger.info(f"LiveBot ID {bot_id} is already stopped. Aborting task execution.")
            return
        
        if bot.status != 'active':
            bot.status = 'active'
            bot.updated_at = datetime.now(timezone.utc)
            db.add(bot)
            db.commit()
            db.refresh(bot)
            logger.info(f"LiveBot ID {bot_id} status updated to 'active'.")

        api_key_record = bot.api_key
        if not api_key_record:
            logger.error(f"LiveBot ID {bot_id}: API Key record not found. Aborting.")
            bot.status = 'error'
            bot.stopped_at = datetime.now(timezone.utc)
            db.add(bot)
            db.commit()
            db.refresh(bot)
            return

        plain_api_key = decrypt_data(api_key_record.api_key_encrypted)
        plain_secret_key = decrypt_data(api_key_record.secret_key_encrypted)
        
        # TODO: 여기에 CCXT 등 거래소 클라이언트 초기화
        logger.info(f"LiveBot ID {bot_id}: API key decrypted and exchange client initialized for {api_key_record.exchange}.")


        # --- 봇 메인 실행 루프 ---
        logger.info(f"LiveBot ID {bot_id}: Starting main trading loop.")
        while True:
            try:
                # 최신 봇 상태를 DB에서 다시 로드
                # 이전에 db.is_active를 확인하는 로직을 제거했으므로, db.refresh가 세션 유효성을 테스트
                db.refresh(bot) 
            except Exception as e:
                logger.warning(f"LiveBot ID {bot_id}: DB session refresh failed. Attempting to re-acquire session. Error: {e}", exc_info=True)
                db.close() # 기존 세션 닫기
                db = SessionLocal(bind=engine_celery) # 👈 세션 재연결 시 Celery 엔진 사용
                bot = db.query(models.LiveBot).filter(models.LiveBot.id == bot_id).first()
                if not bot:
                    logger.error(f"LiveBot ID {bot_id}: Bot not found after DB session re-initialization. Exiting loop.")
                    break # 봇을 찾을 수 없으면 종료

            if bot.status == 'paused':
                logger.info(f"LiveBot ID {bot_id} is paused. Waiting...")
                time.sleep(30)
                continue
            elif bot.status == 'stopped':
                logger.info(f"LiveBot ID {bot_id} received stop command. Exiting loop.")
                break
            elif bot.status == 'error':
                logger.error(f"LiveBot ID {bot_id} is in 'error' status. Exiting loop.")
                break

            # TODO: 여기에 실제 트레이딩 로직 구현
            logger.info(f"LiveBot ID {bot_id}: Executing trading logic for strategy {bot.strategy_id}...")
            
            bot.last_run_at = datetime.now(timezone.utc)
            db.add(bot)
            db.commit()
            db.refresh(bot)

            time.sleep(60)

        bot.status = 'stopped'
        bot.stopped_at = datetime.now(timezone.utc)
        db.add(bot)
        db.commit()
        db.refresh(bot)
        logger.info(f"LiveBot ID {bot_id} gracefully stopped. Status: stopped.")

    except Exception as exc:
        logger.error(f"LiveBot ID {bot_id} encountered an error: {exc}", exc_info=True)
        if db:
            db.rollback()
            bot_reloaded = db.query(models.LiveBot).filter(models.LiveBot.id == bot_id).first()
            if bot_reloaded:
                bot_reloaded.status = 'error'
                bot_reloaded.stopped_at = datetime.now(timezone.utc)
                db.add(bot_reloaded)
                db.commit()
                logger.info(f"LiveBot ID {bot_id} marked as error after unexpected exception.")
    finally:
        if db:
            db.close()