# file: backend/app/services/google_oauth.py

import httpx
import logging
from .oauth_base import OAuth2ServiceBase
from .. import schemas

# --- 중앙 설정 객체 임포트 ---
from ..config import settings

logger = logging.getLogger(__name__)

class GoogleOAuth2(OAuth2ServiceBase):
    def __init__(self):
        super().__init__(provider_name="google")
        
        # --- 모든 설정을 settings 객체에서 가져옴 ---
        google_settings = settings.AUTH
        self.client_id = google_settings.GOOGLE_CLIENT_ID
        self.client_secret = google_settings.GOOGLE_CLIENT_SECRET
        self.redirect_uri = google_settings.GOOGLE_REDIRECT_URI
        
        # API 엔드포인트는 설정보다는 코드 내 상수로 유지하는 것이 더 명확할 수 있습니다.
        self.token_url = "https://oauth2.googleapis.com/token"
        self.user_info_url = "https://www.googleapis.com/oauth2/v3/userinfo"

        # Pydantic이 이미 필수 설정 검증을 해주지만, 서비스 비활성화 로직을 위해 유지합니다.
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            logger.warning("Google OAuth credentials are not fully configured in .env file. Google login will be disabled.")
            # 이 서비스가 비활성화되었음을 나타내는 플래그를 설정할 수 있습니다.
            self.is_configured = False
        else:
            self.is_configured = True

    async def _get_access_token(self, code: str) -> str:
        if not self.is_configured:
            raise ValueError("Google OAuth service is not configured.")
            
        payload = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.token_url, data=payload)
                response.raise_for_status()
                return response.json()["access_token"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching Google access token: {e.response.text}", exc_info=True)
            raise ValueError("Failed to get Google access token.")
        except Exception as e:
            logger.error(f"Unexpected error fetching Google access token: {e}", exc_info=True)
            raise ValueError("An unexpected error occurred while fetching Google access token.")

    async def get_user_info(self, code: str, state: str | None = None) -> schemas.SocialUserProfile:
        if not self.is_configured:
            raise ValueError("Google OAuth service is not configured.")
            
        try:
            google_access_token = await self._get_access_token(code)
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.user_info_url,
                    headers={"Authorization": f"Bearer {google_access_token}"},
                )
                response.raise_for_status()
                user_data = response.json()
                
                if not user_data.get("sub") or not user_data.get("email"):
                    logger.error(f"Google user info missing essential fields: {user_data}")
                    raise ValueError("Google user profile is incomplete.")

                return schemas.SocialUserProfile(
                    provider=self.provider,
                    social_id=user_data["sub"],
                    email=user_data["email"],
                    username=user_data.get("name")
                )
        except ValueError as e: # _get_access_token에서 발생한 오류를 그대로 전달
            raise e
        except Exception as e:
            logger.error(f"Unexpected error fetching Google user profile: {e}", exc_info=True)
            raise ValueError("An unexpected error occurred while fetching Google user profile.")

# 서비스 인스턴스를 생성하여 다른 곳에서 쉽게 가져다 쓸 수 있도록 합니다.
google_oauth_service = GoogleOAuth2()