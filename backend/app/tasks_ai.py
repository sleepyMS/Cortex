"""
AI Model Training Celery Task
AI 모델 학습을 비동기로 처리하는 Celery 태스크입니다.
기존 cpu_bound_queue를 사용합니다.
"""
import logging
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from celery import shared_task
from sqlalchemy.orm import Session

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
        
        # 4.5 버전 결정
        last_version = db.query(AIModelVersion).filter(AIModelVersion.model_id == model_id).order_by(AIModelVersion.version_number.desc()).first()
        next_version_num = (last_version.version_number + 1) if last_version else 1
        
        # 5. 학습 실행
        trainer = AIModelTrainer(
            config=pipeline_config,
            save_dir=str(save_dir),
            progress_callback=progress_callback
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
                        import shutil
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
