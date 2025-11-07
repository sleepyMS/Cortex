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
import json
import math
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Tuple

import ccxt
import ccxt.async_support as ccxt_async
import optuna
import pandas as pd
import numpy as np
from celery.utils.log import get_task_logger
from sqlalchemy import select, text, update
from sqlalchemy.orm import joinedload
from sqlalchemy.dialects.postgresql import insert

# --- 모듈 임포트 ---
from .celery_app import celery_app
from .database import AsyncSessionLocal, SyncSessionLocal
# [수정] 최적화 관련 모델 임포트 추가
from .models import (
    BacktestStatus, OptimizationStatus, OptimizationJob, OptimizationTrial,
    OptimizationType, LiveBot, Backtest, BacktestResult, TradeLog
)
from . import models, schemas
from .engine.backtesting_engine import BacktestingEngine
from .utils.communication import WebSocketManager
from .event_bus import publish_event
from .services.market_data_service import market_data_service
from .services.signal_service import signal_service
from .services.marketplace_service import marketplace_service
from .services.notification_service import notification_service 
from .services.subscription_service import subscription_service
from .services.verification_service import verification_service

logger = get_task_logger(__name__)

# ==============================================================================
# Helper Functions (CPU-Bound)
# ==============================================================================

def _apply_params_to_strategy(strategy_snapshot: schemas.StrategyCreate, params: Dict[str, Any]) -> schemas.StrategyCreate:
    """
    Optuna가 제안한 평탄화된 파라미터(예: "long_entry_rules.0.rsi.period": 14)를
    실제 전략 객체의 중첩된 구조에 동적으로 반영하여 새로운 전략 객체를 반환합니다.
    """
    strategy_dict = strategy_snapshot.model_dump()
    for param_path, value in params.items():
        parts = param_path.split('.')
        current = strategy_dict
        for part in parts[:-1]:
            if part.isdigit(): part = int(part)
            if isinstance(current, dict): current = current.get(part)
            elif isinstance(current, list) and isinstance(part, int) and 0 <= part < len(current): current = current[part]
            else: current = None; break
            if current is None: break
        if current is not None:
            last = parts[-1]
            if last.isdigit() and isinstance(current, list): current[int(last)] = value
            elif isinstance(current, dict): current[last] = value
    return schemas.StrategyCreate(**strategy_dict)

def _split_data_expanding_window(df: pd.DataFrame, folds: int) -> List[Dict[str, pd.DataFrame]]:
    """
    [WFO 헬퍼] 데이터를 확장창(Expanding Window) 방식으로 분할합니다.
    """
    n = len(df)
    chunk_size = n // (folds + 1)
    splits = []
    for i in range(folds):
        train_end = (i + 1) * chunk_size
        test_end = (i + 2) * chunk_size if i < folds - 1 else n 
        splits.append({
            'train': df.iloc[0:train_end].copy(),
            'test': df.iloc[train_end:test_end].copy(),
            'fold_index': i
        })
    return splits

# ==============================================================================
# Part 1: CPU-Bound Tasks (최적화, 백테스팅)
# ==============================================================================

