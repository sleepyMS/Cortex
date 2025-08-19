# file: backend/app/services/api_key_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
import logging
from typing import List, Dict, Optional
import uuid

from .. import models, schemas
from ..security import encrypt_data, decrypt_data

logger = logging.getLogger(__name__)

class ApiKeyService:
    """
    사용자 거래소 API 키의 CRUD 및 암호화/복호화를 담당하는 비동기 서비스.
    """

    async def create_api_key(self, db: AsyncSession, user_id: uuid.UUID, api_key_create: schemas.ApiKeyCreate) -> models.ApiKey:
        """새로운 API 키를 암호화하여 데이터베이스에 비동기로 저장합니다."""
        # 동일한 사용자-거래소 쌍에 대한 활성 키가 이미 있는지 확인
        query = select(models.ApiKey).filter(
            models.ApiKey.user_id == user_id,
            models.ApiKey.exchange == api_key_create.exchange,
            models.ApiKey.is_active == True
        )
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{api_key_create.exchange}'에 대한 활성 API 키가 이미 존재합니다."
            )
        
        try:
            encrypted_api_key = encrypt_data(api_key_create.api_key)
            encrypted_secret_key = encrypt_data(api_key_create.secret_key)
        except Exception as e:
            logger.error(f"Encryption failed for user {user_id}'s API key: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="API 키 암호화에 실패했습니다.")

        db_api_key = models.ApiKey(
            user_id=user_id,
            exchange=api_key_create.exchange,
            api_key_encrypted=encrypted_api_key,
            secret_key_encrypted=encrypted_secret_key,
            memo=api_key_create.memo,
            is_active=api_key_create.is_active
        )
        db.add(db_api_key)
        await db.flush()
        return db_api_key

    async def get_api_keys_by_user(self, db: AsyncSession, user_id: uuid.UUID) -> List[models.ApiKey]:
        """사용자의 API 키 목록을 비동기로 조회합니다."""
        query = select(models.ApiKey).filter(models.ApiKey.user_id == user_id).order_by(models.ApiKey.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all()

    async def get_api_key_by_id(self, db: AsyncSession, api_key_id: uuid.UUID) -> Optional[models.ApiKey]:
        """ID로 단일 API 키 레코드를 비동기로 조회합니다."""
        result = await db.execute(select(models.ApiKey).filter(models.ApiKey.id == api_key_id))
        return result.scalar_one_or_none()

    async def delete_api_key(self, db: AsyncSession, api_key_id: uuid.UUID):
        """사용자의 특정 API 키를 비동기로 삭제합니다."""
        result = await db.execute(select(models.ApiKey).filter(models.ApiKey.id == api_key_id))
        api_key_to_delete = result.scalar_one_or_none()
        
        if not api_key_to_delete:
            # 삭제 대상이 없으면 조용히 종료
            return

        # 이 API 키를 사용하는 활성 봇이 있는지 확인
        active_bots_query = select(models.LiveBot).filter(
            models.LiveBot.api_key_id == api_key_to_delete.id,
            models.LiveBot.status.in_(['active', 'paused', 'initializing'])
        )
        result = await db.execute(active_bots_query)
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이 API 키를 사용하는 활성 봇이 있습니다. 먼저 봇을 중지하거나 삭제해주세요.")

        await db.delete(api_key_to_delete)
        await db.flush()
        logger.info(f"User {api_key_to_delete.user_id} deleted API key {api_key_to_delete.id}.")

    def get_decrypted_api_key_pair(self, api_key_record: models.ApiKey) -> Dict[str, str]:
        """
        검증된 API 키 레코드를 받아 복호화된 키 쌍을 반환합니다.
        (DB I/O가 없으므로 동기 함수로 유지)
        """
        try:
            plain_api_key = decrypt_data(api_key_record.api_key_encrypted)
            plain_secret_key = decrypt_data(api_key_record.secret_key_encrypted)
            return {"api_key": plain_api_key, "secret_key": plain_secret_key}
        except Exception as e:
            logger.error(f"Decryption failed for API key {api_key_record.id}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="API 키 복호화에 실패했습니다.")

# 서비스 인스턴스 생성
api_key_service = ApiKeyService()