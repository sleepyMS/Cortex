# file: backend/app/routers/optimizations.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import uuid

from .. import schemas, models
from ..dependencies import get_async_db, get_current_active_user, create_owner_verifier
from ..services.optimization_service import optimization_service
from ..services.cost_calculator import cost_calculator_service

router = APIRouter(
    prefix="/optimizations",
    tags=["Optimizations"],
    responses={404: {"description": "Not found"}},
)

# [핵심] 기본 규칙(optimizationjob_id) 대신 'job_id'를 사용하도록 명시적 설정
# 이는 "예외"가 아니라 "설정(Configuration)"입니다.
get_verified_optimization = create_owner_verifier(
    models.OptimizationJob, 
    path_param_name="job_id" 
)

@router.post("/estimate-cost", response_model=schemas.CostEstimationResponse)
async def estimate_optimization_cost(
    request: schemas.OptimizationCostEstimationRequest,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """[동기/비동기] 최적화 작업 실행 전, 예상되는 크레딧 비용을 계산합니다."""
    duration_days = (request.end_date - request.start_date).days
    duration_years = duration_days / 365.25 if duration_days > 0 else 0
    if duration_years <= 0: raise HTTPException(status_code=400, detail="Invalid date range")

    cost_params = schemas.CostEstimationRequest(
        backtest_duration_years=duration_years, min_timeframe_minutes=60, trials=request.trials
    )
    return await cost_calculator_service.calculate_credit_cost(db, current_user, cost_params)

@router.post("", response_model=schemas.OptimizationJobSummary, status_code=status.HTTP_202_ACCEPTED)
async def create_optimization(
    job_in: schemas.OptimizationCreate,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """[비동기] 새로운 전략 최적화 작업을 요청합니다."""
    total_trials = 0
    if job_in.optimization_type == models.OptimizationType.GENERAL and job_in.general_settings:
        total_trials = job_in.general_settings.trials
    elif job_in.optimization_type == models.OptimizationType.WFO and job_in.wfo_settings:
        total_trials = job_in.wfo_settings.folds * job_in.wfo_settings.trials_per_fold
    else:
        raise HTTPException(status_code=400, detail="Invalid optimization settings.")

    if total_trials <= 0: raise HTTPException(status_code=400, detail="Total trials must be > 0.")

    duration_days = (job_in.end_date - job_in.start_date).days
    duration_years = duration_days / 365.25 if duration_days > 0 else 0
    cost_params = schemas.CostEstimationRequest(
        backtest_duration_years=duration_years, min_timeframe_minutes=60, trials=total_trials
    )
    cost_info = await cost_calculator_service.calculate_credit_cost(db, current_user, cost_params)

    if not cost_info.is_sufficient:
        raise HTTPException(status_code=402, detail=f"Insufficient credits.")

    try:
        return await optimization_service.create_job(
            db, current_user.id, job_in, estimated_cost=cost_info.final_cost, discount_pct=cost_info.discount_pct
        )
    except ValueError as e: raise HTTPException(status_code=404, detail=str(e))
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[schemas.OptimizationJobSummary])
async def read_optimizations(
    skip: int = 0, limit: int = 20,
    status_filter: Optional[str] = Query(None),
    strategy_id_filter: Optional[uuid.UUID] = Query(None),
    type_filter: Optional[models.OptimizationType] = Query(None),
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """현재 사용자의 최적화 작업 목록을 조회합니다."""
    return await optimization_service.get_jobs_by_user(
        db, current_user.id, skip=skip, limit=limit,
        status_filter=status_filter, strategy_id_filter=strategy_id_filter, type_filter=type_filter
    )

# --- 아래부터는 모두 'job_id' 파라미터를 사용합니다 ---

@router.get("/{job_id}", response_model=schemas.OptimizationJobDetail)
async def read_optimization_detail(
    job_id: uuid.UUID, # [일치] 데코레이터 설정과 파라미터명 일치
    job: models.OptimizationJob = Depends(get_verified_optimization),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 최적화 작업의 상세 정보를 조회합니다."""
    # trials 로딩을 제외하여 초기 응답 속도를 개선합니다.
    # trials 데이터는 별도 엔드포인트(/optimizations/{job_id}/trials)를 통해 CSR로 가져옵니다.
    return await optimization_service.get_job(db, job.id, job.user_id, with_trials=False)

@router.get("/{job_id}/trials", response_model=schemas.PaginatedTrialsResponse)
async def read_optimization_trials(
    job_id: uuid.UUID,
    page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=10000),
    sort_by: str = Query("trial_id"), sort_desc: bool = Query(False),
    min_score: Optional[float] = Query(None),
    job: models.OptimizationJob = Depends(get_verified_optimization), # 소유권 검증
    db: AsyncSession = Depends(get_async_db)
):
    """특정 최적화 작업의 Trial 목록을 조회합니다."""
    return await optimization_service.get_trials_paginated(
        db, job.id, page, limit, sort_by, sort_desc, min_score
    )

@router.get("/{job_id}/trials/{trial_id}", response_model=schemas.TrialData)
async def read_optimization_trial_detail(
    job_id: uuid.UUID,
    trial_id: int,
    job: models.OptimizationJob = Depends(get_verified_optimization),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 최적화 작업의 단일 Trial 상세 정보를 조회합니다."""
    trial = await optimization_service.get_trial(db, job.id, trial_id)
    if not trial:
        raise HTTPException(status_code=404, detail="Trial not found")
    return trial

@router.post("/{job_id}/cancel", status_code=status.HTTP_200_OK)
async def cancel_optimization(
    job_id: uuid.UUID,
    job: models.OptimizationJob = Depends(get_verified_optimization),
    db: AsyncSession = Depends(get_async_db)
):
    """실행 중인 최적화 작업을 취소합니다."""
    success = await optimization_service.cancel_job(db, job.id, job.user_id)
    if not success: raise HTTPException(status_code=400, detail="Job cannot be canceled.")
    return {"message": "Optimization job canceled successfully."}

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_optimization(
    job_id: uuid.UUID,
    job: models.OptimizationJob = Depends(get_verified_optimization),
    db: AsyncSession = Depends(get_async_db)
):
    """최적화 작업 기록을 영구적으로 삭제합니다."""
    await optimization_service.delete_job(db, job.id, job.user_id)
    return None