@celery_app.task(bind=True, name="run_optimization", queue="cpu_bound_queue", acks_late=True)
def run_optimization(self, job_id: str):
    """
    전략 최적화 메인 태스크. General 및 WFO 모드를 모두 지원하며,
    최종 결과에 파라미터 중요도 분석을 포함합니다.
    """
    logger.info(f"Starting optimization job: {job_id}")
    job_uuid = uuid.UUID(job_id)
    session = SyncSessionLocal()
    
    try:
        # 1. 초기화 및 설정 로드
        job = session.query(OptimizationJob).filter(OptimizationJob.id == job_uuid).one_or_none()
        if not job: raise ValueError(f"Optimization Job {job_id} not found.")
        
        job.status = OptimizationStatus.RUNNING
        session.commit()
        
        config = schemas.OptimizationConfig.model_validate(job.config)
        strategy_data = job.strategy_snapshot if hasattr(job, 'strategy_snapshot') and job.strategy_snapshot else schemas.Strategy.model_validate(job.strategy).model_dump()
        strategy_snapshot = schemas.StrategyCreate.model_validate(strategy_data)

        WebSocketManager.send_status_update(job_id, "running", "데이터 로딩 중...", 5)

        # 2. 데이터 로딩 (단 1회 전체 로딩)
        target_coin = strategy_snapshot.target_coins[0].ticker if strategy_snapshot.target_coins else "BTCUSDT"
        base_ohlcv_df = market_data_service.get_historical_data_sync(
            ticker=target_coin,
            timeframe='1h',
            start_date=config.start_date,
            end_date=config.end_date
        )
        if base_ohlcv_df.empty:
             raise ValueError("최적화를 위한 시세 데이터가 충분하지 않습니다.")

        logger.info(f"Loaded {len(base_ohlcv_df)} rows for optimization.")

        # ----------------------------------------------------------------------
        # 공통 Optuna Objective 함수 Factory
        # ----------------------------------------------------------------------
        def create_objective(target_df: pd.DataFrame, current_capital: float, total_trials_for_progress: int, start_trial_num: int = 0):
            def objective(trial: optuna.Trial):
                # a. 파라미터 샘플링
                suggested_params = {}
                for r in config.parameter_ranges:
                    if isinstance(r.step, int) and isinstance(r.min, int):
                         suggested_params[r.path] = trial.suggest_int(r.path, int(r.min), int(r.max), step=int(r.step))
                    else:
                        suggested_params[r.path] = trial.suggest_float(r.path, r.min, r.max, step=r.step)

                # b. 시그널 재계산 (인메모리)
                current_strategy = _apply_params_to_strategy(strategy_snapshot, suggested_params)
                signals_df = signal_service.generate_signals_from_dataframe(
                    target_df, current_strategy, timeframe='1h'
                )

                # c. 백테스트 실행
                engine = BacktestingEngine(
                    ohlcv_df=target_df,
                    signals_df=signals_df,
                    initial_capital=current_capital,
                    execution_params=config.common_parameters,
                    strategy_params=current_strategy
                )
                result, _ = engine.run()

                # d. 제약 조건 검사 (Pruning)
                for c in config.constraints:
                    val = result.get(f"{c.type}_pct" if c.type in ['mdd', 'win_rate'] else c.type, 0)
                    if c.type == 'min_trades': val = result.get('total_trades', 0)
                    elif c.type == 'profit_factor': val = result.get('profit_factor', 0)
                    
                    if (c.operator == ">=" and val < c.value) or (c.operator == "<=" and val > c.value):
                        raise optuna.TrialPruned()

                # e. 진행률 업데이트
                current_trial_num = start_trial_num + trial.number
                if current_trial_num % 10 == 0:
                    progress_pct = int((current_trial_num / total_trials_for_progress) * 100)
                    WebSocketManager.send_status_update(
                        job_id, "running", 
                        f"진행 중... ({current_trial_num}/{total_trials_for_progress})", 
                        max(10, min(99, progress_pct))
                    )
                
                trial.set_user_attr("metrics", result)
                return result.get(config.objective, -9999)
            return objective

        # ----------------------------------------------------------------------
        # 모드별 실행 로직
        # ----------------------------------------------------------------------
        
        # 메인 Study 변수 (파라미터 중요도 계산용)
        main_study = None

        # === CASE 1: 일반 최적화 (General) ===
        if config.general_settings:
            WebSocketManager.send_status_update(job_id, "running", "최적화 시작...", 10)
            
            n_trials = config.general_settings.trials
            sampler = optuna.samplers.TPESampler(seed=42)
            pruner = optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=0)
            main_study = optuna.create_study(direction="maximize", sampler=sampler, pruner=pruner)
            
            main_study.optimize(
                create_objective(base_ohlcv_df, config.initial_capital, n_trials), 
                n_trials=n_trials, n_jobs=1
            )

            # 결과 저장 (Trial 요약)
            trial_objects = []
            for t in main_study.trials:
                state = "COMPLETE" if t.state == optuna.trial.TrialState.COMPLETE else "PRUNED" if t.state == optuna.trial.TrialState.PRUNED else "FAIL"
                trial_objects.append({
                    "job_id": job_uuid, "trial_number": t.number, "params": t.params,
                    "metrics": t.user_attrs.get("metrics"), "state": state
                })
            session.bulk_insert_mappings(OptimizationTrial, trial_objects)
            
            # 최종 결과 업데이트 (나중에 중요도 추가됨)
            best = main_study.best_trial
            job.result_summary = {
                "best_trial_id": best.number,
                "best_params": best.params,
                "best_metrics": best.user_attrs.get("metrics"),
                "score": best.value
            }

        # === CASE 2: 워크포워드 최적화 (WFO) ===
        elif config.wfo_settings:
            folds = config.wfo_settings.folds
            trials_per_fold = config.wfo_settings.trials_per_fold
            total_wfo_trials = folds * trials_per_fold

            splits = _split_data_expanding_window(base_ohlcv_df, folds)
            
            wfo_fold_results = []
            stitched_equity_curve = []
            current_balance = config.initial_capital
            global_trial_counter = 0

            for i, split in enumerate(splits):
                fold_idx = i + 1
                logger.info(f"Starting WFO Fold {fold_idx}/{folds}...")
                start_progress = 10 + int((i / folds) * 80)
                WebSocketManager.send_status_update(job_id, "running", f"WFO 구간 {fold_idx}/{folds} 진행 중...", start_progress)

                sampler = optuna.samplers.TPESampler(seed=42 + i) 
                pruner = optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=0)
                current_study = optuna.create_study(direction="maximize", sampler=sampler, pruner=pruner)
                
                if i == folds - 1:
                    main_study = current_study

                current_study.optimize(
                    create_objective(split['train'], config.initial_capital, total_wfo_trials, global_trial_counter),
                    n_trials=trials_per_fold, n_jobs=1
                )
                
                trial_objects = []
                for t in current_study.trials:
                    global_trial_counter += 1
                    state = "COMPLETE" if t.state == optuna.trial.TrialState.COMPLETE else "PRUNED" if t.state == optuna.trial.TrialState.PRUNED else "FAIL"
                    trial_objects.append({
                        "job_id": job_uuid, "trial_number": global_trial_counter,
                        "params": t.params, "metrics": t.user_attrs.get("metrics"), "state": state,
                    })
                session.bulk_insert_mappings(OptimizationTrial, trial_objects)
                session.commit()

                best_params = current_study.best_trial.params
                best_strategy = _apply_params_to_strategy(strategy_snapshot, best_params)
                oos_signals = signal_service.generate_signals_from_dataframe(split['test'], best_strategy, timeframe='1h')
                oos_engine = BacktestingEngine(
                    ohlcv_df=split['test'], signals_df=oos_signals,
                    initial_capital=current_balance,
                    execution_params=config.common_parameters, strategy_params=best_strategy
                )
                oos_result, _ = oos_engine.run()
                
                current_balance = oos_result['final_equity']
                wfo_fold_results.append({
                    "fold_index": i,
                    "is_start": split['train'].index[0].isoformat(),
                    "is_end": split['train'].index[-1].isoformat(),
                    "oos_start": split['test'].index[0].isoformat(),
                    "oos_end": split['test'].index[-1].isoformat(),
                    "best_params": best_params,
                    "in_sample_metrics": current_study.best_trial.user_attrs.get("metrics"),
                    "out_of_sample_metrics": oos_result
                })
                stitched_equity_curve.extend(oos_result.get('pnl_curve_json', []))

            job.wfo_result = {
                "folds": wfo_fold_results,
                "oos_curve": stitched_equity_curve,
                "final_equity": current_balance,
                "total_return_pct": ((current_balance - config.initial_capital) / config.initial_capital) * 100
            }
            job.result_summary = {"wfo_completed": True, "final_return_pct": job.wfo_result['total_return_pct']}

        # --- [추가] 파라미터 중요도 계산 (공통) ---
        if main_study:
            try:
                importance_dict = optuna.importance.get_param_importances(main_study)
                parameter_importance = [
                    {"param": key, "importance": value} 
                    for key, value in importance_dict.items()
                ]
                # 기존 result_summary 딕셔너리에 중요도 정보 추가
                summary = dict(job.result_summary) if job.result_summary else {}
                summary["parameter_importance"] = parameter_importance
                job.result_summary = summary
            except Exception as e:
                logger.warning(f"Could not calculate parameter importance: {e}")

        # --- 공통 완료 처리 ---
        job.status = OptimizationStatus.COMPLETED
        job.completed_at = datetime.now(timezone.utc)
        session.commit()

        WebSocketManager.send_status_update(job_id, "completed", "최적화가 완료되었습니다.", 100)
        logger.info(f"Optimization job {job_id} completed successfully.")

    except Exception as exc:
        logger.error(f"Optimization job {job_id} failed: {exc}", exc_info=True)
        try:
            job.status = OptimizationStatus.FAILED
            session.commit()
        except: pass
        WebSocketManager.send_status_update(job_id, "failed", f"실패: {str(exc)}", 0)
        # 치명적 오류는 재시도하지 않음

    finally:
        session.close()

