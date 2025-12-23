"""
AI Model Service (Async)
AI 모델 CRUD 및 학습 관리 서비스입니다.
크레딧 시스템 및 플랜 제한이 적용되었습니다.
"""
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, desc, update
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from ..models import AIModel, AITrainingJob, AIModelStatus, User, PlanType, Subscription, Plan, AIModelVersion
from ..tasks_ai import train_ai_model_task
from ..schemas import CostEstimationResponse

# 순환 참조 방지를 위해 함수 내부 import 고려 또는 서비스 import
from .cost_calculator import cost_calculator_service
from .credit_service import credit_service

logger = logging.getLogger(__name__)

# AI 모델 저장 기본 경로
AI_MODELS_BASE_PATH = Path(__file__).parent.parent.parent / "ai_models"


class AIModelService:
    """AI 모델 관리 서비스 (Async)"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_and_train(
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
        optimization_config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        AI 모델 생성 및 학습 시작
        
        Returns:
            {"model": AIModel, "job": AITrainingJob, "task_id": str}
        """
        # [Step 0] 비용 계산 및 크레딧 차감

        cost_estimation = await cost_calculator_service.calculate_ai_training_cost(
            self.db, user, training_type="new",
            start_date=training_start_date,
            end_date=training_end_date,
            timeframe=training_timeframe,
            epochs=training_config.get("epochs", 100)
        )
        
        # 최적화 사용 시 n_trials 만큼 곱함
        if optimization_config and optimization_config.get("is_enabled"):
            n_trials = optimization_config.get("n_trials", 20)
            cost_estimation.original_cost *= n_trials
            cost_estimation.final_cost *= n_trials
            # Sufficient 잔액 체크는 deduct_credits 내부에서 수행되므로 여기서는 값만 업데이트
        
        # 크레딧 차감 (Transactional)
        # related_entity_id는 나중에 Job ID로 업데이트하거나, 여기서 미리 UUID 생성 후 사용
        # 여기서는 Job 생성 후 업데이트 방식 대신, Job ID를 미리 생성하여 연결
        job_id = uuid.uuid4()
        model_id = uuid.uuid4()
        
        await credit_service.deduct_credits(
            self.db,
            user.id,
            cost_estimation.final_cost,
            cost_estimation.discount_pct,
            related_entity_type="AI_TRAINING",
            related_entity_id=job_id
        )

        # 1. AIModel 생성
        ai_model = AIModel(
            id=model_id,
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
            optimization_config=optimization_config,
            status=AIModelStatus.PENDING,
        )
        self.db.add(ai_model)
        
        # 2. AITrainingJob 생성
        training_job = AITrainingJob(
            id=job_id,
            model_id=ai_model.id,
            user_id=user.id,
            status="pending",
            progress_pct=0,
            total_epochs=training_config.get("epochs", 100),
            started_at=datetime.utcnow()
        )
        self.db.add(training_job)
        await self.db.flush()
        
        # 3. Celery 태스크 시작
        start_str = training_start_date.isoformat() if training_start_date else None
        end_str = training_end_date.isoformat() if training_end_date else None
        
        # 주의: train_ai_model_task는 celery task이므로 .delay() 호출
        # (Celery는 비동기 함수가 아니므로 await 하지 않음)
        task = train_ai_model_task.delay(
            str(ai_model.id),
            str(training_job.id),
            manual_start_date=start_str,
            manual_end_date=end_str
        )
        
        # 4. Task ID 저장
        training_job.celery_task_id = task.id
        await self.db.commit() # 최종 커밋
        
        logger.info(f"AI model training started: model_id={ai_model.id}, task_id={task.id}, cost={cost_estimation.final_cost}")
        
        return {
            "model": ai_model,
            "job": training_job,
            "task_id": task.id,
        }
    
    async def get_model(self, model_id: str, user_id: Optional[str] = None) -> Optional[AIModel]:
        """모델 조회"""
        query = select(AIModel).filter(AIModel.id == model_id)
        if user_id:
            query = query.filter(AIModel.user_id == user_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def list_models(
        self,
        user_id: str,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AIModel]:
        """사용자의 모델 목록 조회"""
        query = select(AIModel).filter(AIModel.user_id == user_id)
        
        if status:
            query = query.filter(AIModel.status == status)
        
        query = query.order_by(desc(AIModel.created_at)).offset(offset).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_training_status(self, model_id: str) -> Optional[AITrainingJob]:
        """학습 상태 조회"""
        query = select(AITrainingJob)\
            .filter(AITrainingJob.model_id == model_id)\
            .order_by(desc(AITrainingJob.created_at))\
            .limit(1)
            
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def delete_model(self, model_id: str, user_id: str) -> bool:
        """모델 삭제 - 모든 버전 및 관련 파일 완전 삭제"""
        model = await self.get_model(model_id, user_id)
        if not model:
            return False
        
        # 파일 삭제 (모델 폴더 전체 삭제)
        if model.model_weights_path:
            import shutil
            version_dir = Path(model.model_weights_path).parent  # v1, v2 등 버전 폴더
            model_dir = version_dir.parent  # model_id 폴더 (모든 버전 포함)
            user_model_dir = model_dir.parent  # user_id 폴더
            
            # 모델 폴더 전체 삭제 (모든 버전 포함)
            if model_dir.exists() and model_dir.name == str(model.id):
                shutil.rmtree(model_dir, ignore_errors=True)
                logger.info(f"Deleted model folder: {model_dir}")
            
            # 사용자 폴더가 비어있으면 삭제
            if user_model_dir.exists() and not any(user_model_dir.iterdir()):
                user_model_dir.rmdir()
                logger.info(f"Deleted empty user folder: {user_model_dir}")
        
        # DB 삭제 (CASCADE로 버전 및 관련 Job도 삭제됨)
        await self.db.delete(model)
        await self.db.commit()
        
        logger.info(f"Deleted AI model: {model_id}")
        return True
    
    async def get_public_models(
        self,
        limit: int = 50,
        offset: int = 0
    ) -> List[AIModel]:
        """공개 모델 목록 조회 (마켓플레이스용)"""
        query = select(AIModel)\
            .filter(AIModel.is_public == True)\
            .filter(AIModel.status == AIModelStatus.COMPLETED)\
            .order_by(desc(AIModel.created_at))\
            .offset(offset)\
            .limit(limit)
            
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def set_public(self, model_id: str, user_id: str, is_public: bool) -> Optional[AIModel]:
        """모델 공개 설정"""
        model = await self.get_model(model_id, user_id)
        if not model:
            return None
        
        model.is_public = is_public
        await self.db.commit()
        await self.db.refresh(model)
        return model

    async def retrain_model(
        self,
        model_id: str,
        user_id: str,
        start_date: Optional[datetime],
        end_date: Optional[datetime]
    ) -> AITrainingJob:
        """
        모델 재학습 요청
        - 크레딧 차감
        - Plan 확인 (Basic 불가)
        """
        # 1. 모델 조회 (User 정보 포함 Eager Loading)
        query = select(AIModel).filter(AIModel.id == model_id, AIModel.user_id == user_id)
        result = await self.db.execute(query)
        model = result.scalar_one_or_none()
        
        if not model:
            raise ValueError("Model not found")
        
        # 2. User 및 Plan 조회 확인
        # (user_id로 User 조회하여 Plan 확인)
        user_query = select(User).options(selectinload(User.subscription).selectinload(Subscription.plan)).filter(User.id == user_id)
        user_result = await self.db.execute(user_query)
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise ValueError("User not found")
        
        # [Plan Check] Basic is ALLOWED for manual retrain (paid) unlike Auto-Retrain
        
        # [Step 0] 비용 계산 및 크레딧 차감
        # 파라미터 준비
        epochs = model.training_config.get("epochs", 100) if model.training_config else 100
        
        cost_estimation = await cost_calculator_service.calculate_ai_training_cost(
            self.db, user, training_type="retrain",
            start_date=start_date if start_date else model.training_start_date,
            end_date=end_date if end_date else model.training_end_date,
            timeframe=model.training_timeframe,
            epochs=epochs
        )
        
        job_id = uuid.uuid4()
        await credit_service.deduct_credits(
            self.db,
            user.id,
            cost_estimation.final_cost,
            cost_estimation.discount_pct,
            related_entity_type="AI_RETRAINING",
            related_entity_id=job_id
        )

        # Create Job
        job = AITrainingJob(
            id=job_id,
            model_id=model.id,
            user_id=user_id,
            status="pending",
            started_at=datetime.utcnow()
        )
        self.db.add(job)
        await self.db.commit()
        
        start_str = start_date.isoformat() if start_date else None
        end_str = end_date.isoformat() if end_date else None
        
        train_ai_model_task.delay(str(model.id), str(job.id), manual_start_date=start_str, manual_end_date=end_str)
        
        
        logger.info(f"AI model retraining started: model_id={model.id}, job_id={job.id}, cost={cost_estimation.final_cost}")
        
        return job

    async def list_versions(self, model_id: str) -> List[AIModelVersion]:
        """모델 버전 목록 조회"""
        query = select(AIModelVersion).filter(AIModelVersion.model_id == model_id).order_by(desc(AIModelVersion.version_number))
        result = await self.db.execute(query)
        return result.scalars().all()

    async def activate_version(self, model_id: str, version_id: str, user_id: str) -> Optional[dict]:
        """특정 버전 활성화"""
        model = await self.get_model(model_id, user_id)
        if not model:
            return None
        
        query = select(AIModelVersion).filter(AIModelVersion.id == version_id, AIModelVersion.model_id == model_id)
        result = await self.db.execute(query)
        version = result.scalar_one_or_none()
        
        if not version:
            raise ValueError("Version not found")
        
        # Activate
        model.active_version_id = version.id
        model.model_weights_path = version.model_weights_path
        
        # Update is_active flags
        # 1. Reset all
        await self.db.execute(
            update(AIModelVersion).where(AIModelVersion.model_id == model_id).values(is_active=False)
        )
        # 2. Set target
        # session 객체 내의 version 객체를 직접 수정해도 되지만, 
        # 위 update 쿼리가 실행되면 session 내 객체가 expire될 수 있음.
        # 명시적으로 다시 업데이트하거나 version.is_active = True 하고 commit하면 됨.
        # 여기서는 쿼리로 atomic 하게 처리
        await self.db.execute(
            update(AIModelVersion).where(AIModelVersion.id == version_id).values(is_active=True)
        )
        
        await self.db.commit()
        
        # Clear Cache
        try:
            from ..ai.inference.onnx_inference import AIModelRegistry
            AIModelRegistry.clear_cache(str(model.id))
        except Exception as e:
            logger.warning(f"Failed to clear inference cache: {e}")
            
        return {"version_number": version.version_number}
