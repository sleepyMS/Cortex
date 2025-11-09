# file: backend/app/routers/optimizations.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import uuid
import logging
from pydantic import ValidationError

from .. import schemas, models
# [수정 1] 올바른 DB 의존성 임포트
from ..dependencies import get_async_db, get_current_active_user, create_owner_verifier
from ..services.optimization_service import optimization_service
from ..services.cost_calculator import cost_calculator_service

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/optimizations",
    tags=["Optimizations"],
    responses={404: {"description": "Not found"}},
)

# 소유권 검증 의존성 생성
# models.py에 OptimizationJob 모델이 user_id 필드를 가지고 있어야 합니다.
get_verified_optimization = create_owner_verifier(models.OptimizationJob)


@router.post("/estimate-cost", response_model=schemas.CostEstimationResponse)
async def estimate_optimization_cost(
    request: schemas.OptimizationCostEstimationRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    [동기/비동기] 최적화 작업 실행 전, 예상되는 크레딧 비용을 계산하여 반환합니다.
    """
    duration_days = (request.end_date - request.start_date).days
    duration_years = duration_days / 365.25 if duration_days > 0 else 0

    if duration_years <= 0:
        raise HTTPException(status_code=400, detail="Invalid date range")

    cost_params = schemas.CostEstimationRequest(
        backtest_duration_years=duration_years,
        min_timeframe_minutes=60, 
        trials=request.trials
    )

    cost_info = await cost_calculator_service.calculate_credit_cost(db, current_user, cost_params)
    return cost_info


@router.post("", response_model=schemas.OptimizationJobSummary, status_code=status.HTTP_202_ACCEPTED)
async def create_optimization(
    job_in: schemas.OptimizationCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    [비동기] 새로운 전략 최적화 작업을 요청합니다.
    """
    logger.warning(f"[OPT-DEBUG] Create optimization request received from user {current_user.id}")
    logger.warning(f"[OPT-DEBUG] Request payload: {job_in.model_dump_json()}") # 요청 데이터 확인

    try:
        # 1. 총 시도 횟수 계산
        total_trials = 0
        if job_in.optimization_type == models.OptimizationType.GENERAL and job_in.general_settings:
            total_trials = job_in.general_settings.trials
        elif job_in.optimization_type == models.OptimizationType.WFO and job_in.wfo_settings:
            total_trials = job_in.wfo_settings.folds * job_in.wfo_settings.trials_per_fold
        else:
            logger.error(f"[OPT-DEBUG] Invalid settings for type: {job_in.optimization_type}")
            raise HTTPException(status_code=400, detail="Invalid optimization settings for the selected type.")

        if total_trials <= 0:
             logger.error(f"[OPT-DEBUG] Total trials is 0 or less: {total_trials}")
             raise HTTPException(status_code=400, detail="Total trials must be greater than 0.")

        logger.warning(f"[OPT-DEBUG] Total trials calculated: {total_trials}")

        # 2. 비용 계산 및 잔액 확인
        duration_days = (job_in.end_date - job_in.start_date).days
        duration_years = duration_days / 365.25 if duration_days > 0 else 0
        
        cost_params = schemas.CostEstimationRequest(
            backtest_duration_years=duration_years,
            min_timeframe_minutes=60,
            trials=total_trials
        )
        logger.warning(f"[OPT-DEBUG] Calculating cost with params: {cost_params}")
        cost_info = await cost_calculator_service.calculate_credit_cost(db, current_user, cost_params)
        logger.warning(f"[OPT-DEBUG] Cost calculated: {cost_info.final_cost} (User balance: {cost_info.user_balance})")

        if not cost_info.is_sufficient:
            logger.warning(f"[OPT-DEBUG] Insufficient credits for user {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Insufficient credits. Required: {cost_info.final_cost}, Available: {cost_info.user_balance}"
            )

        # 3. 작업 생성 (서비스 위임)
        logger.warning(f"[OPT-DEBUG] Calling optimization_service.create_job...")
        job = await optimization_service.create_job(
            db, 
            current_user.id, 
            job_in, 
            estimated_cost=cost_info.final_cost,
            discount_pct=cost_info.discount_pct
        )
        logger.warning(f"[OPT-DEBUG] Job created successfully: {job.id}")
        return job

    except ValueError as e:
        logger.error(f"[OPT-DEBUG] ValueError in create_optimization: {e}", exc_info=True)
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException as e:
        # 이미 처리된 HTTP 예외는 그대로 전달
        raise e
    except Exception as e:
        # 예상치 못한 모든 에러를 잡아서 로깅
        logger.critical(f"[OPT-DEBUG] UNEXPECTED ERROR in create_optimization: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create optimization job: {str(e)}")


@router.get("", response_model=List[schemas.OptimizationJobSummary])
async def read_optimizations(
    skip: int = 0,
    limit: int = 20,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    현재 사용자의 최적화 작업 목록을 조회합니다.
    """
    return await optimization_service.get_jobs_by_user(
        db, current_user.id, skip=skip, limit=limit
    )


@router.get("/{job_id}", response_model=schemas.OptimizationJobDetail)
async def read_optimization_detail(
    job_id: uuid.UUID,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    특정 최적화 작업의 상세 정보를 조회합니다.
    """
    try:
        logger.warning(f"[OPT-DEBUG] Fetching job {job_id} for user {current_user.id}")
        job = await optimization_service.get_job(db, job_id, current_user.id)
        if not job:
            raise HTTPException(status_code=404, detail="Optimization job not found")
        
        logger.warning(f"[OPT-DEBUG] Job found from DB. Status: {job.status}")
        
        # [디버깅 핵심] Pydantic 모델로 수동 변환을 시도하여 어떤 필드에서 에러가 나는지 확인
        try:
            # ORM 객체를 Pydantic 모델로 변환 시도
            job_detail = schemas.OptimizationJobDetail.model_validate(job)
            logger.warning("[OPT-DEBUG] Pydantic validation successful")
            return job_detail
        except ValidationError as e:
            # 유효성 검사 에러 상세 출력
            logger.error(f"[OPT-DEBUG] Pydantic Validation Error: {e.json()}")
            for error in e.errors():
                logger.error(f"[OPT-DEBUG] Field: {error['loc']}, Error: {error['msg']}")
            raise e # 500 에러로 전파

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"[OPT-DEBUG] Unexpected error in read_optimization_detail: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to read optimization details: {str(e)}")

@router.get("/{job_id}/trials", response_model=schemas.PaginatedTrialsResponse)
async def read_optimization_trials(
    job_id: uuid.UUID,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000), # 내보내기를 위해 최대 limit을 늘릴 수도 있음
    sort_by: str = Query("trial_number"),
    sort_desc: bool = Query(False),
    min_score: Optional[float] = Query(None, ge=0, le=100), # [추가]
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 최적화 작업의 Trial 목록을 조회합니다."""
    job = await optimization_service.get_job(db, job_id, current_user.id)
    if not job: raise HTTPException(status_code=404, detail="Job not found")
        
    return await optimization_service.get_trials_paginated(
        db, job_id, page, limit, sort_by, sort_desc, min_score
    )

@router.post("/{optimization_job_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_optimization(
    job: models.OptimizationJob = Depends(get_verified_optimization),
    db: AsyncSession = Depends(get_async_db)
):
    """
    실행 중인 최적화 작업을 취소합니다. (소유권 자동 검증)
    """
    success = await optimization_service.cancel_job(db, job.id, job.user_id)
    if not success:
         raise HTTPException(status_code=400, detail="Job cannot be canceled (already finished or not found).")
    
    return {"message": "Optimization job canceled successfully."}

@router.delete("/{optimization_job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_optimization(
    job: models.OptimizationJob = Depends(get_verified_optimization),
    db: AsyncSession = Depends(get_async_db)
):
    """
    최적화 작업 기록을 영구적으로 삭제합니다. (소유권 자동 검증)
    """
    await optimization_service.delete_job(db, job.id)
    await db.delete(job)
    await db.commit()
    return None