@celery_app.task(bind=True, name="run_backtest", queue="cpu_bound_queue", acks_late=True)
def run_backtest(self, backtest_id: str):
    """
    [최종 안정화 버전] 단일 백테스팅 실행 태스크.
    """
    logger.info(f"Starting backtest: {backtest_id}")
    backtest_uuid = uuid.UUID(backtest_id)
    session = SyncSessionLocal()
    backtest = None 

    try:
        # --- 단계 1: 경쟁 상태 해결을 위한 DB 조회 및 대기 루프 ---
        for attempt in range(5):
            backtest = session.query(Backtest).filter(Backtest.id == backtest_uuid).one_or_none()
            if backtest: break
            time.sleep(1)
        
        if not backtest:
            raise ValueError(f"Backtest ID {backtest_id} not found.")
        
        WebSocketManager.send_status_update(backtest_id, "running", "백테스트 초기화 중...", 5)
        
        if backtest.status != BacktestStatus.PENDING:
             return f"Aborted: Status is {backtest.status}"
            
        backtest.status = BacktestStatus.RUNNING
        session.commit()
        
        params_from_db = schemas.BacktestParametersPayload.model_validate(backtest.parameters)
        snapshot_as_strategy = schemas.StrategyForSnapshot.model_validate(backtest.strategy_snapshot)

        # --- 단계 2~6: 기존 로직과 동일 ---
        WebSocketManager.send_status_update(backtest_id, "running", "매매 신호 생성 중...", 25)
        signals_df, calculation_base_tf = asyncio.run(signal_service.generate_signals(request=snapshot_as_strategy))

        WebSocketManager.send_status_update(backtest_id, "running", "시세 데이터 로딩 중...", 50)
        ticker = snapshot_as_strategy.target_coins[0].ticker if snapshot_as_strategy.target_coins else "BTCUSDT"
        ohlcv_df = market_data_service.get_historical_data_sync(
            ticker=ticker, timeframe=calculation_base_tf,
            start_date=params_from_db.start_date, end_date=params_from_db.end_date   
        )
        if ohlcv_df.empty: raise ValueError("시세 데이터 부족")

        WebSocketManager.send_status_update(backtest_id, "running", "시뮬레이션 실행 중...", 75)
        engine = BacktestingEngine(
            ohlcv_df=ohlcv_df, signals_df=signals_df, initial_capital=params_from_db.initial_capital,
            execution_params=params_from_db.parameters,
            strategy_params=schemas.StrategyCreate.model_validate(snapshot_as_strategy.model_dump())
        )
        summary, trade_logs = engine.run()

        WebSocketManager.send_status_update(backtest_id, "running", "결과 저장 중...", 90)
        session.query(BacktestResult).filter_by(backtest_id=backtest_uuid).delete()
        session.query(TradeLog).filter_by(backtest_id=backtest_uuid).delete()
        session.flush()

        new_result = BacktestResult(backtest_id=backtest_uuid, **summary)
        session.add(new_result)
        if trade_logs:
            session.bulk_insert_mappings(TradeLog, [{**log, "backtest_id": backtest_uuid} for log in trade_logs])

        backtest.status = BacktestStatus.COMPLETED
        backtest.completed_at = datetime.now(timezone.utc)
        session.commit()

        publish_event("backtest.completed", {"backtest_id": backtest_id, "user_id": str(backtest.user_id)})
        WebSocketManager.send_status_update(backtest_id, "completed", "완료됨", 100)
        return f"Backtest {backtest_id} completed."

    except Exception as exc:
        logger.error(f"Backtest {backtest_id} failed: {exc}", exc_info=True)
        user_id = str(backtest.user_id) if backtest else "unknown"
        publish_event("backtest.failed", {"backtest_id": backtest_id, "user_id": user_id, "error": str(exc)})
        WebSocketManager.send_status_update(backtest_id, "failed", f"오류: {str(exc)}", 0)
        raise self.retry(exc=exc, countdown=60, max_retries=3)
    finally:
        session.close()


