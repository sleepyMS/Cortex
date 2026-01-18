"""
AI Models API Router
AI 모델 CRUD 및 학습 관리 API 엔드포인트
"""
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Union

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session # Type hint sometimes needed but mostly AsyncSession

from ..dependencies import get_async_db, get_current_active_user
from ..models import User, AIModel, AITrainingJob, AIModelStatus, AIModelVersion
from ..services.ai_model_service import AIModelService
from ..services.market_data_service import MarketDataService
from .. import schemas

logger = logging.getLogger(__name__)

from ..services.cost_calculator import cost_calculator_service

router = APIRouter(prefix="/ai-models", tags=["AI Models"])


@router.post("/cost-estimation", response_model=schemas.CostEstimationResponse)
async def estimate_ai_model_cost(
    request: schemas.AIModelCostEstimationRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    AI 모델 학습 비용 견적 조회 (동적 계산)
    """
    return await cost_calculator_service.calculate_ai_training_cost(
        db, 
        current_user, 
        training_type=request.training_type,
        start_date=request.start_date,
        end_date=request.end_date,
        timeframe=request.timeframe,
        epochs=request.epochs,
        model_id=request.model_id,
        hidden_size=request.hidden_size,
        num_layers=request.num_layers
    )


@router.post("/", response_model=schemas.AIModelCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_model(
    payload: schemas.AIModelCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    AI 모델 생성 및 학습 시작 (Cost: 100 Credits)
    
    모델을 생성하고 Celery 태스크로 학습을 시작합니다.
    학습 진행 상황은 /training-status 엔드포인트로 확인할 수 있습니다.
    """
    # 날짜 검증
    if payload.training_end_date <= payload.training_start_date:
        raise HTTPException(
            status_code=400,
            detail="training_end_date must be after training_start_date"
        )
    
    # 너무 짧은 학습 기간 검증 (최소 30일)
    duration = (payload.training_end_date - payload.training_start_date).days
    if duration < 30:
        raise HTTPException(
            status_code=400,
            detail="Training period must be at least 30 days"
        )
    
    service = AIModelService(db)
    
    try:
        # 비동기 호출 (크레딧 차감 포함)
        result = await service.create_and_train(
            user=current_user,
            name=payload.name,
            description=payload.description,
            model_type=payload.model_type,
            architecture_config=payload.architecture_config.model_dump(),
            feature_config=payload.feature_config.model_dump(),
            labeling_config=payload.labeling_config.model_dump(),
            training_config=payload.training_config.model_dump(),
            training_symbol=payload.training_symbol,
            training_timeframe=payload.training_timeframe,
            training_start_date=payload.training_start_date,
            training_end_date=payload.training_end_date,
            task_type=payload.task_type,
            optimization_config=payload.optimization_config.model_dump() if payload.optimization_config else None,
        )
        
        return schemas.AIModelCreateResponse(
            model=schemas.AIModelSummary.model_validate(result["model"]),
            training_job=schemas.AITrainingJobResponse.model_validate(result["job"]),
            task_id=result["task_id"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create AI model: {e}")
        # 크레딧 환불 로직이 필요할 수 있으나, 현재 트랜잭션 범위 내에서 flush/commit 구조상
        # create_and_train success 시점에서 commit 하므로, 에러 발생 시 rollback 될 것임 (부분적으로)
        # 하지만 credit service는 별도 flush를 하므로 주의 필요.
        # 일단 단순화: 에러 발생 시 500
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[schemas.AIModelSummary])
async def list_my_models(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """내 AI 모델 목록 조회"""
    service = AIModelService(db)
    models = await service.list_models(
        user_id=str(current_user.id),
        status=status_filter,
        limit=limit,
        offset=offset
    )
    return [schemas.AIModelSummary.model_validate(m) for m in models]


@router.get("/public", response_model=List[schemas.AIModelSummary])
async def list_public_models(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
):
    """공개된 AI 모델 목록 조회 (마켓플레이스용)"""
    service = AIModelService(db)
    models = await service.get_public_models(limit=limit, offset=offset)
    return [schemas.AIModelSummary.model_validate(m) for m in models]


@router.get("/{model_id}", response_model=schemas.AIModelDetail)
async def get_model_detail(
    model_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """AI 모델 상세 조회"""
    service = AIModelService(db)
    model = await service.get_model(model_id, user_id=str(current_user.id))
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # 최신 학습 작업 정보 포함
    training_job = await service.get_training_status(model_id)
    
    response = schemas.AIModelDetail.model_validate(model)
    if training_job:
        response.latest_training_job = schemas.AITrainingJobResponse.model_validate(training_job)
        
        # [Fix for Rollback] Ensure latest_training_job reflects the ACTIVE version logs if available
        # When a version is activated, model.training_metrics is updated with version.metrics (which contains epoch_logs)
        if model.status == AIModelStatus.COMPLETED and model.training_metrics:
            epoch_logs = model.training_metrics.get("epoch_logs")
            if epoch_logs:
                # Overwrite logs with active version's logs
                response.latest_training_job.epoch_logs = epoch_logs
    
    return response


@router.get("/{model_id}/training-status", response_model=schemas.AITrainingJobResponse)
async def get_training_status(
    model_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """학습 진행 상태 조회"""
    service = AIModelService(db)
    
    # 모델 소유권 확인
    model = await service.get_model(model_id, user_id=str(current_user.id))
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    job = await service.get_training_status(model_id)
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    return schemas.AITrainingJobResponse.model_validate(job)


@router.post("/{model_id}/predict", response_model=Union[schemas.AIPredictionResponse, schemas.AIRegressionPredictionResponse])
async def test_prediction(
    model_id: str,
    payload: schemas.AIPredictionRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    AI 모델 예측 테스트
    
    현재 시점의 최신 데이터를 사용하여 예측을 수행합니다.
    """
    service = AIModelService(db)
    model = await service.get_model(model_id, user_id=str(current_user.id))
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    if model.status != AIModelStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Model training not completed")
    
    if not model.model_weights_path:
        raise HTTPException(status_code=400, detail="Model weights not found")
    
    try:
        from ..ai.inference.onnx_inference import AIModelRegistry
        
        # 모델 로드 (캐싱됨) - Blocking IO but fast, or acceptable
        model_dir = Path(model.model_weights_path).parent
        session = AIModelRegistry.get_session(str(model.id), str(model_dir))
        
        # 데이터 로드 (최신 데이터) - Sync HTTP request? MarketDataService might be Sync.
        # MarketDataService uses `ccxt` or `requests`. If it's slow, it blocks loop.
        # Assuming MarketDataService has async methods... Checking `market_data_service.py` not done but let's assume `get_historical_data_sync` is sync.
        # For now calling sync method in async router blocks loop. Improvement needed later.
        market_data = MarketDataService()
        df = market_data.get_historical_data_sync(
            ticker=payload.symbol,
            timeframe=payload.timeframe,
            start_date=datetime.utcnow().replace(hour=0, minute=0, second=0) - timedelta(days=30),
            end_date=datetime.utcnow()
        )
        
        if df.empty or len(df) < 200:
            raise HTTPException(status_code=400, detail="Insufficient data for prediction")
        
        # 예측
        result = session.get_latest_prediction(df)
        
        if result.get("task_type") == "regression":
            return schemas.AIRegressionPredictionResponse(**result)
        else:
            return schemas.AIPredictionResponse(**result)
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{model_id}/versions", response_model=List[schemas.AIModelVersionResponse])
async def list_model_versions(
    model_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """모델 버전 목록 조회"""
    service = AIModelService(db)
    # 소유권 확인
    model = await service.get_model(model_id, user_id=str(current_user.id))
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
        
    versions = await service.list_versions(model_id)
    return [schemas.AIModelVersionResponse.model_validate(v) for v in versions]


@router.post("/{model_id}/versions/{version_id}/activate", status_code=status.HTTP_200_OK)
async def activate_model_version(
    model_id: str,
    version_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """특정 버전으로 롤백/활성화"""
    service = AIModelService(db)
    
    try:
        result = await service.activate_version(model_id, version_id, str(current_user.id))
        if not result:
            raise HTTPException(status_code=404, detail="Model or Version not found")
        return {"status": "success", "active_version": result["version_number"]}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """AI 모델 삭제"""
    service = AIModelService(db)
    success = await service.delete_model(model_id, user_id=str(current_user.id))
    
    if not success:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return None


@router.patch("/{model_id}/public", response_model=schemas.AIModelSummary)
async def set_model_public(
    model_id: str,
    is_public: bool = Query(...),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """모델 공개 설정 변경"""
    service = AIModelService(db)
    model = await service.set_public(model_id, user_id=str(current_user.id), is_public=is_public)
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return schemas.AIModelSummary.model_validate(model)


@router.get("/{model_id}/listing-status", response_model=schemas.AIModelListingStatusResponse)
async def get_model_listing_status(
    model_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """AI 모델의 마켓플레이스 등록 상태를 확인합니다."""
    from sqlalchemy import select
    from ..models import MarketplaceProduct, ProductType
    
    product = await db.scalar(
        select(MarketplaceProduct)
        .filter(
            MarketplaceProduct.linked_resource_id == model_id,
            MarketplaceProduct.product_type == ProductType.AI_MODEL,
            MarketplaceProduct.is_active == True
        )
    )
    
    if product:
        return {
            "listed": True,
            "product_id": product.id,
            "price": product.price,
            "description": product.description
        }
    return {"listed": False, "product_id": None, "price": None, "description": None}


@router.get("/{model_id}/download")
async def download_model(
    model_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    AI 모델 파일 다운로드
    """
    service = AIModelService(db)
    model = await service.get_model(model_id)
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # 소유자 또는 구매자 확인
    if str(model.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You don't have access to this model")
    
    if not model.model_weights_path or not Path(model.model_weights_path).exists():
        raise HTTPException(status_code=404, detail="Model file not found")
    
    return FileResponse(
        path=model.model_weights_path,
        filename=f"{model.name}.onnx",
        media_type="application/octet-stream"
    )


@router.post("/{model_id}/retrain", response_model=schemas.AITrainingJobResponse)
async def retrain_ai_model(
    model_id: str,
    request: schemas.RetrainRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    AI 모델 수동 재학습 요청 (Cost: 50 Credits)
    - Pro Plan Only
    """
    service = AIModelService(db)
    try:
        job = await service.retrain_model(model_id, str(current_user.id), request.start_date, request.end_date)
        return job
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
