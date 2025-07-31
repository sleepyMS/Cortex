# file: backend/app/services/google_oauth.py

import httpx
import os
import logging # 로깅 모듈 임포트
from .oauth_base import OAuth2ServiceBase
from .. import schemas

logger = logging.getLogger(__name__)

class GoogleOAuth2(OAuth2ServiceBase):
    def __init__(self):
        super().__init__(provider_name="google")
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        self.token_url = "https://oauth2.googleapis.com/token"
        self.user_info_url = "https://www.googleapis.com/oauth2/v3/userinfo"

        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            logger.error("Google OAuth environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI) are not set.")
            # 실제 운영에서는 서비스 초기화 단계에서 에러를 발생시키거나 비활성화
            # raise ValueError("Google OAuth credentials are not fully configured.")

    async def _get_access_token(self, code: str) -> str:
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
                response.raise_for_status() # HTTP 오류 발생 시 예외
                return response.json()["access_token"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching Google access token: {e.response.status_code} - {e.response.text}", exc_info=True)
            raise ValueError(f"Failed to get Google access token: {e.response.text}")
        except Exception as e:
            logger.error(f"Unexpected error fetching Google access token: {e}", exc_info=True)
            raise ValueError("Failed to get Google access token due to an unexpected error.")


    async def get_user_info(self, code: str, state: str | None = None) -> schemas.SocialUserProfile:
        try:
            google_access_token = await self._get_access_token(code)
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.user_info_url,
                    headers={"Authorization": f"Bearer {google_access_token}"},
                )
                response.raise_for_status()
                user_data = response.json()
                
                # 필요한 필드 존재 여부 검증 및 로깅
                if not user_data.get("sub") or not user_data.get("email"):
                    logger.error(f"Google user info missing essential fields: {user_data}")
                    raise ValueError("Google user profile is incomplete.")

                return schemas.SocialUserProfile(
                    provider=self.provider,
                    social_id=user_data["sub"], # 'sub'는 필수로 존재해야 함
                    email=user_data["email"], # 'email'은 필수로 존재해야 함
                    username=user_data.get("name") # 'name'은 선택적
                )
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching Google user info: {e.response.status_code} - {e.response.text}", exc_info=True)
            raise ValueError(f"Failed to get Google user profile: {e.response.text}")
        except ValueError as e: # _get_access_token에서 발생한 ValueErrors 또는 필드 누락
            raise # 그대로 상위로 전달
        except Exception as e:
            logger.error(f"Unexpected error fetching Google user profile: {e}", exc_info=True)
            raise ValueError("Failed to get Google user profile due to an unexpected error.")

google_oauth_service = GoogleOAuth2()