# ==============================================================================
# Part 2: I/O-Bound Tasks (자동매매, 데이터 수집 등)
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
            exchange = ccxt.binanceusdm()
            logger.info(f"Starting sync OHLCV fetch for {ticker} ({timeframe})")
            ticker = ticker.replace('/', '')

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
    
@celery_app.task(name="fulfill_order_task", queue="io_bound_queue", bind=True)
def fulfill_order_task(self, payload: dict):
    """ [윈도우 호환] 결제 완료 주문 이행 (asyncio.run 래퍼 사용)"""
    order_id = payload.get("order_id")
    gateway_transaction_id = payload.get("gateway_transaction_id")
    
    logger.info(f"Starting fulfillment for order ID: {order_id}")
    
    async def _fulfill():
        # [핵심] 세션을 헬퍼 함수 내부에서 생성
        async with AsyncSessionLocal() as session:
            try:
                await marketplace_service.fulfill_order(session, uuid.UUID(order_id), gateway_transaction_id)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Critical error fulfilling order {order_id}: {e}", exc_info=True)
                # 예외를 다시 발생시켜 Celery가 재시도하게 함
                raise e 

    try:
        return asyncio.run(_fulfill())
    except Exception as exc:
        # asyncio.run()에서 발생한 예외를 잡아 Celery 재시도 로직으로 전달
        raise self.retry(exc=exc, countdown=10, max_retries=3)


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
        ticker = snapshot_as_strategy.target_coins[0].ticker if snapshot_as_strategy.target_coins else "BTCUSDT"
        
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
# Helper Functions
# ==============================================================================

def _apply_params_to_strategy(strategy_snapshot: schemas.StrategyCreate, params: Dict[str, Any]) -> schemas.StrategyCreate:
    """
    Optuna가 제안한 평탄화된 파라미터(예: "long_entry_rules.0.rsi.period": 14)를
    실제 전략 객체의 중첩된 구조에 동적으로 반영하여 새로운 전략 객체를 반환합니다.
    """
    strategy_dict = strategy_snapshot.model_dump()
    for param_path, value in params.items():
        parts = param_path.split('.')
        current = strategy_dict
        for part in parts[:-1]:
            if part.isdigit(): part = int(part)
            if isinstance(current, dict): current = current.get(part)
            elif isinstance(current, list) and isinstance(part, int) and 0 <= part < len(current): current = current[part]
            else: current = None; break
            if current is None: break
        if current is not None:
            last = parts[-1]
            if last.isdigit() and isinstance(current, list): current[int(last)] = value
            elif isinstance(current, dict): current[last] = value
    return schemas.StrategyCreate(**strategy_dict)

