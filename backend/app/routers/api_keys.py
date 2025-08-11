# file: backend/app/routers/api_keys.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import logging
from typing import List
import uuid

# dependencies에서 get_verified_api_key를 import 합니다.
from .. import schemas, models, security
from ..dependencies import get_verified_api_key
from ..database import get_db
from ..services.api_key_service import api_key_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api_keys", tags=["API Keys"])

# --- API 키 관련 엔드포인트 ---

# 새로운 API 키를 '생성'하므로, 기존 객체에 대한 소유권 검증이 필요 없습니다.
@router.post("/", response_model=schemas.ApiKeyResponse, status_code=status.HTTP_201_CREATED, summary="Register a new exchange API key")
async def create_api_key(
    api_key_create: schemas.ApiKeyCreate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    새로운 암호화폐 거래소 API 키를 암호화하여 등록합니다.
    """
    try:
        new_api_key = api_key_service.create_api_key(db, current_user.id, api_key_create)
        db.commit()
        db.refresh(new_api_key)
        logger.info(f"User {current_user.email} (ID: {current_user.id}) registered API key for {new_api_key.exchange} (ID: {new_api_key.id}).")
        return new_api_key
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to register API key for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while registering API key for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API 키 등록 중 서버 오류가 발생했습니다."
        )

# 현재 '로그인한 사용자'의 API 키 목록을 가져오므로, 서비스 레이어에서 user_id로 필터링합니다.
@router.get("/", response_model=List[schemas.ApiKeyResponse], summary="Get list of user's API keys")
async def get_api_keys(
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    현재 로그인된 사용자의 등록된 거래소 API 키 목록을 조회합니다.
    """
    api_keys = api_key_service.get_api_keys(db, current_user.id, skip, limit)
    logger.info(f"User {current_user.email} fetched {len(api_keys)} API keys.")
    return api_keys

# 소유권 검증 로직을 의존성 주입으로 대체
@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific API key")
async def delete_api_key(
    # ID를 직접 받는 대신, 'get_verified_api_key'가 검증을 마친 ApiKey 객체를 주입해줍니다.
    api_key_to_delete: models.ApiKey = Depends(get_verified_api_key),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 API 키를 삭제합니다. (소유권 자동 검증)
    이 API 키를 사용하는 활성 봇이 있다면 서비스 레이어에서 삭제가 거부될 수 있습니다.
    """
    try:
        # 서비스 레이어 함수는 이제 더 단순한 인자만 받게 됩니다.
        api_key_service.delete_api_key(db, api_key_to_delete)
        db.commit()
        logger.info(f"User (ID: {api_key_to_delete.user_id}) deleted API key ID: {api_key_to_delete.id}.")
        return
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to delete API key {api_key_to_delete.id} for user (ID: {api_key_to_delete.user_id}): {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while deleting API key {api_key_to_delete.id} for user (ID: {api_key_to_delete.user_id}): {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="API 키 삭제 중 서버 오류가 발생했습니다."
        )