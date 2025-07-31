# file: backend/app/services/verification_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta, timezone
import logging
import uuid # JTI 생성을 위한 uuid 임포트
import secrets # 토큰 비밀 부분 생성을 위한 secrets 임포트

from .. import models, schemas
from ..security import hash_refresh_token_secret, verify_refresh_token_secret # security.py에서 토큰 해싱/검증 함수 임포트
from .email_service import email_service # 👈 이메일 서비스 임포트

logger = logging.getLogger(__name__)

# 토큰 유효 시간 설정 (환경 변수 또는 설정 파일에서 관리 권장)
VERIFICATION_TOKEN_EXPIRE_MINUTES = 60 # 1시간

class VerificationService:
    """
    이메일 인증 흐름을 관리하는 서비스.
    인증 토큰 생성, 이메일 발송, 토큰 검증 및 사용자 상태 업데이트를 담당합니다.
    """
    def __init__(self):
        # 이메일 서비스 의존성 주입 (싱글톤 인스턴스 사용)
        self.email_service = email_service

    async def request_email_verification(self, user: models.User, db: Session, base_url: str) -> None:
        """
        사용자에게 이메일 인증 링크를 포함한 이메일을 발송하고,
        인증 토큰을 데이터베이스에 저장합니다.
        """
        # 기존에 만료되지 않고 사용되지 않은 토큰이 있다면 무효화 (일회성 토큰 보장)
        # Note: 'is_used' 필드를 사용하여 무효화 (RefreshToken의 is_revoked와 동일한 로직)
        db.query(models.EmailVerificationToken).filter(
            models.EmailVerificationToken.user_id == user.id,
            models.EmailVerificationToken.is_used == False,
            models.EmailVerificationToken.expires_at > datetime.now(timezone.utc)
        ).update({"is_used": True}) # is_revoked 대신 is_used 플래그 사용
        db.flush() # 변경사항을 즉시 반영하여 새 토큰 생성 시 충돌 방지

        # JTI (토큰의 고유 식별자) 생성
        jti = str(uuid.uuid4())
        # 토큰의 비밀 부분 생성 (클라이언트에 전달될 부분)
        plain_secret = secrets.token_urlsafe(32)
        # DB에 저장될 비밀 부분의 해싱된 형태
        hashed_secret = hash_refresh_token_secret(plain_secret) # security.py의 함수 재사용

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=VERIFICATION_TOKEN_EXPIRE_MINUTES)
        
        token_record = models.EmailVerificationToken(
            user_id=user.id,
            jti=jti,
            hashed_token=hashed_secret,
            expires_at=expires_at,
            is_used=False
        )
        db.add(token_record)
        # db.commit()는 라우터에서 처리

        # 프론트엔드 인증 페이지 URL 조합 (예: https://app.yourdomain.com/verify-email?token=JTI.SECRET)
        # base_url은 FastAPI 애플리케이션의 기본 URL (예: https://api.yourdomain.com)이 아니라,
        # 프론트엔드 애플리케이션의 URL (예: https://app.yourdomain.com)이어야 합니다.
        # 이 base_url은 routers/auth.py에서 환경 변수(FRONTEND_BASE_URL)를 통해 주입됩니다.
        verification_link = f"{base_url}/verify-email?token={jti}.{plain_secret}"

        # 이메일 내용 생성 및 발송
        username = user.username if user.username else user.email.split('@')[0]
        email_content = self.email_service.get_verification_email_content(username, verification_link)
        
        success = await self.email_service.send_email(
            to_email=user.email,
            subject=email_content["subject"],
            html_content=email_content["html"],
            plain_text_content=email_content["plain_text"]
        )

        if success:
            logger.info(f"Verification email sent to {user.email} (User ID: {user.id}) with JTI: {jti}")
        else:
            logger.error(f"Failed to send verification email to {user.email} (User ID: {user.id}) for JTI: {jti}")
            # 이메일 전송 실패는 사용자에게 직접적인 오류가 되므로, HTTPException 발생
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="이메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.")

    def verify_email(self, token_string: str, db: Session) -> models.User:
        """
        제공된 토큰 문자열을 검증하고, 유효하면 사용자의 이메일 인증 상태를 업데이트합니다.
        """
        try:
            # 토큰 문자열 파싱 (JTI.SECRET 형태)
            jti, secret = token_string.split('.')
            if not jti or not secret:
                raise ValueError("Invalid token format.")
        except ValueError:
            logger.warning(f"Received malformed verification token: {token_string[:10]}...") # 로그에는 일부만
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 인증 링크입니다.")

        # JTI를 사용하여 데이터베이스에서 토큰 레코드 조회 (인덱스 활용)
        token_record = db.query(models.EmailVerificationToken).filter(
            models.EmailVerificationToken.jti == jti
        ).first()

        if not token_record:
            logger.warning(f"Verification token not found for JTI: {jti}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않은 인증 링크입니다.")

        # 토큰 유효성 검증: 사용 여부, 만료 여부, 비밀 부분 일치 여부
        if token_record.is_used or \
           token_record.expires_at < datetime.now(timezone.utc) or \
           not verify_refresh_token_secret(secret, token_record.hashed_token): # security.py의 함수 재사용
            
            logger.warning(f"Invalid/Expired/Used verification token for JTI: {jti}. "
                           f"Used: {token_record.is_used}, "
                           f"Expired: {token_record.expires_at < datetime.now(timezone.utc)}.")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="인증 링크가 유효하지 않거나 만료되었습니다.")

        # 토큰 사용 완료 처리
        token_record.is_used = True
        
        # 사용자 이메일 인증 상태 업데이트
        user = token_record.user
        if not user: # 사용자가 삭제되었거나 관계가 깨진 경우
            logger.error(f"User associated with email verification token JTI {jti} not found or deleted.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="관련 사용자를 찾을 수 없습니다.")

        user.is_email_verified = True
        
        # db.add(user) 및 db.add(token_record)는 변경사항이 세션에 추적되므로 불필요
        # db.commit()은 라우터에서 처리
        
        logger.info(f"User {user.email} (ID: {user.id}) email verified successfully with JTI: {jti}.")
        return user

# 서비스 인스턴스 생성
verification_service = VerificationService()