def _split_data_expanding_window(df: pd.DataFrame, folds: int) -> List[Dict[str, pd.DataFrame]]:
    """
    [WFO 헬퍼] 데이터를 확장창(Expanding Window) 방식으로 분할합니다.
    - 전체 데이터를 (folds + 1)개의 균일한 청크로 나눕니다.
    - Fold N:
      - Train(IS): 청크 0 ~ N
      - Test(OOS): 청크 N+1
    """
    n = len(df)
    chunk_size = n // (folds + 1)
    splits = []
    for i in range(folds):
        train_end = (i + 1) * chunk_size
        test_end = (i + 2) * chunk_size if i < folds - 1 else n # 마지막 구간은 끝까지 포함
        
        splits.append({
            'train': df.iloc[0:train_end].copy(),
            'test': df.iloc[train_end:test_end].copy(),
            'fold_index': i
        })
    return splits


@celery_app.task(bind=True, name="run_optimization", queue="cpu_bound_queue", acks_late=True)
def run_optimization(self, job_id: str):
    """
    전략 최적화 메인 태스크. General 및 WFO 모드를 모두 지원합니다.
    """
    logger.info(f"Starting optimization job: {job_id}")
    job_uuid = uuid.UUID(job_id)
    session = SyncSessionLocal()
    
    try:
        # 1. 초기화 및 설정 로드
        job = session.query(OptimizationJob).filter(OptimizationJob.id == job_uuid).one_or_none()
        if not job: raise ValueError(f"Optimization Job {job_id} not found.")
        
        job.status = OptimizationStatus.RUNNING
        session.commit()
        
        config = schemas.OptimizationConfig.model_validate(job.config)
        # strategy_snapshot 컬럼이 있다고 가정 (실제 모델에 추가 필요)
        # 없다면 job.strategy를 사용하여 스냅샷 생성
        strategy_data = job.strategy_snapshot if hasattr(job, 'strategy_snapshot') and job.strategy_snapshot else schemas.Strategy.model_validate(job.strategy).model_dump()
        strategy_snapshot = schemas.StrategyCreate.model_validate(strategy_data)

        WebSocketManager.send_status_update(job_id, "running", "데이터 로딩 중...", 5)

        # 2. 데이터 로딩 (단 1회 전체 로딩)
        target_coin = strategy_snapshot.target_coins[0].ticker if strategy_snapshot.target_coins else "BTCUSDT"
        base_ohlcv_df = market_data_service.get_historical_data_sync(
            ticker=target_coin,
            timeframe='1h', # 최적화는 기본 1시간봉으로 진행 (추후 config에서 설정 가능하도록 확장)
            start_date=config.start_date,
            end_date=config.end_date
        )
        if base_ohlcv_df.empty:
             raise ValueError("최적화를 위한 시세 데이터가 충분하지 않습니다.")

        logger.info(f"Loaded {len(base_ohlcv_df)} rows for optimization.")

        # ----------------------------------------------------------------------
        # 공통 Optuna Objective 함수 Factory
        # ----------------------------------------------------------------------
        def create_objective(target_df: pd.DataFrame, current_capital: float, total_trials_for_progress: int, start_trial_num: int = 0):
            def objective(trial: optuna.Trial):
                # a. 파라미터 샘플링
                suggested_params = {}
                for r in config.parameter_ranges:
                    if isinstance(r.step, int) and isinstance(r.min, int):
                         suggested_params[r.path] = trial.suggest_int(r.path, int(r.min), int(r.max), step=int(r.step))
                    else:
                        suggested_params[r.path] = trial.suggest_float(r.path, r.min, r.max, step=r.step)

                # b. 시그널 재계산 (인메모리)
                current_strategy = _apply_params_to_strategy(strategy_snapshot, suggested_params)
                signals_df = signal_service.generate_signals_from_dataframe(
                    target_df, current_strategy, timeframe='1h'
                )

                # c. 백테스트 실행
                engine = BacktestingEngine(
                    ohlcv_df=target_df,
                    signals_df=signals_df,
                    initial_capital=current_capital,
                    execution_params=config.common_parameters,
                    strategy_params=current_strategy
                )
                result, _ = engine.run()

                # d. 제약 조건 검사 (Pruning)
                for c in config.constraints:
                    val = result.get(f"{c.type}_pct" if c.type in ['mdd', 'win_rate'] else c.type, 0)
                    if c.type == 'min_trades': val = result.get('total_trades', 0)
                    elif c.type == 'profit_factor': val = result.get('profit_factor', 0)
                    
                    if (c.operator == ">=" and val < c.value) or (c.operator == "<=" and val > c.value):
                        raise optuna.TrialPruned()

                # e. 진행률 업데이트 (매 10번째 시도마다)
                current_trial_num = start_trial_num + trial.number
                if current_trial_num % 10 == 0:
                    progress_pct = int((current_trial_num / total_trials_for_progress) * 100)
                    WebSocketManager.send_status_update(
                        job_id, "running", 
                        f"진행 중... ({current_trial_num}/{total_trials_for_progress})", 
                        max(10, min(99, progress_pct))
                    )
                
                # 결과 기록
                trial.set_user_attr("metrics", result)
                return result.get(config.objective, -9999) # 목표값 반환 (없으면 매우 낮은 값)
            return objective

        # ----------------------------------------------------------------------
        # 모드별 실행 로직
        # ----------------------------------------------------------------------
        
        # 메인 Study 변수 (나중에 파라미터 중요도 계산에 사용)
        main_study = None 

        # === CASE 1: 일반 최적화 (General) ===
        if config.general_settings:
            WebSocketManager.send_status_update(job_id, "running", "최적화 시작...", 10)
            
            n_trials = config.general_settings.trials
            sampler = optuna.samplers.TPESampler(seed=42)
            pruner = optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=0)
            main_study = optuna.create_study(direction="maximize", sampler=sampler, pruner=pruner)
            
            # 전체 데이터에 대해 최적화 실행
            main_study.optimize(
                create_objective(base_ohlcv_df, config.initial_capital, n_trials), 
                n_trials=n_trials, n_jobs=1
            )

            # 결과 저장 (Trial 요약)
            logger.info("Saving General optimization trials...")
            trial_objects = []
            for t in main_study.trials:
                state = "COMPLETE" if t.state == optuna.trial.TrialState.COMPLETE else "PRUNED" if t.state == optuna.trial.TrialState.PRUNED else "FAIL"
                trial_objects.append({
                    "job_id": job_uuid, "trial_number": t.number, "params": t.params,
                    "metrics": t.user_attrs.get("metrics"), "state": state
                })
            # 대량 데이터 삽입
            session.bulk_insert_mappings(OptimizationTrial, trial_objects)
            
            # 최종 결과 업데이트
            best = main_study.best_trial
            job.result_summary = {
                "best_trial_id": best.number,
                "best_params": best.params,
                "best_metrics": best.user_attrs.get("metrics"),
                "score": best.value
            }

        # === CASE 2: 워크포워드 최적화 (WFO) ===
        elif config.wfo_settings:
            folds = config.wfo_settings.folds
            trials_per_fold = config.wfo_settings.trials_per_fold
            total_wfo_trials = folds * trials_per_fold

            splits = _split_data_expanding_window(base_ohlcv_df, folds)
            
            wfo_fold_results = []
            stitched_equity_curve = []
            current_balance = config.initial_capital
            
            global_trial_counter = 0 # 전체 Trial ID 고유성을 위한 카운터

            for i, split in enumerate(splits):
                fold_idx = i + 1
                logger.info(f"Starting WFO Fold {fold_idx}/{folds}...")
                # 각 폴드 시작 시 진행률 업데이트 (전체 진행률 기준)
                start_progress = 10 + int((i / folds) * 80)
                WebSocketManager.send_status_update(job_id, "running", f"WFO 구간 {fold_idx}/{folds} 진행 중...", start_progress)

                # 1. IS(In-Sample) 최적화
                # 각 폴드마다 새로운 Study를 생성하여 이전 학습 내용에 영향을 받지 않도록 함
                sampler = optuna.samplers.TPESampler(seed=42 + i) 
                pruner = optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=0)
                current_study = optuna.create_study(direction="maximize", sampler=sampler, pruner=pruner)
                
                # 마지막 폴드의 study를 main_study로 지정하여 파라미터 중요도 계산에 사용 (선택 사항)
                if i == folds - 1:
                    main_study = current_study

                current_study.optimize(
                    create_objective(split['train'], config.initial_capital, total_wfo_trials, global_trial_counter),
                    n_trials=trials_per_fold, n_jobs=1
                )
                
                # 각 Fold의 Trial 결과 저장
                trial_objects = []
                for t in current_study.trials:
                    global_trial_counter += 1
                    state = "COMPLETE" if t.state == optuna.trial.TrialState.COMPLETE else "PRUNED" if t.state == optuna.trial.TrialState.PRUNED else "FAIL"
                    trial_objects.append({
                        "job_id": job_uuid, "trial_number": global_trial_counter,
                        "params": t.params, "metrics": t.user_attrs.get("metrics"), "state": state,
                        # "fold_index": i  # 모델에 fold_index 컬럼이 있다면 추가 권장
                    })
                session.bulk_insert_mappings(OptimizationTrial, trial_objects)
                session.commit() # 각 폴드 끝날 때마다 커밋하여 데이터 손실 방지

                # 2. OOS(Out-of-Sample) 테스트
                best_params = current_study.best_trial.params
                best_strategy = _apply_params_to_strategy(strategy_snapshot, best_params)
                
                oos_signals = signal_service.generate_signals_from_dataframe(split['test'], best_strategy, timeframe='1h')
                oos_engine = BacktestingEngine(
                    ohlcv_df=split['test'], signals_df=oos_signals,
                    initial_capital=current_balance, # [핵심] 이전 구간의 최종 잔액을 이어서 사용
                    execution_params=config.common_parameters, strategy_params=best_strategy
                )
                oos_result, _ = oos_engine.run()
                
                # 3. 결과 기록
                current_balance = oos_result['final_equity'] # 다음 구간 시작 잔액 업데이트
                
                wfo_fold_results.append({
                    "fold_index": i,
                    "is_start": split['train'].index[0].isoformat(),
                    "is_end": split['train'].index[-1].isoformat(),
                    "oos_start": split['test'].index[0].isoformat(),
                    "oos_end": split['test'].index[-1].isoformat(),
                    "best_params": best_params,
                    "in_sample_metrics": current_study.best_trial.user_attrs.get("metrics"),
                    "out_of_sample_metrics": oos_result
                })
                # 자산 곡선 이어붙이기 (시간순 정렬 보장 필요)
                stitched_equity_curve.extend(oos_result.get('pnl_curve_json', []))

            # WFO 최종 결과 저장
            job.wfo_result = {
                "folds": wfo_fold_results,
                "oos_curve": stitched_equity_curve,
                "final_equity": current_balance,
                "total_return_pct": ((current_balance - config.initial_capital) / config.initial_capital) * 100
            }
            # WFO에서는 '최고의 단일 결과'가 애매하므로 최종 수익률 등으로 대체
            job.result_summary = {
                "wfo_completed": True, 
                "final_return_pct": job.wfo_result['total_return_pct'],
                "final_equity": current_balance
            }

        # --- 파라미터 중요도 계산 (공통) ---
        # main_study가 존재하는 경우에만 계산 (WFO의 경우 마지막 폴드 기준 또는 전체 통합 데이터 기준 가능)
        if main_study:
            try:
                importance_dict = optuna.importance.get_param_importances(main_study)
                parameter_importance = [
                    {"param": key, "importance": value} 
                    for key, value in importance_dict.items()
                ]
                # 기존 result_summary에 중요도 정보 추가
                if job.result_summary:
                    job.result_summary["parameter_importance"] = parameter_importance
                else:
                    job.result_summary = {"parameter_importance": parameter_importance}
            except Exception as e:
                logger.warning(f"Could not calculate parameter importance: {e}")

        # --- 공통 완료 처리 ---
        job.status = OptimizationStatus.COMPLETED
        job.completed_at = datetime.now(timezone.utc)
        session.commit()

        WebSocketManager.send_status_update(job_id, "completed", "최적화가 완료되었습니다.", 100)
        logger.info(f"Optimization job {job_id} completed successfully.")

    except Exception as exc:
        logger.error(f"Optimization job {job_id} failed: {exc}", exc_info=True)
        try:
            job.status = OptimizationStatus.FAILED
            session.commit()
        except: pass
        WebSocketManager.send_status_update(job_id, "failed", f"실패: {str(exc)}", 0)
        # 치명적 오류는 재시도하지 않음 (Optuna 내부 오류 등은 재시도해도 같을 확률이 높음)

    finally:
        session.close()

