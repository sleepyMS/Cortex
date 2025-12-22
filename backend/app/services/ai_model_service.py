"""
AI Model Service
AI 모델 CRUD 및 학습 관리 서비스입니다.
"""
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session

from ..models import AIModel, AITrainingJob, AIModelStatus, User
from ..tasks_ai import train_ai_model_task

logger = logging.getLogger(__name__)

# AI 모델 저장 기본 경로
AI_MODELS_BASE_PATH = Path(__file__).parent.parent.parent / "ai_models"


class AIModelService:
    """AI 모델 관리 서비스"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_and_train(
        self,
        user: User,
        name: str,
        description: Optional[str],
        model_type: str,
        architecture_config: Dict[str, Any],
        feature_config: Dict[str, Any],
        labeling_config: Dict[str, Any],
        training_config: Dict[str, Any],
        training_symbol: str,
        training_timeframe: str,
        training_start_date: datetime,
        training_end_date: datetime,
    ) -> Dict[str, Any]:
        """
        AI 모델 생성 및 학습 시작
        
        Returns:
            {"model": AIModel, "job": AITrainingJob, "task_id": str}
        """
        # 1. AIModel 생성
        ai_model = AIModel(
            id=uuid.uuid4(),
            user_id=user.id,
            name=name,
            description=description,
            model_type=model_type,
            architecture_config=architecture_config,
            feature_config=feature_config,
            labeling_config=labeling_config,
            training_config=training_config,
            training_symbol=training_symbol,
            training_timeframe=training_timeframe,
            training_start_date=training_start_date,
            training_end_date=training_end_date,
            status=AIModelStatus.PENDING,
        )
        self.db.add(ai_model)
        self.db.flush()
        
        # 2. AITrainingJob 생성
        training_job = AITrainingJob(
            id=uuid.uuid4(),
            model_id=ai_model.id,
            user_id=user.id,
            status="pending",
            progress_pct=0,
            total_epochs=training_config.get("epochs", 100),
        )
        self.db.add(training_job)
        self.db.commit()
        
        # 3. Celery 태스크 시작
        task = train_ai_model_task.delay(
            str(ai_model.id),
            str(training_job.id)
        )
        
        # 4. Task ID 저장
        training_job.celery_task_id = task.id
        self.db.commit()
        
        logger.info(f"AI model training started: model_id={ai_model.id}, task_id={task.id}")
        
        return {
            "model": ai_model,
            "job": training_job,
            "task_id": task.id,
        }
    
    def get_model(self, model_id: str, user_id: Optional[str] = None) -> Optional[AIModel]:
        """모델 조회"""
        query = self.db.query(AIModel).filter(AIModel.id == model_id)
        if user_id:
            query = query.filter(AIModel.user_id == user_id)
        return query.first()
    
    def list_models(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AIModel]:
        """사용자의 모델 목록 조회"""
        query = self.db.query(AIModel).filter(AIModel.user_id == user_id)
        
        if status:
            query = query.filter(AIModel.status == status)
        
        return query.order_by(AIModel.created_at.desc()).offset(offset).limit(limit).all()
    
    def get_training_status(self, model_id: str) -> Optional[AITrainingJob]:
        """학습 상태 조회"""
        return self.db.query(AITrainingJob)\
            .filter(AITrainingJob.model_id == model_id)\
            .order_by(AITrainingJob.created_at.desc())\
            .first()
    
    def delete_model(self, model_id: str, user_id: str) -> bool:
        """모델 삭제"""
        model = self.get_model(model_id, user_id)
        if not model:
            return False
        
        # 파일 삭제
        if model.model_weights_path:
            model_dir = Path(model.model_weights_path).parent
            if model_dir.exists():
                import shutil
                shutil.rmtree(model_dir, ignore_errors=True)
                logger.info(f"Deleted model files: {model_dir}")
        
        # DB 삭제 (CASCADE로 training_jobs도 삭제됨)
        self.db.delete(model)
        self.db.commit()
        
        logger.info(f"Deleted AI model: {model_id}")
        return True
    
    def get_public_models(
        self,
        limit: int = 50,
        offset: int = 0
    ) -> List[AIModel]:
        """공개 모델 목록 조회 (마켓플레이스용)"""
        return self.db.query(AIModel)\
            .filter(AIModel.is_public == True)\
            .filter(AIModel.status == AIModelStatus.COMPLETED)\
            .order_by(AIModel.created_at.desc())\
            .offset(offset)\
            .limit(limit)\
            .all()
    
    def set_public(self, model_id: str, user_id: str, is_public: bool) -> Optional[AIModel]:
        """모델 공개 설정"""
        model = self.get_model(model_id, user_id)
        if not model:
            return None
        
        model.is_public = is_public
        self.db.commit()
        return model
