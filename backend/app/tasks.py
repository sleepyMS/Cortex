# file: backend/app/tasks.py
"""
Cortex 프로젝트의 모든 Celery 백그라운드 작업을 정의합니다.

이 파일은 CPU 바운드 작업과 I/O 바운드 작업을 분리하여 처리하는
고성능 아키텍처를 따릅니다. 각 작업은 지정된 전용 큐에서 실행됩니다.
"""

import asyncio
import time
import uuid
import json
import math
import sys
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Tuple, Optional

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
# 모델 임포트 통합
from .models import (
    BacktestStatus, OptimizationStatus, OptimizationJob, OptimizationTrial,
    OptimizationType, LiveBot, Backtest, BacktestResult, TradeLog, User
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

# WFO 시 지표 안정화를 위한 Warm-up 캔들 수
WARMUP_CANDLES = 1000

# ==============================================================================
# Helper Functions (CPU-Bound)
# ==============================================================================

def _apply_params_to_strategy(strategy_snapshot: schemas.StrategyCreate, params: Dict[str, Any]) -> schemas.StrategyCreate:
    """
    Optuna가 제안한 평탄화된 파라미터를 실제 전략 객체의 중첩된 구조에 동적으로 반영합니다.
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

def _split_data_expanding_window(df: pd.DataFrame, folds: int, warmup: int = WARMUP_CANDLES) -> List[Dict[str, Any]]:
    """
    [WFO 헬퍼] 데이터를 확장창(Expanding Window) 방식으로 분할합니다.
    Warm-up 버퍼를 포함하여 지표 계산 안정성을 확보합니다.
    """
    n = len(df)
    chunk_size = n // (folds + 1)
    splits = []
    for i in range(folds):
        train_end_idx = (i + 1) * chunk_size
        test_end_idx = (i + 2) * chunk_size if i < folds - 1 else n
        
        train_df = df.iloc[0:train_end_idx].copy()
        test_warmup_start_idx = max(0, train_end_idx - warmup)
        test_df_with_warmup = df.iloc[test_warmup_start_idx:test_end_idx].copy()
        actual_test_start_time = df.index[train_end_idx]

        splits.append({
            'fold_index': i,
            'train': train_df,
            'test_with_warmup': test_df_with_warmup,
            'test_start_time': actual_test_start_time
        })
    return splits

# ==============================================================================
# Part 1: CPU-Bound Tasks (최적화, 백테스팅)
# ==============================================================================

@celery_app.task(bind=True, name="run_optimization", queue="cpu_bound_queue", acks_late=True)
def run_optimization(self, job_id: str):
    """
    전략 최적화 메인 태스크. General 및 WFO 모드를 모두 지원하며,
    실시간 가지치기(Intermediate Pruning)와 파라미터 중요도 분석을 포함합니다.
    """
    logger.info(f"Starting optimization job: {job_id}")
    job_uuid = uuid.UUID(job_id)
    session = SyncSessionLocal()
    
    try:
        # 1. 초기화 및 설정 로드
        job = None
        for attempt in range(5):
            job = session.query(OptimizationJob).filter(OptimizationJob.id == job_uuid).one_or_none()
            if job: break
            logger.warning(f"Optimization Job {job_id} not found on attempt {attempt + 1}. Retrying...")
            time.sleep(1) # 1초 대기 후 재시도

        if not job: raise ValueError(f"Optimization Job {job_id} not found after retries.")
        
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
                try:
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

                    # c. 백테스트 실행 (실시간 가지치기 적용)
                    engine = BacktestingEngine(
                        ohlcv_df=target_df,
                        signals_df=signals_df,
                        initial_capital=current_capital,
                        execution_params=config.common_parameters,
                        strategy_params=current_strategy
                    )
                    
                    result = None
                    # [핵심] 단계별 실행 및 중간 보고
                    for intermediate in engine.run_step_by_step():
                        if intermediate.get("is_intermediate"):
                            # Optuna에게 중간 성과(MDD) 보고. (MDD는 낮을수록 좋으므로 음수 처리)
                            # 여기서는 MDD를 기준으로 가지치기한다고 가정합니다.
                            step = int(intermediate["progress"] * 100)
                            trial.report(-intermediate["mdd_pct"], step=step)
                            if trial.should_prune():
                                raise optuna.TrialPruned()
                        else:
                            result = intermediate

                    if not result: raise ValueError("Backtest produced no result")

                    # d. 제약 조건 검사 (완료 후 Pruning)
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

                except optuna.TrialPruned:
                    raise
                except Exception as e:
                    logger.warning(f"Optimization Trial {trial.number} failed unexpectedly: {e}")
                    trial.set_user_attr("error", str(e))
                    return -sys.maxsize

            return objective

        # ----------------------------------------------------------------------
        # 모드별 실행 로직
        # ----------------------------------------------------------------------
        
        main_study = None

        # === CASE 1: 일반 최적화 (General) ===
        if config.general_settings:
            WebSocketManager.send_status_update(job_id, "running", "최적화 시작...", 10)
            
            n_trials = config.general_settings.trials
            sampler = optuna.samplers.TPESampler(seed=42)
            # [핵심] MedianPruner 설정 (초기 5회는 무조건 실행하여 기준 데이터 확보)
            pruner = optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=10) # 처음 10% 구간은 봐줌
            main_study = optuna.create_study(direction="maximize", sampler=sampler, pruner=pruner)
            
            main_study.optimize(
                create_objective(base_ohlcv_df, config.initial_capital, n_trials), 
                n_trials=n_trials, n_jobs=1
            )

            logger.info("Saving General optimization trials...")
            trial_objects = []
            for t in main_study.trials:
                state = "FAIL" if t.user_attrs.get("error") else ("COMPLETE" if t.state == optuna.trial.TrialState.COMPLETE else "PRUNED" if t.state == optuna.trial.TrialState.PRUNED else "FAIL")
                trial_objects.append({
                    "job_id": job_uuid, "trial_id": t.number, "params": t.params,
                    "metrics": t.user_attrs.get("metrics"), "state": state
                })
            session.bulk_insert_mappings(OptimizationTrial, trial_objects)
            
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
            splits = _split_data_expanding_window(base_ohlcv_df, folds, WARMUP_CANDLES)
            
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
                pruner = optuna.pruners.MedianPruner(n_startup_trials=5, n_warmup_steps=10)
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
                    state = "FAIL" if t.user_attrs.get("error") else ("COMPLETE" if t.state == optuna.trial.TrialState.COMPLETE else "PRUNED" if t.state == optuna.trial.TrialState.PRUNED else "FAIL")
                    trial_objects.append({
                        "job_id": job_uuid, "trial_id": global_trial_counter,
                        "params": t.params, "metrics": t.user_attrs.get("metrics"), "state": state,
                    })
                session.bulk_insert_mappings(OptimizationTrial, trial_objects)
                session.commit()

                # OOS 테스트
                best_params = current_study.best_trial.params
                best_strategy = _apply_params_to_strategy(strategy_snapshot, best_params)
                
                # a. Warm-up 포함 데이터로 신호 생성
                oos_signals_with_warmup = signal_service.generate_signals_from_dataframe(
                    split['test_with_warmup'], best_strategy, timeframe='1h'
                )

                # b. 실제 테스트 구간으로 데이터 자르기
                actual_start = split['test_start_time']
                real_test_ohlcv = split['test_with_warmup'].loc[actual_start:]
                real_test_signals = oos_signals_with_warmup.loc[actual_start:]

                # c. 백테스팅 실행 (OOS는 Pruning 없이 끝까지 실행)
                oos_engine = BacktestingEngine(
                    ohlcv_df=real_test_ohlcv, 
                    signals_df=real_test_signals,
                    initial_capital=current_balance,
                    execution_params=config.common_parameters, 
                    strategy_params=best_strategy
                )
                # OOS는 run_step_by_step이 아닌 run()으로 한 번에 실행해도 무방함
                oos_result, _ = oos_engine.run()
                
                if 'final_equity' in oos_result:
                     current_balance = oos_result['final_equity']
                     del oos_result['final_equity'] # 저장 시 에러 방지

                wfo_fold_results.append({
                    "fold_index": i,
                    "is_start": split['train'].index[0].isoformat(),
                    "is_end": split['train'].index[-1].isoformat(),
                    "oos_start": real_test_ohlcv.index[0].isoformat(),
                    "oos_end": real_test_ohlcv.index[-1].isoformat(),
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

        # --- 파라미터 중요도 계산 (공통) ---
        if main_study:
            try:
                importance_dict = optuna.importance.get_param_importances(main_study)
                parameter_importance = [
                    {"param": key, "importance": value} 
                    for key, value in importance_dict.items()
                ]
                summary = dict(job.result_summary) if job.result_summary else {}
                summary["parameter_importance"] = parameter_importance
                job.result_summary = summary
            except Exception as e:
                logger.warning(f"Could not calculate parameter importance: {e}")

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
        for attempt in range(5):
            backtest = session.query(Backtest).filter(Backtest.id == backtest_uuid).one_or_none()
            if backtest: break
            time.sleep(1)
        
        if not backtest: raise ValueError(f"Backtest ID {backtest_id} not found.")
        
        WebSocketManager.send_status_update(backtest_id, "running", "백테스트 초기화 중...", 5)
        
        if backtest.status != BacktestStatus.PENDING:
             return f"Aborted: Status is {backtest.status}"
            
        backtest.status = BacktestStatus.RUNNING
        session.commit()
        
        params_from_db = schemas.BacktestParametersPayload.model_validate(backtest.parameters)
        snapshot_as_strategy = schemas.StrategyForSnapshot.model_validate(backtest.strategy_snapshot)

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

        for key in ['final_equity', 'is_intermediate']:
            if key in summary:
                del summary[key]

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
# Part 2: I/O-Bound Tasks (기존 태스크들)
# ==============================================================================

async def _run_single_bot_cycle_async(bot: LiveBot) -> dict:
    """
    [비동기 헬퍼] 한 개의 활성 봇에 대한 거래 로직을 한 번 실행하고 결과를 반환합니다.
    """
    try:
        # TODO: 실제 자동매매 로직 구현 필요 (현재는 더미)
        await asyncio.sleep(0.1) 

        async with AsyncSessionLocal() as session:
            stmt = update(LiveBot).where(LiveBot.id == bot.id).values(last_run_at=datetime.now(timezone.utc))
            await session.execute(stmt)
            await session.commit()

        return {"bot_id": bot.id, "status": "success"}
    except Exception as e:
        logger.error(f"Bot ID {bot.id}: [ASYNC] Cycle failed: {e}", exc_info=True)
        return {"bot_id": bot.id, "status": "failed", "error": str(e)}

@celery_app.task(name="run_all_active_bots", queue="io_bound_queue")
def run_all_active_bots():
    """[하이브리드 디스패처] 모든 활성 봇 동시 실행"""
    async def _run_all_concurrently():
        bots_to_run = []
        with SyncSessionLocal() as session:
            result = session.execute(
                select(LiveBot)
                .options(joinedload(LiveBot.strategy), joinedload(LiveBot.api_key))
                .filter(LiveBot.status.in_(['active', 'initializing']))
            )
            bots_to_run = result.scalars().all()
            
            if not bots_to_run: return "No active bots."
            
            for bot in bots_to_run:
                if bot.status == 'initializing':
                    bot.status = 'active'
                    session.add(bot)
            session.commit()

        bot_tasks = [_run_single_bot_cycle_async(bot) for bot in bots_to_run]
        results = await asyncio.gather(*bot_tasks, return_exceptions=True)
        success_count = sum(1 for r in results if isinstance(r, dict) and r.get("status") == "success")
        return f"Processed {len(bots_to_run)} bots. Success: {success_count}"

    return asyncio.run(_run_all_concurrently())

@celery_app.task(bind=True, name="fetch_and_store_ohlcv", queue="io_bound_queue")
def fetch_and_store_ohlcv(self, ticker: str, timeframe: str, since: int = None, limit: int = 1000): # limit 기본값 1000으로 상향 권장
    """[동기] 단일 회차 OHLCV 데이터 수집 태스크 (주기적 실행용)"""
    try:
        with SyncSessionLocal() as session:
            exchange = ccxt.binanceusdm()
            ticker_norm = ticker.replace('/', '')
            # CCXT를 통해 데이터 가져오기
            ohlcv = exchange.fetch_ohlcv(ticker_norm, timeframe, since=since, limit=limit)
            
            # 저장 로직은 서비스에게 위임
            saved_count = market_data_service.save_ohlcv_data_sync(session, ticker_norm, timeframe, ohlcv)
            return f"Stored {saved_count} records for {ticker_norm} ({timeframe})."
    except ccxt.NetworkError as e:
        self.retry(exc=e, countdown=60)
    except Exception as e:
        raise self.retry(exc=e, countdown=60)

@celery_app.task(bind=True, name="backfill_ohlcv", queue="io_bound_queue")
def backfill_ohlcv(self, ticker: str, timeframe: str, start_date_str: str):
    """
    [신규] 대량의 과거 데이터를 수집하기 위한 백필 태스크.
    start_date_str 부터 현재까지 루프를 돌며 데이터를 모두 수집합니다.
    예: backfill_ohlcv.delay("BTCUSDT", "1h", "2020-01-01T00:00:00Z")
    """
    logger.info(f"Starting backfill for {ticker} ({timeframe}) from {start_date_str}")
    
    # 시작 시간을 밀리초 타임스탬프로 변환
    start_dt = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
    since = int(start_dt.timestamp() * 1000)
    
    total_saved = 0
    exchange = ccxt.binanceusdm()
    ticker_norm = ticker.replace('/', '')

    try:
        with SyncSessionLocal() as session:
            while True:
                # 1. 데이터 요청 (최대 1000개씩)
                logger.info(f"Fetching {ticker} ({timeframe}) since {datetime.fromtimestamp(since/1000, tz=timezone.utc)}...")
                ohlcv = exchange.fetch_ohlcv(ticker_norm, timeframe, since=since, limit=1000)
                
                if not ohlcv:
                    logger.info("No more data to fetch.")
                    break
                
                # 2. 데이터 저장
                saved_count = market_data_service.save_ohlcv_data_sync(session, ticker_norm, timeframe, ohlcv)
                total_saved += saved_count
                
                # 3. 다음 루프 준비
                # 가져온 데이터의 마지막 캔들 시간 + 1ms를 다음 since로 설정
                last_candle_time = ohlcv[-1][0]
                
                # [중요] 만약 이번에 가져온 데이터가 현재 시간과 매우 가깝다면 루프 종료
                if last_candle_time >= (datetime.now(timezone.utc).timestamp() * 1000) - (60 * 1000): # 1분 정도 여유
                     break
                     
                since = last_candle_time + 1 
                
                # 4. API 레이트 리밋 준수를 위한 대기
                time.sleep(exchange.rateLimit / 1000 * 1.5) # 안전하게 약간 더 대기

        logger.info(f"Backfill completed. Total {total_saved} records saved for {ticker} ({timeframe}).")
        return f"Backfilled {total_saved} records."

    except Exception as e:
        logger.error(f"Backfill failed: {e}", exc_info=True)
        # 백필은 오래 걸리므로 자동 재시도보다는 로그를 남기고 종료하는 것이 나을 수 있음
        raise e

@celery_app.task(name="fulfill_order_task", queue="io_bound_queue", bind=True)
def fulfill_order_task(self, payload: dict):
    """주문 이행 태스크"""
    order_id = payload.get("order_id")
    gateway_transaction_id = payload.get("gateway_transaction_id")
    async def _fulfill():
        async with AsyncSessionLocal() as session:
            try:
                await marketplace_service.fulfill_order(session, uuid.UUID(order_id), gateway_transaction_id)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Critical error fulfilling order {order_id}: {e}", exc_info=True)
                raise e 
    try: return asyncio.run(_fulfill())
    except Exception as exc: raise self.retry(exc=exc, countdown=10, max_retries=3)

# --- 알림 및 기타 이벤트 태스크 ---

@celery_app.task(name="send_purchase_notification_task", queue="io_bound_queue", bind=True)
def send_purchase_notification_task(self, payload: dict):
    async def _send(): await notification_service.send_purchase_confirmation(payload)
    try: return asyncio.run(_send())
    except Exception as exc: raise self.retry(exc=exc, countdown=60, max_retries=3)

@celery_app.task(name="send_backtest_notification_task", queue="io_bound_queue", bind=True)
def send_backtest_notification_task(self, event_name: str, payload: dict):
    async def _send():
        async with AsyncSessionLocal() as session:
            if event_name == "backtest.completed":
                await notification_service.send_backtest_completed_notification(session, payload.get("backtest_id"))
    try: return asyncio.run(_send())
    except Exception as exc: raise self.retry(exc=exc, countdown=60, max_retries=3)

@celery_app.task(name="handle_recurring_payment_success_task", queue="io_bound_queue", bind=True)
def handle_recurring_payment_success_task(self, payload: dict):
    async def _process():
        async with AsyncSessionLocal() as session:
            await subscription_service.activate_or_update_subscription(session, payload.get("customer_key"), payload.get("payment_data"))
    try: return asyncio.run(_process())
    except Exception as exc: raise self.retry(exc=exc, countdown=10, max_retries=3)

@celery_app.task(name="handle_recurring_payment_failure_task", queue="io_bound_queue", bind=True)
def handle_recurring_payment_failure_task(self, payload: dict):
    async def _process():
        async with AsyncSessionLocal() as session:
            await subscription_service.handle_subscription_payment_failure(session, payload.get("customer_key"), payload.get("failure_data"))
    try: return asyncio.run(_process())
    except Exception as exc: raise self.retry(exc=exc, countdown=10, max_retries=3)

@celery_app.task(name="send_verification_email_task", queue="io_bound_queue", bind=True)
def send_verification_email_task(self, payload: dict):
    temp_user = models.User(id=uuid.UUID(payload.get("user_id")), email=payload.get("email"), username=payload.get("username"))
    async def _send(): await verification_service.send_prepared_verification_email(temp_user, payload.get("token_string"), payload.get("base_url"))
    try: return asyncio.run(_send())
    except Exception as exc: raise self.retry(exc=exc, countdown=60, max_retries=3)

@celery_app.task(name="send_subscription_created_task", queue="io_bound_queue", bind=True)
def send_subscription_created_task(self, payload: dict):
    async def _send(): await notification_service.send_subscription_created_email(payload)
    try: return asyncio.run(_send())
    except Exception as exc: raise self.retry(exc=exc, countdown=60, max_retries=3)

@celery_app.task(name="send_subscription_renewed_task", queue="io_bound_queue", bind=True)
def send_subscription_renewed_task(self, payload: dict):
    async def _send(): await notification_service.send_subscription_renewed_email(payload)
    try: return asyncio.run(_send())
    except Exception as exc: raise self.retry(exc=exc, countdown=60, max_retries=3)

@celery_app.task(name="send_subscription_failed_task", queue="io_bound_queue", bind=True)
def send_subscription_failed_task(self, payload: dict):
    async def _send(): await notification_service.send_subscription_failed_email(payload)
    try: return asyncio.run(_send())
    except Exception as exc: raise self.retry(exc=exc, countdown=60, max_retries=3)

@celery_app.task(name="dispatch_event", queue="io_bound_queue")
def dispatch_event(event_name: str, payload: dict):
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
    if task_names := EVENT_SUBSCRIBERS.get(event_name):
        for task_name in task_names:
            args = [event_name, payload] if event_name in ["backtest.completed", "backtest.failed"] else [payload]
            celery_app.send_task(task_name, args=args)