# ==============================================================================
# Part 3: Event-Driven Tasks
# ==============================================================================

# --- 이벤트 구독자 (Subscribers) ---

@celery_app.task(name="send_purchase_notification_task", queue="io_bound_queue", bind=True)
def send_purchase_notification_task(self, payload: dict):
    """ [윈도우 호환] 구매 완료 알림 (asyncio.run 래퍼 사용)"""
    order_id = payload.get("order_id")
    logger.info(f"Event received: Sending purchase notification for order {order_id}")

    async def _send():
        # 이 함수는 DB 접근이 없으므로 세션이 필요 없음
        await notification_service.send_purchase_confirmation(payload)
            
    try:
        return asyncio.run(_send())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@celery_app.task(name="send_backtest_notification_task", queue="io_bound_queue", bind=True)
def send_backtest_notification_task(self, event_name: str, payload: dict):
    """ [윈도우 호환] 백테스트 알림 (asyncio.run 래퍼 사용)"""
    backtest_id = payload.get("backtest_id")
    logger.info(f"Event received: Sending backtest notification for {backtest_id} ({event_name})")
    
    async def _send():
        # [핵심] 세션을 헬퍼 함수 내부에서 생성
        async with AsyncSessionLocal() as session:
            if event_name == "backtest.completed":
                await notification_service.send_backtest_completed_notification(session, backtest_id)
            elif event_name == "backtest.failed":
                pass
            
    try:
        return asyncio.run(_send())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60, max_retries=3)


