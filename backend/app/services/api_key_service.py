# file: backend/app/services/api_key_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging
from typing import List, Dict, Optional
import uuid

from .. import models, schemas
from ..security import encrypt_data, decrypt_data # 👈 암호화/복호화 함수 임포트

logger = logging.getLogger(__name__)

class ApiKeyService:
    """
    사용자 거래소 API 키의 CRUD 및 암호화/복호화를 담당하는 서비스.
    """

    def create_api_key(self, db: Session, user_id: uuid.UUID, api_key_create: schemas.ApiKeyCreate) -> models.ApiKey:
        """
        새로운 API 키를 암호화하여 데이터베이스에 저장합니다.
        동일한 사용자-거래소 쌍에 대한 중복 키를 방지합니다.
        """
        # 동일한 사용자-거래소 쌍에 대한 활성 키가 이미 있는지 확인
        existing_key = db.query(models.ApiKey).filter(
            models.ApiKey.user_id == user_id,
            models.ApiKey.exchange == api_key_create.exchange,
            models.ApiKey.is_active == True # 활성 키만 확인
        ).first()
        if existing_key:
            logger.warning(f"User {user_id} attempted to add duplicate active API key for exchange {api_key_create.exchange}.")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{api_key_create.exchange}'에 대한 API 키가 이미 존재합니다. 기존 키를 비활성화하거나 삭제해주세요."
            )
        
        try:
            # API 키와 Secret 키를 암호화
            encrypted_api_key = encrypt_data(api_key_create.api_key)
            encrypted_secret_key = encrypt_data(api_key_create.secret_key)
        except RuntimeError as e:
            logger.error(f"Encryption failed for user {user_id}'s API key: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="API 키 암호화에 실패했습니다.")
        except Exception as e:
            logger.error(f"Unexpected error during API key encryption for user {user_id}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="API 키 저장 중 오류가 발생했습니다.")

        db_api_key = models.ApiKey(
            user_id=user_id,
            exchange=api_key_create.exchange,
            api_key_encrypted=encrypted_api_key,
            secret_key_encrypted=encrypted_secret_key,
            memo=api_key_create.memo,
            is_active=api_key_create.is_active
        )
        db.add(db_api_key)
        db.flush() # ID를 얻기 위해
        db.refresh(db_api_key)
        logger.info(f"User {user_id} successfully added API key for {api_key_create.exchange} (ID: {db_api_key.id}).")
        return db_api_key

    def get_api_keys(self, db: Session, user_id: uuid.UUID, skip: int = 0, limit: int = 100) -> List[models.ApiKey]:
        """
        사용자의 API 키 목록을 조회합니다. 민감 정보는 마스킹된 스키마로 반환되어야 합니다.
        """
        api_keys = db.query(models.ApiKey).filter(models.ApiKey.user_id == user_id).offset(skip).limit(limit).all()
        logger.info(f"User {user_id} fetched {len(api_keys)} API keys.")
        return api_keys

    def get_api_key_by_id(self, db: Session, api_key_id: uuid.UUID) -> models.ApiKey | None:
        """ID로 단일 API 키 레코드를 조회합니다."""
        return db.query(models.ApiKey).filter(models.ApiKey.id == api_key_id).first()

    def delete_api_key(
        self,
        db: Session,
        api_key_to_delete: models.ApiKey
    ) -> None:
        """
        사용자의 특정 API 키를 삭제합니다.
        (라우터의 의존성 계층에서 소유권 검증이 완료되었다고 가정합니다.)
        """
        active_bots_using_key = db.query(models.LiveBot).filter(
            models.LiveBot.api_key_id == api_key_to_delete.id,
            models.LiveBot.status.in_(['active', 'paused', 'initializing'])
        ).first()

        if active_bots_using_key:
            logger.warning(f"User {api_key_to_delete.user_id} attempted to delete API key {api_key_to_delete.id} which is used by active bot {active_bots_using_key.id}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이 API 키를 사용하는 활성 봇이 있습니다. 먼저 봇을 중지하거나 삭제해주세요.")

        db.delete(api_key_to_delete)
        db.flush() # 라우터에서 commit을 하므로 flush만 수행
        logger.info(f"User {api_key_to_delete.user_id} deleted API key {api_key_to_delete.id} for {api_key_to_delete.exchange}.")
        return

    def get_decrypted_api_key_pair(
        self,
        db: Session,
        api_key_record: models.ApiKey
    ) -> Dict[str, str]:
        """
        검증된 API 키 레코드를 받아 복호화된 키 쌍을 반환합니다.
        (이 함수를 호출하는 상위 서비스나 라우터에서 소유권 검증이 완료되었다고 가정합니다.)
        """
        try:
            plain_api_key = decrypt_data(api_key_record.api_key_encrypted)
            plain_secret_key = decrypt_data(api_key_record.secret_key_encrypted)
            logger.info(f"Successfully decrypted API key {api_key_record.id} for user {api_key_record.user_id}.")
            return {"api_key": plain_api_key, "secret_key": plain_secret_key}
        except RuntimeError as e:
            logger.error(f"Decryption failed for API key {api_key_record.id}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="API 키 복호화에 실패했습니다.")
        except Exception as e:
            logger.error(f"Unexpected error during API key decryption for {api_key_record.id}: {e}", exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="API 키 처리 중 오류가 발생했습니다.")

# 서비스 인스턴스 생성
api_key_service = ApiKeyService()