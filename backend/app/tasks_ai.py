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
from .database import SyncSessionLocal
from .models import AIModel, AITrainingJob, AIModelStatus

logger = logging.getLogger(__name__)

# AI 모델 저장 기본 경로
AI_MODELS_BASE_PATH = Path(__file__).parent.parent / "ai_models"


@celery_app.task(bind=True, queue="cpu_bound_queue", max_retries=1)
def train_ai_model_task(self, model_id: str, job_id: str):
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
        
        # 5. 학습 실행
        trainer = AIModelTrainer(
            config=pipeline_config,
            save_dir=str(save_dir),
            progress_callback=progress_callback
        )
        
        result = trainer.train(df)
        
        # 6. 성공 - 결과 저장
        ai_model.status = AIModelStatus.COMPLETED
        ai_model.model_weights_path = str(save_dir / "model.onnx")
        ai_model.training_metrics = result.get("training_metrics", {}).get("final_metrics", {})
        ai_model.validation_metrics = {
            "label_stats": result.get("label_stats", {}),
            "best_epoch": result.get("training_metrics", {}).get("best_epoch"),
            "best_val_loss": result.get("training_metrics", {}).get("best_val_loss"),
            "feature_importance": result.get("feature_importance", {}),
        }
        ai_model.feature_config = result.get("feature_config", ai_model.feature_config)
        
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
