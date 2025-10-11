# file: backend/app/services/verification_service.py

from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
import logging
import uuid
import secrets

from .. import models
from ..security import hash_refresh_token_secret, verify_refresh_token_secret
from .email_service import email_service

logger = logging.getLogger(__name__)

VERIFICATION_TOKEN_EXPIRE_MINUTES = 60

class VerificationService:
    """
    이메일 인증 흐름을 관리하는 서비스.
    인증 토큰 생성, 이메일 발송, 토큰 검증 및 사용자 상태 업데이트를 담당합니다.
    """
    def __init__(self):
        self.email_service = email_service

    # --- 1. (신규) DB 트랜잭션 내에서 토큰을 준비하는 함수 ---
    async def prepare_verification_token(self, user: models.User, db: Session) -> str:
        """
        이메일 인증 토큰을 생성하고 DB 세션에 추가합니다. (COMMIT은 하지 않음)
        생성된 토큰 문자열(jti.secret)을 반환합니다.
        """
        # 기존 토큰 무효화
        update_stmt = (
            update(models.EmailVerificationToken)
            .where(
                models.EmailVerificationToken.user_id == user.id,
                models.EmailVerificationToken.is_used == False,
                models.EmailVerificationToken.expires_at > datetime.now(timezone.utc)
            )
            .values(is_used=True)
        )
        await db.execute(update_stmt)
        await db.flush()

        jti = str(uuid.uuid4())
        plain_secret = secrets.token_urlsafe(32)
        hashed_secret = hash_refresh_token_secret(plain_secret)

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_TOKEN_EXPIRE_MINUTES)
        
        token_record = models.EmailVerificationToken(
            user_id=user.id,
            jti=jti,
            hashed_token=hashed_secret,
            expires_at=expires_at,
            is_used=False
        )
        db.add(token_record)
        
        logger.info(f"Prepared verification token for {user.email} (User ID: {user.id}) with JTI: {jti}")
        
        # 이메일 발송에 사용할 원본 토큰 반환
        return f"{jti}.{plain_secret}"

    # --- 2. (신규) 준비된 토큰으로 이메일을 발송하는 함수 ---
    async def send_prepared_verification_email(self, user: models.User, token_string: str, base_url: str):
        """
        주어진 토큰 문자열로 인증 링크를 만들어 이메일을 발송합니다.
        """
        verification_link = f"{base_url}/verify-email?token={token_string}"
        username = user.username if user.username else user.email.split('@')[0]
        email_content = self.email_service.get_verification_email_content(username, verification_link)

        success = await self.email_service.send_email(
            to_email=user.email,
            subject=email_content["subject"],
            html_content=email_content["html"],
            plain_text_content=email_content["plain_text"]
        )
        if not success:
            # 이 함수는 DB 트랜잭션 밖에서 호출되므로, 실패 시 에러를 로깅하고
            # 필요에 따라 재시도 큐에 넣는 등의 후속 조치를 고려할 수 있습니다.
            # 지금은 에러를 발생시켜 호출자가 인지하게 합니다.
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="이메일 전송에 실패했습니다.")

    async def verify_email(self, token_string: str, db: AsyncSession) -> models.User:
        """
        제공된 토큰 문자열을 검증하고, 유효하면 사용자의 이메일 인증 상태를 업데이트합니다.
        """
        try:
            jti, secret = token_string.split('.')
            if not jti or not secret:
                raise ValueError("Invalid token format.")
        except ValueError:
            logger.warning(f"Received malformed verification token: {token_string[:10]}...")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 인증 링크입니다.")

        # JTI를 사용하여 데이터베이스에서 토큰 레코드 조회 (비동기 방식)
        select_stmt = (
            select(models.EmailVerificationToken)
            .options(joinedload(models.EmailVerificationToken.user)) # user만 eager loading
            .where(models.EmailVerificationToken.jti == jti)
        )
        result = await db.execute(select_stmt)
        token_record = result.scalar_one_or_none()

        if not token_record:
            logger.warning(f"Verification token not found for JTI: {jti}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 인증 링크입니다.")

        if token_record.is_used or \
           token_record.expires_at < datetime.now(timezone.utc) or \
           not verify_refresh_token_secret(secret, token_record.hashed_token):
            
            logger.warning(f"Invalid/Expired/Used verification token for JTI: {jti}. "
                           f"Used: {token_record.is_used}, "
                           f"Expired: {token_record.expires_at < datetime.now(timezone.utc)}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="인증 링크가 유효하지 않거나 만료되었습니다.")

        token_record.is_used = True
        
        user = token_record.user
        if not user:
            logger.error(f"User associated with email verification token JTI {jti} not found or deleted.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="관련 사용자를 찾을 수 없습니다.")

        user.is_email_verified = True
        
        logger.info(f"User {user.email} (ID: {user.id}) email verified successfully with JTI: {jti}.")
        return user

verification_service = VerificationService()