@celery_app.task(name="handle_recurring_payment_success_task", queue="io_bound_queue", bind=True)
def handle_recurring_payment_success_task(self, payload: dict):
    """ [윈도우 호환] 구독 갱신 (asyncio.run 래퍼 사용)"""
    customer_key = payload.get("customer_key")
    payment_data = payload.get("payment_data")
    logger.info(f"Event received: Renewing subscription for user {customer_key}")
    
    async def _process():
        # [핵심] 세션을 헬퍼 함수 내부에서 생성
        async with AsyncSessionLocal() as session:
            await subscription_service.activate_or_update_subscription(
                db=session, customer_key=customer_key, payment_data=payment_data
            )
    
    try:
        return asyncio.run(_process())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10, max_retries=3)


@celery_app.task(name="handle_recurring_payment_failure_task", queue="io_bound_queue", bind=True)
def handle_recurring_payment_failure_task(self, payload: dict):
    """ [윈도우 호환] 구독 실패 처리 (asyncio.run 래퍼 사용)"""
    customer_key = payload.get("customer_key")
    failure_data = payload.get("failure_data")
    logger.info(f"Event received: Canceling subscription for user {customer_key}")

    async def _process():
        # [핵심] 세션을 헬퍼 함수 내부에서 생성
        async with AsyncSessionLocal() as session:
            await subscription_service.handle_subscription_payment_failure(
                db=session, customer_key=customer_key, failure_data=failure_data
            )

    try:
        return asyncio.run(_process())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10, max_retries=3)


