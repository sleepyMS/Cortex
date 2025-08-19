# file: backend/app/routers/api_keys.py

from fastapi import APIRouter, HTTPException, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List
import uuid

from .. import schemas, models
# ▼▼▼ [수정] 비동기 의존성 및 팩토리 함수 임포트 ▼▼▼
from ..dependencies import get_async_db, get_current_active_user, create_owner_verifier
from ..services.api_key_service import api_key_service
from ..limiter import limiter
# ▲▲▲ [수정] ▲▲▲

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api-keys", tags=["API Keys"])

get_verified_api_key = create_owner_verifier(models.ApiKey)

@router.post("/", response_model=schemas.ApiKeyResponse, status_code=status.HTTP_201_CREATED, summary="Register a new API key")
@limiter.limit("10/hour")
async def create_api_key(
    api_key_create: schemas.ApiKeyCreate,
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """새로운 거래소 API 키를 등록하고 암호화하여 저장합니다."""
    try:
        new_api_key = await api_key_service.create_api_key(db, current_user.id, api_key_create)
        await db.commit()
        await db.refresh(new_api_key)
        logger.info(f"New API key created for user {current_user.email}.")
        return new_api_key
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating API key for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="API 키 생성 중 서버 오류가 발생했습니다.")

@router.get("/", response_model=List[schemas.ApiKeyResponse], summary="Get list of user's API keys")
async def get_api_keys(
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """현재 사용자의 등록된 API 키 목록을 비동기로 조회합니다."""
    api_keys = await api_key_service.get_api_keys_by_user(db, current_user.id)
    logger.info(f"User {current_user.email} fetched {len(api_keys)} API keys.")
    return api_keys

@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an API key")
async def delete_api_key(
    api_key_to_delete: models.ApiKey = Depends(get_verified_api_key),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 API 키를 삭제합니다. (소유권 자동 검증)"""
    try:
        # 서비스 레이어는 이제 ID만 받도록 수정될 수 있습니다 (구현에 따라 다름)
        await api_key_service.delete_api_key(db, api_key_to_delete.id)
        await db.commit()
        logger.info(f"API key ID {api_key_to_delete.id} deleted by user {api_key_to_delete.user_id}.")
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting API key {api_key_to_delete.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="API 키 삭제 중 서버 오류가 발생했습니다.")