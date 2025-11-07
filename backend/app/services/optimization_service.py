# file: backend/app/services/optimization_service.py

import uuid
import logging
from typing import List, Optional
from sqlalchemy import select, desc, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .. import models, schemas
from ..tasks import run_optimization
from ..celery_app import celery_app

logger = logging.getLogger(__name__)

class OptimizationService:
    """
    최적화 작업(OptimizationJob)의 CRUD 및 실행 요청을 담당하는 서비스.
    """

    async def create_job(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        job_in: schemas.OptimizationCreate,
        estimated_cost: int
    ) -> models.OptimizationJob:
        """
        1. 최적화 요청 데이터를 기반으로 DB에 Job 레코드를 'PENDING' 상태로 생성합니다.
        2. 전략 스냅샷을 생성하여 저장합니다.
        3. Celery에 비동기 작업을 등록합니다.
        """
        # 1. 전략 존재 여부 확인 및 스냅샷 생성을 위한 조회
        # 최적화 실행 시점의 전략 상태를 완벽하게 보존하기 위해 스냅샷을 뜹니다.
        result = await db.execute(
            select(models.Strategy).filter_by(id=job_in.strategy_id, author_id=user_id)
        )
        strategy = result.scalar_one_or_none()
        if not strategy:
            raise ValueError("Strategy not found or permission denied.")

        # Pydantic 모델을 이용해 깔끔하게 스냅샷 딕셔너리 생성
        strategy_snapshot = schemas.StrategyForSnapshot.model_validate(strategy).model_dump(mode='json')

        # 2. 설정(Config) 객체 조립
        # 프론트엔드에서 받은 평탄화된 데이터를 구조화된 OptimizationConfig로 변환
        config = schemas.OptimizationConfig(
            objective=job_in.objective,
            start_date=job_in.start_date,
            end_date=job_in.end_date,
            initial_capital=job_in.common_parameters.initial_capital,
            common_parameters=job_in.common_parameters,
            parameter_ranges=job_in.parameter_ranges,
            constraints=job_in.constraints,
            general_settings=job_in.general_settings,
            wfo_settings=job_in.wfo_settings
        )

        # 3. DB 레코드 생성
        db_job = models.OptimizationJob(
            user_id=user_id,
            strategy_id=job_in.strategy_id,
            type=job_in.optimization_type,
            status=models.OptimizationStatus.PENDING,
            # Pydantic v2의 model_dump(mode='json')을 사용하여 JSON 직렬화 가능한 형태로 변환
            config=config.model_dump(mode='json'),
            strategy_snapshot=strategy_snapshot,
            # estimated_cost는 추후 과금을 위해 저장 (모델에 컬럼이 있다고 가정)
            # used_credits=estimated_cost 
        )
        db.add(db_job)
        
        # Job ID 생성을 위해 flush 또는 commit 필요
        await db.commit()
        await db.refresh(db_job)

        # 4. Celery 태스크 실행 (비동기)
        # DB에 저장된 job_id를 전달하여 워커가 데이터를 읽을 수 있게 함
        task = run_optimization.delay(str(db_job.id))

        # 태스크 ID를 DB에 업데이트합니다.
        db_job.celery_task_id = task.id
        await db.commit() # 변경 사항 저장
        
        logger.info(f"Optimization job {db_job.id} created and task {task.id} dispatched.")

        return db_job

    async def get_job(
        self, db: AsyncSession, job_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[models.OptimizationJob]:
        """
        특정 최적화 작업의 상세 정보를 조회합니다.
        전략 정보와 트라이얼 목록(요약)을 함께 로드합니다.
        """
        query = (
            select(models.OptimizationJob)
            .filter_by(id=job_id, user_id=user_id)
            .options(
                selectinload(models.OptimizationJob.strategy), # 전략 정보 Eager Loading
                selectinload(models.OptimizationJob.trials) 
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_jobs_by_user(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
        status_filter: Optional[str] = None,
        strategy_id_filter: Optional[uuid.UUID] = None,
        type_filter: Optional[str] = None
    ) -> List[models.OptimizationJob]:
        """
        사용자의 최적화 작업 목록을 조회합니다. (필터링 및 페이지네이션 지원)
        """
        query = (
            select(models.OptimizationJob)
            .filter_by(user_id=user_id)
            .order_by(desc(models.OptimizationJob.created_at))
            .options(selectinload(models.OptimizationJob.strategy)) # 목록 표시용 전략 정보 로드
        )

        # 동적 필터링 적용
        if status_filter:
            query = query.filter(models.OptimizationJob.status == status_filter)
        if strategy_id_filter:
            query = query.filter(models.OptimizationJob.strategy_id == strategy_id_filter)
        if type_filter:
            query = query.filter(models.OptimizationJob.type == type_filter)

        # 페이지네이션 적용
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def cancel_job(
        self, db: AsyncSession, job_id: uuid.UUID, user_id: uuid.UUID
    ) -> bool:
        """
        실행 중이거나 대기 중인 작업을 취소 상태로 변경합니다.
        """
        job = await self.get_job(db, job_id, user_id)
        if not job:
            return False
        
        # PENDING이나 RUNNING 상태일 때만 취소 가능
        if job.status in [models.OptimizationStatus.PENDING, models.OptimizationStatus.RUNNING]:
            # 1. DB 상태 변경
            previous_status = job.status
            job.status = models.OptimizationStatus.CANCELED
            
            # 2. 실제 Celery 태스크 강제 종료
            if job.celery_task_id:
                # terminate=True: 현재 실행 중인 작업도 즉시 SIGTERM 시그널을 보내 중단시킵니다.
                celery_app.control.revoke(job.celery_task_id, terminate=True)
                logger.info(f"Revoked Celery task {job.celery_task_id} for job {job_id}")

            await db.commit()
            logger.info(f"Optimization job {job_id} canceled by user {user_id} (was {previous_status}).")
            return True
            
        return False

    async def delete_job(
        self, db: AsyncSession, job_id: uuid.UUID, user_id: uuid.UUID
    ) -> bool:
        """
        최적화 작업 기록을 영구적으로 삭제합니다.
        DB의 ON DELETE CASCADE 설정에 따라 관련된 Trials 데이터도 함께 삭제될 것입니다.
        """
        # 본인 소유의 작업인지 확인 후 삭제
        result = await db.execute(
            delete(models.OptimizationJob)
            .where(models.OptimizationJob.id == job_id, models.OptimizationJob.user_id == user_id)
        )
        await db.commit()
        
        if result.rowcount > 0:
            logger.info(f"Optimization job {job_id} deleted by user {user_id}.")
            return True
        return False

optimization_service = OptimizationService()