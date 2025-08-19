# file: backend/app/services/social_auth_service.py

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import Optional

from .. import models
from .google_oauth import google_oauth_service
from .kakao_oauth import kakao_oauth_service
from .naver_oauth import naver_oauth_service
from .user_service import user_service

logger = logging.getLogger(__name__)

# 각 소셜 로그인 제공자 서비스를 매핑
PROVIDER_SERVICES = {
    "google": google_oauth_service,
    "kakao": kakao_oauth_service,
    "naver": naver_oauth_service,
}

class SocialAuthService:
    
    async def handle_social_callback(
        self, 
        provider: str, 
        code: str, 
        state: Optional[str], 
        db: AsyncSession
    ) -> models.User:
        """
        소셜 로그인 콜백을 통합 처리합니다.
        OAuth 서비스로 프로필을 가져온 뒤, user_service에 사용자 처리를 위임합니다.
        """
        # 1. 제공자(provider)에 맞는 OAuth 서비스 선택
        oauth_service = PROVIDER_SERVICES.get(provider)
        if not oauth_service:
            raise HTTPException(status_code=404, detail="지원하지 않는 소셜 로그인 제공자입니다.")
        
        try:
            # 2. 각 제공자 서비스로부터 표준화된 프로필 정보 획득
            user_profile = await oauth_service.get_user_info(code, state)
        except Exception as e:
            logger.error(f"Failed to get user info from {provider}: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail="소셜 프로필 정보를 가져오는 데 실패했습니다.")
        
        # 3. user_service에 사용자 조회 또는 생성을 위임
        #    - 기존 소셜 계정이 있으면 해당 사용자 반환
        #    - 이메일이 일치하는 기존 사용자가 있으면 소셜 계정 연결 후 사용자 반환
        #    - 완전히 새로운 사용자인 경우, 신규 사용자 생성 후 반환
        user = await user_service.get_or_create_social_user(
            db=db,
            provider=provider,
            social_id=user_profile.social_id,
            email=user_profile.email,
            username=user_profile.username
        )
        return user

social_auth_service = SocialAuthService()