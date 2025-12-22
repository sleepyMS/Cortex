"""
AI Models API Router
AI 모델 CRUD 및 학습 관리 API 엔드포인트
"""
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from ..dependencies import get_async_db, get_current_active_user
from ..models import User, AIModel, AITrainingJob, AIModelStatus
from ..services.ai_model_service import AIModelService
from ..services.market_data_service import MarketDataService
from ..database import SyncSessionLocal
from .. import schemas

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai-models", tags=["AI Models"])


def get_sync_db():
    """동기 DB 세션 (Celery 태스크에서 사용하는 AI 서비스용)"""
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.AIModelCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_model(
    payload: schemas.AIModelCreate,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    AI 모델 생성 및 학습 시작
    
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
        result = service.create_and_train(
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
        )
        
        return schemas.AIModelCreateResponse(
            model=schemas.AIModelSummary.model_validate(result["model"]),
            training_job=schemas.AITrainingJobResponse.model_validate(result["job"]),
            task_id=result["task_id"],
        )
    except Exception as e:
        logger.error(f"Failed to create AI model: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/", response_model=List[schemas.AIModelSummary])
async def list_my_models(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(get_current_active_user)
):
    """내 AI 모델 목록 조회"""
    service = AIModelService(db)
    models = service.list_models(
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
    db: Session = Depends(get_sync_db),
):
    """공개된 AI 모델 목록 조회 (마켓플레이스용)"""
    service = AIModelService(db)
    models = service.get_public_models(limit=limit, offset=offset)
    return [schemas.AIModelSummary.model_validate(m) for m in models]


@router.get("/{model_id}", response_model=schemas.AIModelDetail)
async def get_model_detail(
    model_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(get_current_active_user)
):
    """AI 모델 상세 조회"""
    service = AIModelService(db)
    model = service.get_model(model_id, user_id=str(current_user.id))
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # 최신 학습 작업 정보 포함
    training_job = service.get_training_status(model_id)
    
    response = schemas.AIModelDetail.model_validate(model)
    if training_job:
        response.latest_training_job = schemas.AITrainingJobResponse.model_validate(training_job)
    
    return response


@router.get("/{model_id}/training-status", response_model=schemas.AITrainingJobResponse)
async def get_training_status(
    model_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(get_current_active_user)
):
    """학습 진행 상태 조회"""
    service = AIModelService(db)
    
    # 모델 소유권 확인
    model = service.get_model(model_id, user_id=str(current_user.id))
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    job = service.get_training_status(model_id)
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    return schemas.AITrainingJobResponse.model_validate(job)


@router.post("/{model_id}/predict", response_model=schemas.AIPredictionResponse)
async def test_prediction(
    model_id: str,
    payload: schemas.AIPredictionRequest,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    AI 모델 예측 테스트
    
    현재 시점의 최신 데이터를 사용하여 예측을 수행합니다.
    """
    service = AIModelService(db)
    model = service.get_model(model_id, user_id=str(current_user.id))
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    if model.status != AIModelStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Model training not completed")
    
    if not model.model_weights_path:
        raise HTTPException(status_code=400, detail="Model weights not found")
    
    try:
        from ..ai.inference.onnx_inference import AIModelRegistry
        
        # 모델 로드 (캐싱됨)
        model_dir = Path(model.model_weights_path).parent
        session = AIModelRegistry.get_session(str(model.id), str(model_dir))
        
        # 데이터 로드 (최신 데이터)
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
        
        return schemas.AIPredictionResponse(**result)
        
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(get_current_active_user)
):
    """AI 모델 삭제"""
    service = AIModelService(db)
    success = service.delete_model(model_id, user_id=str(current_user.id))
    
    if not success:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return None


@router.patch("/{model_id}/public", response_model=schemas.AIModelSummary)
async def set_model_public(
    model_id: str,
    is_public: bool = Query(...),
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(get_current_active_user)
):
    """모델 공개 설정 변경"""
    service = AIModelService(db)
    model = service.set_public(model_id, user_id=str(current_user.id), is_public=is_public)
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return schemas.AIModelSummary.model_validate(model)


@router.get("/{model_id}/download")
async def download_model(
    model_id: str,
    db: Session = Depends(get_sync_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    AI 모델 파일 다운로드
    
    ONNX 모델 파일을 다운로드합니다.
    소유자 또는 구매자만 다운로드할 수 있습니다.
    """
    service = AIModelService(db)
    model = service.get_model(model_id)
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # 소유자 또는 구매자 확인 (추후 구매 로직 추가 시 확장)
    if str(model.user_id) != str(current_user.id):
        # TODO: 구매자 확인 로직 추가
        raise HTTPException(status_code=403, detail="You don't have access to this model")
    
    if not model.model_weights_path or not Path(model.model_weights_path).exists():
        raise HTTPException(status_code=404, detail="Model file not found")
    
    return FileResponse(
        path=model.model_weights_path,
        filename=f"{model.name}.onnx",
        media_type="application/octet-stream"
    )