@celery_app.task(name="send_verification_email_task", queue="io_bound_queue", bind=True)
def send_verification_email_task(self, payload: dict):
    """ [윈도우 호환] 이메일 인증 (asyncio.run 래퍼 사용)"""
    # ... (payload 추출) ...
    user_id = payload.get("user_id")
    email = payload.get("email")
    token_string = payload.get("token_string")
    base_url = payload.get("base_url")

    # verification_service의 함수 시그니처에 맞게 임시 User 객체 생성
    # (DB에 접근하지 않음)
    temp_user = models.User(
        id=uuid.UUID(user_id), 
        email=email, 
        username=payload.get("username")
    )
    logger.info(f"Event received: Sending verification email to {email} (User ID: {user_id})")
    
    
    async def _send():
        # 이 함수는 DB 접근이 없으므로 세션이 필요 없음
        await verification_service.send_prepared_verification_email(
            temp_user, token_string, base_url
        )
            
    try:
        return asyncio.run(_send())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60, max_retries=3)

# --- (이하 모든 알림 태스크도 동일한 패턴으로 수정) ---

@celery_app.task(name="send_subscription_created_task", queue="io_bound_queue", bind=True)
def send_subscription_created_task(self, payload: dict):
    """ [윈도우 호환] 구독 환영 (asyncio.run 래퍼 사용)"""
    logger.info(f"Event received: Sending subscription WELCOME email to {payload.get('user_email')}")
    
    async def _send():
        await notification_service.send_subscription_created_email(payload)
            
    try:
        return asyncio.run(_send())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60, max_retries=3)

@celery_app.task(name="send_subscription_renewed_task", queue="io_bound_queue", bind=True)
def send_subscription_renewed_task(self, payload: dict):
    """ [윈도우 호환] 구독 갱신 (asyncio.run 래퍼 사용)"""
    logger.info(f"Event received: Sending subscription RENEWAL email to {payload.get('user_email')}")
    
    async def _send():
        await notification_service.send_subscription_renewed_email(payload)
            
    try:
        return asyncio.run(_send())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60, max_retries=3)

@celery_app.task(name="send_subscription_failed_task", queue="io_bound_queue", bind=True)
def send_subscription_failed_task(self, payload: dict):
    """ [윈도우 호환] 구독 실패 (asyncio.run 래퍼 사용)"""
    logger.info(f"Event received: Sending subscription FAILED email to {payload.get('user_email')}")
    
    async def _send():
        await notification_service.send_subscription_failed_email(payload)
            
    try:
        return asyncio.run(_send())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60, max_retries=3)


# --- 중앙 이벤트 분배기 (Dispatcher) ---

EVENT_SUBSCRIBERS = {
    "payment.succeeded": ["fulfill_order_task"],
    "order.fulfilled": ["send_purchase_notification_task"],
    "backtest.completed": ["send_backtest_notification_task"],
    "backtest.failed": ["send_backtest_notification_task"],
    "subscription.recurring_payment.succeeded": ["handle_recurring_payment_success_task"],
    "subscription.recurring_payment.failed": ["handle_recurring_payment_failure_task"],
    "user.needs_verification": ["send_verification_email_task"],
    "subscription.created": ["send_subscription_created_task"],
    "subscription.renewed": ["send_subscription_renewed_task"],
    "subscription.payment.failed": ["send_subscription_failed_task"],
}

@celery_app.task(name="dispatch_event", queue="io_bound_queue")
def dispatch_event(event_name: str, payload: dict):
    """발행된 이벤트를 받아 적절한 구독자 태스크들에게 전달하는 중앙 분배기."""
    if task_names := EVENT_SUBSCRIBERS.get(event_name):
        logger.info(f"Dispatching event '{event_name}' to tasks: {task_names}")
        for task_name in task_names:
            # 이벤트 이름 대신 페이로드 전체를 전달
            if event_name in ["backtest.completed", "backtest.failed"]:
                 celery_app.send_task(task_name, args=[event_name, payload])
            else:
                 celery_app.send_task(task_name, args=[payload])