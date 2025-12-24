"""
AI Model Training Celery Task
AI 모델 학습을 비동기로 처리하는 Celery 태스크입니다.
기존 cpu_bound_queue를 사용합니다.
"""
import logging
import traceback
import shutil
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from celery import shared_task
from sqlalchemy.orm import Session
import numpy as np

from .celery_app import celery_app
from .database import SyncSessionLocal, AsyncSessionLocal
from .models import AIModel, AITrainingJob, AIModelStatus, AIModelVersion, User, Plan, PlanType
from .services.cost_calculator import cost_calculator_service
from .services.credit_service import credit_service
from .utils.async_utils import run_async
from sqlalchemy.orm import selectinload
import uuid

logger = logging.getLogger(__name__)

# AI 모델 저장 기본 경로
AI_MODELS_BASE_PATH = Path(__file__).parent.parent / "ai_models"


@celery_app.task(bind=True, queue="cpu_bound_queue", max_retries=1)
def train_ai_model_task(self, model_id: str, job_id: str, manual_start_date: str = None, manual_end_date: str = None):
    """
    AI 모델 학습 태스크.
    
    Args:
        model_id: AIModel UUID
        job_id: AITrainingJob UUID
    """
    db: Session = SyncSessionLocal()
    
    try:
        # 1. DB에서 모델 및 작업 조회
        ai_model = db.query(AIModel).filter(AIModel.id == model_id).first()
        training_job = db.query(AITrainingJob).filter(AITrainingJob.id == job_id).first()
        
        if not ai_model or not training_job:
            logger.error(f"Model or job not found: model_id={model_id}, job_id={job_id}")
            return {"status": "error", "message": "Model or job not found"}
        
        # 1.5 수동 재학습 시 날짜 업데이트
        if manual_start_date and manual_end_date:
            try:
                # ISO Format 
                # frontend에서 'YYYY-MM-DD' 또는 ISOString을 보낼 수 있음.
                start_dt = datetime.fromisoformat(str(manual_start_date).replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(str(manual_end_date).replace('Z', '+00:00'))
                
                ai_model.training_start_date = start_dt
                ai_model.training_end_date = end_dt
                logger.info(f"Manual retraining requested. Overriding dates: {start_dt} ~ {end_dt}")
            except Exception as e:
                logger.error(f"Invalid date format for manual retraining: {e}")
                return {"status": "error", "message": f"Invalid date format: {e}"}
        
        # 2. 상태 업데이트
        ai_model.status = AIModelStatus.TRAINING
        training_job.status = "running"
        training_job.started_at = datetime.utcnow()
        training_job.celery_task_id = self.request.id
        db.commit()
        
        logger.info(f"Starting training for model {model_id}")
        
        # 3. OHLCV 데이터 로드
        from .services.market_data_service import MarketDataService
        market_data_service = MarketDataService()
        
        df = market_data_service.get_historical_data_sync(
            ticker=ai_model.training_symbol,
            timeframe=ai_model.training_timeframe,
            start_date=ai_model.training_start_date,
            end_date=ai_model.training_end_date
        )
        
        if df is None or len(df) < 1000:  # 최소 데이터량 체크
            raise ValueError(f"Insufficient data: {len(df) if df is not None else 0} rows")
        
        logger.info(f"Loaded {len(df)} rows of OHLCV data")
        
        # 4. 학습 파이프라인 설정
        from .ai.training.trainer import AIModelTrainer, TrainingPipelineConfig
        
        # 저장 디렉토리 설정
        save_dir = AI_MODELS_BASE_PATH / str(ai_model.user_id) / str(ai_model.id)
        save_dir.mkdir(parents=True, exist_ok=True)
        
        # 진행률 콜백
        def progress_callback(step: int, total: int, metrics: Dict[str, Any]):
            try:
                # 진행률 계산
                base_progress = (step - 1) / total * 100
                
                # 학습 중이면 에폭 기준 세부 진행률
                if metrics.get("phase") == "training" and "epoch" in metrics:
                    epoch_progress = metrics["epoch"] / metrics.get("total_epochs", 100)
                    progress = base_progress + (epoch_progress * (100 / total))
                else:
                    progress = base_progress
                
                # DB 업데이트
                training_job.progress_pct = int(min(progress, 99))
                training_job.current_epoch = metrics.get("epoch")
                training_job.total_epochs = metrics.get("total_epochs")
                training_job.current_metrics = {
                    "train_loss": metrics.get("train_loss"),
                    "val_loss": metrics.get("val_loss"),
                    "phase": metrics.get("phase"),
                }
                
                # 에폭 로그 추가
                if metrics.get("phase") == "training" and "epoch" in metrics:
                    new_log = {
                        "epoch": metrics.get("epoch"),
                        "train_loss": metrics.get("train_loss"),
                        "val_loss": metrics.get("val_loss"),
                        "accuracy": metrics.get("accuracy"),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    if training_job.epoch_logs is None:
                        training_job.epoch_logs = []
                    
                    # 리스트 객체 자체가 변해야 SQLAlchemy가 변경을 감지함 (JSONB Mutable 이슈 방지)
                    updated_logs = list(training_job.epoch_logs)
                    # 중복 에폭 방지 (callback이 여러번 호출될 수 있음)
                    if not updated_logs or updated_logs[-1]["epoch"] != new_log["epoch"]:
                        updated_logs.append(new_log)
                        training_job.epoch_logs = updated_logs
                
                db.commit()
            except Exception as e:
                logger.warning(f"Progress callback error: {e}")
        
        # 파이프라인 설정
        pipeline_config = TrainingPipelineConfig(
            model_type=ai_model.model_type,
            architecture_config=ai_model.architecture_config,
            feature_config=ai_model.feature_config,
            labeling_config=ai_model.labeling_config,
            training_config=ai_model.training_config,
            training_symbol=ai_model.training_symbol,
            training_timeframe=ai_model.training_timeframe,
            training_start_date=ai_model.training_start_date.isoformat(),
            training_end_date=ai_model.training_end_date.isoformat(),
        )

        # 4. 최적화 (Optimized)
        from .ai.inference.onnx_inference import AIModelRegistry
        optimization_config = ai_model.optimization_config
        if optimization_config and optimization_config.get("is_enabled"):
            # Update Phase
            training_job.status = "optimizing"
            db.commit()
            
            # 최적화 진행률 콜백
            def opt_progress_callback(trial_num, total_trials, metrics):
                # 0~80% 구간 사용
                progress = (trial_num / total_trials) * 80
                training_job.progress_pct = int(progress)
                training_job.current_metrics = metrics
                
                # Check for NaN values in metrics to avoid JSON serialization errors
                if metrics.get("best_params"):
                     for k, v in metrics["best_params"].items():
                          if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                               metrics["best_params"][k] = 0

                # Trial log update (optional)
                if "trial_log" in metrics:
                   pass # TODO: Add per-trial logs if needed

                # Update history
                if "best_value" in metrics:
                   # 이전 optimization_result 가져와서 업데이트하거나 새로 덮어쓰기
                   pass

                # Store optimization progress in history or logs if needed
                # Here we just update the current_metrics field for realtime UI
                training_job.current_metrics = {
                    "phase": "optimization",
                    "trial": trial_num,
                    "totalTrials": total_trials,
                    "bestValue": metrics.get("best_value")
                }
                db.commit()

            # Best Model 저장을 위한 임시 경로 설정
            best_model_temp_dir = save_dir / "optimization_best"
            if best_model_temp_dir.exists():
                shutil.rmtree(best_model_temp_dir) # Clean start

            from .ai.training.optimizer import AIOptimizer
            optimizer = AIOptimizer(
                config=pipeline_config,
                optimization_config=optimization_config,
                progress_callback=opt_progress_callback,
                best_model_dir=str(best_model_temp_dir)
            )
            
            # 최적화 실행
            logger.info(f"Starting Optuna optimization for model {model_id}...")
            opt_result = optimizer.optimize(df)
            
            # 결과 저장
            training_job.optimization_result = opt_result
            db.commit()
            
            # Best 파라미터 적용
            best_params = opt_result["best_params"]
            logger.info(f"Optimization finished. Best parameters: {best_params}")
            
            # architecture_config 및 training_config 업데이트
            # trainer.py의 ModelConfig 필드 이름과 일치하도록 매핑
            new_arch = dict(ai_model.architecture_config or {})
            if "hidden_size" in best_params: new_arch["hidden_size"] = best_params["hidden_size"]
            if "num_layers" in best_params: new_arch["num_layers"] = best_params["num_layers"]
            if "dropout" in best_params: new_arch["dropout"] = best_params["dropout"]
            ai_model.architecture_config = new_arch
            
            new_train = dict(ai_model.training_config or {})
            if "learning_rate" in best_params: new_train["learning_rate"] = best_params["learning_rate"]
            if "batch_size" in best_params: new_train["batch_size"] = best_params["batch_size"]
            ai_model.training_config = new_train
            
            # 파이프라인 설정 재로드 (업데이트된 설정 적용)
            pipeline_config.architecture_config = ai_model.architecture_config
            pipeline_config.training_config = ai_model.training_config
            db.commit()

        # 4.5 버전 결정
        last_version = db.query(AIModelVersion).filter(AIModelVersion.model_id == model_id).order_by(AIModelVersion.version_number.desc()).first()
        next_version_num = (last_version.version_number + 1) if last_version else 1
        
        # 5. 최종 모델 결정 (재학습 vs Best Trial 사용)
        final_model_ready = False
        result = {}
        
        # Best Trial 모델이 존재하면 재학습 건너뛰고 사용
        best_model_temp_dir = save_dir / "optimization_best"
        if optimization_config and optimization_config.get("is_enabled") and (best_model_temp_dir / "model.pt").exists():
            logger.info("Found optimized best model artifacts. Skipping final retraining and using the best trial model.")
            
            # 1. 파일 이동
            save_dir.mkdir(parents=True, exist_ok=True)
            
            # model.pt, model.onnx 등 이동
            for item in best_model_temp_dir.iterdir():
                if item.is_file():
                    shutil.copy2(item, save_dir / item.name)
                    
            # 2. Result 로드
            with open(save_dir / "training_result.json", "r") as f:
                result = json.load(f)
                
            # Result path 업데이트
            result["model_path"] = str(save_dir / "model.onnx")
            result["version_number"] = next_version_num
            
            # 3. Epoch Logs 복원 (Frontend 차트용)
            metrics_data = result.get("final_metrics", {}) # This might be just final values, check structure
            # TrainingResult(dataclass)가 asdict로 저장됨.
            # 구조: { "train_loss_history": [...], "val_loss_history": [...], ... }
            
            train_loss_hist = result.get("train_loss_history", [])
            val_loss_hist = result.get("val_loss_history", [])
            accuracy_hist = result.get("accuracy_history", []) # 만약 있다면
            
            reconstructed_logs = []
            for i in range(len(train_loss_hist)):
                log = {
                    "epoch": i + 1,
                    "train_loss": train_loss_hist[i],
                    "val_loss": val_loss_hist[i] if i < len(val_loss_hist) else None,
                    "accuracy": accuracy_hist[i] if i < len(accuracy_hist) else None,
                    "timestamp": datetime.utcnow().isoformat()
                }
                reconstructed_logs.append(log)
            
            training_job.epoch_logs = reconstructed_logs
            
            # 4. Feature Importance 로드 (if exists)
            feature_importance_path = save_dir / "feature_importance.json"
            if feature_importance_path.exists():
                with open(feature_importance_path, "r") as f:
                    result["feature_importance"] = json.load(f)
            else:
                result["feature_importance"] = {}
            
            final_model_ready = True
            
            # Clean up temp dir
            shutil.rmtree(best_model_temp_dir)
            
            # Set progress to 100%
            training_job.progress_pct = 99
            
        else:
            # 5. 최종 모델 학습 실행 (기존 로직)
            logger.info(f"Starting final training (Version {next_version_num}) with best/selected parameters for model {model_id}")
            
            # 진행률 콜백 업데이트 (최종 학습 phase)
            original_callback = progress_callback
            def final_progress_callback(step, total, metrics):
                # 최종 학습 단계를 80~100%로 배분
                base_progress = 80
                if metrics.get("phase") == "training" and "epoch" in metrics:
                    epoch_progress = metrics["epoch"] / metrics.get("total_epochs", 100)
                    progress = base_progress + (epoch_progress * 20)
                    # Client에게는 final_training 상태임을 알림
                    metrics["phase"] = "final_training"
                    
                    # Epoch 완료 시 로그 저장
                    if metrics.get("train_loss") is not None:
                         # 기존 로그 가져오기 (없으면 빈 리스트)
                        current_logs = list(training_job.epoch_logs or [])
                        
                        # 중복 저장 방지 (같은 에폭이 이미 있는지 확인)
                        epoch = metrics["epoch"]
                        if not any(log.get("epoch") == epoch for log in current_logs):
                            new_log = {
                                "epoch": epoch,
                                "trainLoss": metrics.get("train_loss"),
                                "valLoss": metrics.get("val_loss"),
                                "accuracy": metrics.get("val_accuracy") or metrics.get("accuracy"), # 모델에 따라 다를 수 있음
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            current_logs.append(new_log)
                            training_job.epoch_logs = current_logs
                            
                else:
                    progress = base_progress
                
                training_job.progress_pct = int(min(progress, 99))
                original_callback(step, total, metrics)

            trainer = AIModelTrainer(
                config=pipeline_config,
                save_dir=str(save_dir),
                progress_callback=final_progress_callback
            )
            
            result = trainer.train(df, version_number=next_version_num)
        
        # 6. 성공 - 결과 저장
        ai_model.status = AIModelStatus.COMPLETED
        ai_model.model_weights_path = result["model_path"]
        ai_model.training_metrics = result.get("training_metrics", {}).get("final_metrics", {})
        ai_model.validation_metrics = {
            "label_stats": result.get("label_stats", {}),
            "best_epoch": result.get("training_metrics", {}).get("best_epoch"),
            "best_val_loss": result.get("training_metrics", {}).get("best_val_loss"),
            "feature_importance": result.get("feature_importance", {}),
        }
        ai_model.feature_config = result.get("feature_config", ai_model.feature_config)
        
        # Reset all existing versions to inactive before creating new version
        db.query(AIModelVersion).filter(
            AIModelVersion.model_id == ai_model.id
        ).update({"is_active": False})
        
        # AIModelVersion 생성
        new_version = AIModelVersion(
            model_id=ai_model.id,
            version_number=next_version_num,
            training_start_date=ai_model.training_start_date,
            training_end_date=ai_model.training_end_date,
            model_weights_path=result["model_path"],
            metrics=result.get("training_metrics", {}).get("final_metrics", {}),
            is_active=True
        )
        db.add(new_version)
        db.flush()
        
        ai_model.active_version_id = new_version.id
        
        # 다음 재학습 스케줄 설정
        if ai_model.is_auto_retrain_enabled and ai_model.retrain_interval_days:
            from datetime import timedelta
            ai_model.next_retrain_at = datetime.utcnow() + timedelta(days=ai_model.retrain_interval_days)

        # Retention Policy (버전 유지 관리)
        try:
            user = db.query(User).filter(User.id == ai_model.user_id).first()
            limit = 1 # Basic/Free
            
            if user.subscription and user.subscription.status == 'active':
                # PlanType Enum 비교 (이름이 일치한다고 가정)
                plan_name = user.subscription.plan.name
                if plan_name == PlanType.TRADER:
                    limit = 3
                elif plan_name == PlanType.PRO:
                    limit = 5
            
            # 오래된 버전 조회
            versions = db.query(AIModelVersion).filter(AIModelVersion.model_id == model_id).order_by(AIModelVersion.version_number.desc()).all()
            
            if len(versions) > limit:
                to_delete = versions[limit:]
                for v in to_delete:
                    # 파일 삭제 시도
                    try:
                        import os
                        path_obj = Path(v.model_weights_path)
                        if path_obj.exists():
                            os.remove(path_obj)
                            # 상위 v폴더도 비었으면 삭제 (안전하게)
                            if path_obj.parent.name.startswith('v') and not any(path_obj.parent.iterdir()):
                                path_obj.parent.rmdir()
                    except Exception as e:
                        logger.warning(f"Failed to delete version file {v.model_weights_path}: {e}")
                        
                    db.delete(v)
                logger.info(f"Retention policy applied. Limit: {limit}, Deleted: {len(to_delete)}")
                
        except Exception as e:
            logger.error(f"Error applying retention policy: {e}")

        training_job.status = "completed"
        training_job.progress_pct = 100
        training_job.completed_at = datetime.utcnow()
        training_job.current_metrics = result.get("training_metrics", {}).get("final_metrics", {})
        
        db.commit()
        
        logger.info(f"Training completed for model {model_id}")
        
        # [Critical] Clear inference cache to ensure next backtest uses the new model
        try:
            AIModelRegistry.clear_cache(model_id)
            logger.info(f"Cleared inference cache for model {model_id}")
        except Exception as e:
            logger.warning(f"Failed to clear inference cache: {e}")
        
        return {
            "status": "completed",
            "model_id": model_id,
            "model_path": str(save_dir / "model.onnx"),
            "metrics": result.get("training_metrics", {}).get("final_metrics", {}),
        }
        
    except Exception as e:
        # 7. 실패 처리
        logger.error(f"Training failed for model {model_id}: {e}")
        logger.error(traceback.format_exc())
        
        try:
            ai_model = db.query(AIModel).filter(AIModel.id == model_id).first()
            training_job = db.query(AITrainingJob).filter(AITrainingJob.id == job_id).first()
            
            if ai_model:
                ai_model.status = AIModelStatus.FAILED
            if training_job:
                training_job.status = "failed"
                training_job.error_message = str(e)
                training_job.completed_at = datetime.utcnow()
            
            db.commit()
        except Exception as db_error:
            logger.error(f"DB error while handling failure: {db_error}")
        
        return {"status": "failed", "error": str(e)}
    
    finally:
        db.close()


@celery_app.task(queue="cpu_bound_queue")
def check_and_retrain_models():
    """
    주기적 재학습 체크 및 트리거 (Scheduled Task)
    크레딧 차감 로직 포함 (Async Bridge 사용)
    """
    db: Session = SyncSessionLocal()
    try:
        now = datetime.utcnow()
        # 재학습 대상 조회: 활성화됨 + 완료상태 + 재학습 시간 도래
        candidates = db.query(AIModel).filter(
            AIModel.is_auto_retrain_enabled == True,
            AIModel.status == AIModelStatus.COMPLETED,
            AIModel.next_retrain_at <= now
        ).all()

        logger.info(f"Checking for retraining candidates. Found: {len(candidates)}")

        from datetime import timedelta

        for model in candidates:
             # [Credit & Plan Check] Async Logic Execution
             async def _process_credit_check(uid, mid):
                 async with AsyncSessionLocal() as session:
                     # 1. User & Plan Refresh
                     user = await session.get(User, uid, options=[selectinload(User.subscription).selectinload(Subscription.plan)])
                     if not user: return False, "User not found"
                     
                     plan_name = PlanType.BASIC
                     if user.subscription and user.subscription.plan:
                         plan_name = user.subscription.plan.name
                     
                     if plan_name == PlanType.BASIC:
                         return False, "Plan limit (Basic)"

                     # 2. Cost Calc
                     cost_est = await cost_calculator_service.calculate_ai_training_cost(session, user, "retrain")
                     
                     # 3. Deduct
                     try:
                         await credit_service.deduct_credits(
                             session, uid, cost_est.final_cost, 0, "ai_training_auto", mid
                         )
                         await session.commit()
                         return True, None
                     except Exception as e:
                         await session.rollback()
                         return False, str(e)

             success, msg = run_async(_process_credit_check(model.user_id, model.id))
             
             if not success:
                 logger.warning(f"Skipping auto-retrain for {model.id}: {msg}")
                 if msg == "Plan limit (Basic)":
                     model.is_auto_retrain_enabled = False # Disable to prevent loop
                     db.commit()
                 continue

             # Sliding Window 계산
             if model.retrain_data_window_days:
                 new_end = now
                 new_start = new_end - timedelta(days=model.retrain_data_window_days)
                 
                 model.training_start_date = new_start
                 model.training_end_date = new_end
                 
             # Job 생성
             job = AITrainingJob(
                 model_id=model.id,
                 user_id=model.user_id,
                 status="pending",
                 started_at=now
             )
             db.add(job)
             db.flush() # ID 획득
             
             # 재학습 Task Trigger
             train_ai_model_task.delay(str(model.id), str(job.id))
             
             logger.info(f"Triggered scheduled retraining for model {model.id}, job {job.id}")
        
        db.commit()

    except Exception as e:
        logger.error(f"Error in check_and_retrain_models: {e}")
        logger.error(traceback.format_exc())
    finally:
        db.close()
