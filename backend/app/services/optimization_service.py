# file: backend/app/services/optimization_service.py

import uuid
import logging
import math
from typing import List, Optional, Dict, Any
from sqlalchemy import select, desc, delete, asc, func, cast, Float
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import set_committed_value

from .. import models, schemas
from ..tasks import run_optimization
from ..celery_app import celery_app

from .credit_service import credit_service

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
        estimated_cost: int,
        discount_pct: float
    ) -> models.OptimizationJob:
        logger.warning(f"[OPT-SERVICE] create_job called for user {user_id}, strategy {job_in.strategy_id}")
        
        # 1. 전략 조회
        result = await db.execute(
            select(models.Strategy).filter_by(id=job_in.strategy_id, author_id=user_id)
        )
        strategy = result.scalar_one_or_none()
        if not strategy:
            logger.error(f"[OPT-SERVICE] Strategy not found: {job_in.strategy_id}")
            raise ValueError("Strategy not found or permission denied.")
        logger.warning(f"[OPT-SERVICE] Strategy found: {strategy.name}")

        # 2. 스냅샷 생성
        try:
            strategy_snapshot = schemas.StrategyForSnapshot.model_validate(strategy).model_dump(mode='json')
            logger.warning("[OPT-SERVICE] Strategy snapshot created successfully")
        except Exception as e:
             logger.error(f"[OPT-SERVICE] Failed to create strategy snapshot: {e}", exc_info=True)
             raise e

        # 3. 크레딧 차감
        try:
            logger.warning(f"[OPT-SERVICE] Deducting {estimated_cost} credits...")
            # credit_service가 올바르게 import 되었는지 확인 필요
            from .credit_service import credit_service
            await credit_service.deduct_credits(
                db=db,
                user_id=user_id,
                amount_to_deduct=estimated_cost,
                discount_pct=discount_pct, 
                related_entity_type="OPTIMIZATION_JOB",
                related_entity_id=None 
            )
            logger.warning("[OPT-SERVICE] Credits deducted successfully")
        except Exception as e:
            logger.error(f"[OPT-SERVICE] Credit deduction failed: {e}", exc_info=True)
            raise e

        # 4. Config 조립 및 DB 레코드 생성
        try:
            config = schemas.OptimizationConfig(
                objective=job_in.objective,
                start_date=job_in.start_date,
                end_date=job_in.end_date,
                initial_capital=job_in.initial_capital, 
                common_parameters=job_in.common_parameters,
                parameter_ranges=job_in.parameter_ranges,
                constraints=job_in.constraints,
                general_settings=job_in.general_settings,
                wfo_settings=job_in.wfo_settings
            )
            
            db_job = models.OptimizationJob(
                user_id=user_id,
                strategy_id=job_in.strategy_id,
                type=job_in.optimization_type,
                status=models.OptimizationStatus.PENDING,
                config=config.model_dump(mode='json'),
                strategy_snapshot=strategy_snapshot,
                used_credits=estimated_cost
            )
            db.add(db_job)
            await db.flush()
            await db.refresh(db_job)
            logger.warning(f"[OPT-SERVICE] Job record created in DB with ID: {db_job.id}")
        except Exception as e:
            logger.error(f"[OPT-SERVICE] DB insert failed: {e}", exc_info=True)
            await db.rollback()
            raise e

        # 5. Celery 태스크 실행
        try:
            task = run_optimization.delay(str(db_job.id))
            db_job.celery_task_id = task.id
            await db.flush()
            logger.warning(f"[OPT-SERVICE] Celery task dispatched: {task.id}")
        except Exception as e:
            logger.error(f"[OPT-SERVICE] Celery dispatch failed: {e}", exc_info=True)
            # 태스크 실행 실패 시 Job 상태를 FAILED로 변경하는 것이 좋음
            db_job.status = models.OptimizationStatus.FAILED
            await db.flush()
            raise e
        
        await db.refresh(db_job, attribute_names=["strategy"])

        return db_job

    async def get_job(
        self, db: AsyncSession, job_id: uuid.UUID, user_id: uuid.UUID, with_trials: bool = True
    ) -> Optional[models.OptimizationJob]:
        """
        특정 최적화 작업의 상세 정보를 조회합니다.
        """
        query = (
            select(models.OptimizationJob)
            .filter_by(id=job_id, user_id=user_id)
            .options(
                selectinload(models.OptimizationJob.strategy)
            )
        )
        
        # with_trials가 True일 때만 trials 관계를 로딩합니다.
        if with_trials:
            query = query.options(selectinload(models.OptimizationJob.trials))

        result = await db.execute(query)
        job = result.scalar_one_or_none()

        # trials를 로딩하지 않았을 때, Pydantic 모델 변환 시 
        # Lazy Loading 에러가 발생하지 않도록 빈 리스트를 명시적으로 할당합니다.
        if job and not with_trials:
            # set_committed_value를 사용하여 DB 로딩 없이 값을 강제로 주입합니다.
            set_committed_value(job, "trials", [])

        # best_trial 수동 주입 로직
        if job and job.status == models.OptimizationStatus.COMPLETED:
            summary = job.result_summary
            if isinstance(summary, dict):
                best_trial_id = summary.get("best_trial_id")
                if best_trial_id is not None:
                    trial_query = select(models.OptimizationTrial).filter_by(
                        job_id=job.id, 
                        trial_id=best_trial_id
                    )
                    job.best_trial = (await db.execute(trial_query)).scalar_one_or_none()
                
                job.parameter_importance = summary.get("parameter_importance")

            if job.type == models.OptimizationType.WFO and job.wfo_result:
                wfo_data = job.wfo_result
                if isinstance(wfo_data, dict):
                    job.best_result_summary = {
                        "total_return_pct": wfo_data.get("total_return_pct"),
                    }

        return job

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
    
    async def get_trial(
        self, db: AsyncSession, job_id: uuid.UUID, trial_id: int
    ) -> Optional[models.OptimizationTrial]:
        """
        특정 최적화 작업 내의 단일 시도(Trial) 정보를 조회합니다.
        전략 복제 시 파라미터 정보를 가져오기 위해 사용됩니다.
        """
        query = select(models.OptimizationTrial).filter_by(
            job_id=job_id, 
            trial_id=trial_id
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
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
    
    async def get_trials_paginated(
        self,
        db: AsyncSession,
        job_id: uuid.UUID,
        page: int = 1,
        limit: int = 20,
        sort_by: str = "trial_id",
        sort_desc: bool = False,
        min_score: Optional[float] = None  # [추가] 필터링 파라미터
    ) -> Dict[str, Any]:
        """
        특정 Job의 Trial 목록을 조건에 따라 페이지네이션하여 조회합니다.
        """
        # 기본 쿼리 생성
        query = select(models.OptimizationTrial).filter_by(job_id=job_id)

        # 최소 점수 필터링 적용 (JSONB 내부 필드 접근)
        if min_score is not None and min_score > 0:
            # metrics->>'backtest_score' 값을 float로 형변환하여 비교
            query = query.filter(
                models.OptimizationTrial.metrics['backtest_score'].astext.cast(Float) >= min_score
            )

        # 전체 개수 조회 (필터링 적용된 상태에서 카운트)
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar_one()

        # 정렬 적용
        if sort_by == "trial_id":
            order = desc(models.OptimizationTrial.trial_id) if sort_desc else asc(models.OptimizationTrial.trial_id)
            query = query.order_by(order)
        elif sort_by == "score":
            score_col = models.OptimizationTrial.metrics['backtest_score'].astext.cast(Float)
            order = desc(score_col) if sort_desc else asc(score_col)
            query = query.order_by(order)
        elif sort_by == "total_return":
            tr_col = models.OptimizationTrial.metrics['total_return_pct'].astext.cast(Float)
            order = desc(tr_col) if sort_desc else asc(tr_col)
            query = query.order_by(order)
        elif sort_by == "mdd":
            mdd_col = models.OptimizationTrial.metrics['mdd_pct'].astext.cast(Float)
            order = desc(mdd_col) if sort_desc else asc(mdd_col)
            query = query.order_by(order)

        # 페이지네이션 적용
        query = query.offset((page - 1) * limit).limit(limit)
        items = (await db.execute(query)).scalars().all()

        return {
            "items": items,
            "total": total,
            "page": page,
            "size": limit,
            "pages": math.ceil(total / limit) if limit > 0 else 0
        }

optimization_service = OptimizationService()