# file: backend/app/routers/api_keys.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import logging
from typing import List, Optional

from .. import schemas, models, security
from ..database import get_db
from ..services.api_key_service import api_key_service # 👈 API 키 서비스 임포트

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api_keys", tags=["API Keys"])

# --- API 키 관련 엔드포인트 ---

@router.post("/", response_model=schemas.ApiKeyResponse, status_code=status.HTTP_201_CREATED, summary="Register a new exchange API key")
async def create_api_key(
    api_key_create: schemas.ApiKeyCreate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    새로운 암호화폐 거래소 API 키(API Key 및 Secret Key)를 암호화하여 등록합니다.
    """
    try:
        new_api_key = api_key_service.create_api_key(db, current_user.id, api_key_create)
        db.commit() # 서비스에서 flush 후 여기서 커밋
        db.refresh(new_api_key) # 최신 상태 반영
        logger.info(f"User {current_user.email} (ID: {current_user.id}) registered API key for {new_api_key.exchange} (ID: {new_api_key.id}).")
        return new_api_key
    except HTTPException as e: # 서비스에서 발생한 HTTP 오류 (예: 중복 키)
        db.rollback()
        logger.warning(f"Failed to register API key for user {current_user.email} for {api_key_create.exchange}: {e.detail}")
        raise e
    except Exception as e: # 예상치 못한 오류
        db.rollback()
        logger.error(f"An unexpected error occurred while registering API key for user {current_user.email} for {api_key_create.exchange}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API 키 등록 중 서버 오류가 발생했습니다."
        )


@router.get("/", response_model=List[schemas.ApiKeyResponse], summary="Get list of user's API keys")
async def get_api_keys(
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    현재 로그인된 사용자의 등록된 거래소 API 키 목록을 조회합니다.
    API 키 및 Secret 키 자체는 반환되지 않습니다 (보안).
    """
    api_keys = api_key_service.get_api_keys(db, current_user.id, skip, limit)
    logger.info(f"User {current_user.email} fetched {len(api_keys)} API keys.")
    return api_keys


@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific API key")
async def delete_api_key(
    api_key_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 API 키를 삭제합니다. API 키 소유자만 가능합니다.
    이 API 키를 사용하는 활성 봇이 있다면 삭제가 거부됩니다.
    """
    try:
        success = api_key_service.delete_api_key(db, api_key_id, current_user.id)
        if not success:
            logger.warning(f"API key {api_key_id} not found or user {current_user.email} has no permission to delete.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API 키를 찾을 수 없거나 삭제할 권한이 없습니다.")
        
        db.commit() # 서비스에서 삭제 후 여기서 커밋
        logger.info(f"User {current_user.email} (ID: {current_user.id}) deleted API key ID: {api_key_id}.")
        return # 204 No Content는 응답 바디를 포함하지 않음
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to delete API key {api_key_id} for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while deleting API key {api_key_id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API 키 삭제 중 서버 오류가 발생했습니다."
        )