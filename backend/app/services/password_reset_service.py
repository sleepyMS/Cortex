# file: backend/app/services/password_reset_service.py

# --- 👇 [수정] 필요한 모듈들을 sqlalchemy에서 직접 임포트 ---
from sqlalchemy import select, update
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
import logging
import uuid
import secrets

from .. import models, schemas
from ..security import get_password_hash, hash_refresh_token_secret, verify_refresh_token_secret
from .email_service import email_service 
from .user_service import user_service

logger = logging.getLogger(__name__)

# 토큰 유효 시간 설정 (환경 변수 또는 설정 파일에서 관리 권장)
RESET_TOKEN_EXPIRE_MINUTES = 60 # 1시간

class PasswordResetService:
    """
    비밀번호 재설정 흐름을 관리하는 서비스.
    재설정 토큰 생성, 이메일 발송, 토큰 검증 및 비밀번호 업데이트를 담당합니다.
    """
    def __init__(self):
        self.email_service = email_service

    async def request_password_reset(self, email: str, db: AsyncSession, base_url: str) -> None:
        """
        사용자에게 비밀번호 재설정 링크를 포함한 이메일을 발송하고,
        재설정 토큰을 데이터베이스에 저장합니다. (비동기 방식으로 수정)
        """
        result = await db.execute(select(models.User).filter(models.User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            logger.info(f"Password reset requested for non-existent email: {email}")
            return

        update_stmt = (
            update(models.PasswordResetToken)
            .where(
                models.PasswordResetToken.user_id == user.id,
                models.PasswordResetToken.is_used == False,
                models.PasswordResetToken.expires_at > datetime.now(timezone.utc)
            )
            .values(is_used=True)
        )
        await db.execute(update_stmt)
        await db.flush()

        # JTI 및 Secret을 포함한 새로운 토큰 생성
        jti = str(uuid.uuid4())
        plain_secret = secrets.token_urlsafe(32)
        hashed_secret = hash_refresh_token_secret(plain_secret) 

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        
        token_record = models.PasswordResetToken(
            user_id=user.id,
            jti=jti,
            hashed_token=hashed_secret,
            expires_at=expires_at,
            is_used=False
        )
        db.add(token_record)

        # 프론트엔드 비밀번호 재설정 페이지 URL 조합 (예: /reset-password?token=JTI.SECRET)
        reset_link = f"{base_url}/reset-password?token={jti}.{plain_secret}"

        # 이메일 내용 생성 및 발송
        username = user.username if user.username else user.email.split('@')[0]
        email_content = self.email_service.get_password_reset_email_content(username, reset_link)
        
        success = await self.email_service.send_email(
            to_email=user.email,
            subject=email_content["subject"],
            html_content=email_content["html"],
            plain_text_content=email_content["plain_text"]
        )

        if success:
            logger.info(f"Password reset email sent to {user.email} (User ID: {user.id}) with JTI: {jti}")
        else:
            logger.error(f"Failed to send password reset email to {user.email} (User ID: {user.id}) for JTI: {jti}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="이메일 전송에 실패했습니다.")

    async def reset_password(self, token_string: str, new_password: str, db: AsyncSession) -> models.User:
        """
        제공된 토큰 문자열을 검증하고, 유효하면 사용자의 비밀번호를 업데이트합니다.
        """
        try:
            jti, secret = token_string.split('.')
            if not jti or not secret:
                raise ValueError("Invalid token format.")
        except ValueError:
            raise HTTPException(...)

        select_stmt = (
            select(models.PasswordResetToken)
            .options(joinedload(models.PasswordResetToken.user)) # user만 eager loading
            .where(models.PasswordResetToken.jti == jti)
        )
        result = await db.execute(select_stmt)
        token_record = result.scalar_one_or_none()

        if not token_record:
            logger.warning(f"Password reset token not found for JTI: {jti}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 재설정 링크입니다.")

        # 토큰 유효성 검증: 사용 여부, 만료 여부, 비밀 부분 일치 여부
        if token_record.is_used or \
           token_record.expires_at < datetime.now(timezone.utc) or \
           not verify_refresh_token_secret(secret, token_record.hashed_token): # security.py의 함수 재사용
            
            logger.warning(f"Invalid/Expired/Used password reset token for JTI: {jti}. Used: {token_record.is_used}, Expired: {token_record.expires_at < datetime.now(timezone.utc)}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="재설정 링크가 유효하지 않거나 만료되었습니다.")

        # 토큰 사용 완료 처리 및 사용자 비밀번호 업데이트
        token_record.is_used = True
        user = token_record.user
        if not user:
            logger.error(f"User associated with password reset token JTI {jti} not found or deleted.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="관련 사용자를 찾을 수 없습니다.")

        user.hashed_password = get_password_hash(new_password) # 비밀번호 저장이므로 get_password_hash 함수 사용
        db.add(user)
        db.add(token_record)

        # 비밀번호가 재설정되었으므로, 보안을 위해 이 사용자의 모든 활성 세션을 강제 로그아웃시킵니다.
        await user_service.revoke_all_refresh_tokens(db, user.id)
        logger.info(f"Revoked all refresh tokens for user {user.email} after password reset.")

        logger.info(f"User {user.email} (ID: {token_record.user_id}) password reset successfully with JTI: {jti}")
        return user

# 서비스 인스턴스 생성
password_reset_service = PasswordResetService()