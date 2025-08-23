# file: backend/app/services/naver_oauth.py

import httpx
import logging
from .oauth_base import OAuth2ServiceBase
from .. import schemas

# --- 중앙 설정 객체 임포트 ---
from ..config import settings

logger = logging.getLogger(__name__)

class NaverOAuth2(OAuth2ServiceBase):
    def __init__(self):
        super().__init__(provider_name="naver")

        # --- 모든 설정을 settings 객체에서 가져옴 ---
        naver_settings = settings.AUTH
        self.client_id = naver_settings.NAVER_CLIENT_ID
        self.client_secret = naver_settings.NAVER_CLIENT_SECRET
        
        self.token_url = "https://nid.naver.com/oauth2.0/token"
        self.user_info_url = "https://openapi.naver.com/v1/nid/me"

        if not all([self.client_id, self.client_secret]):
            logger.warning("Naver OAuth credentials are not fully configured in .env file. Naver login will be disabled.")
            self.is_configured = False
        else:
            self.is_configured = True

    async def _get_access_token(self, code: str, state: str) -> str:
        if not self.is_configured:
            raise ValueError("Naver OAuth service is not configured.")
            
        params = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "state": state,
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.token_url, params=params)
                response.raise_for_status()
                return response.json()["access_token"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching Naver access token: {e.response.text}", exc_info=True)
            raise ValueError("Failed to get Naver access token.")
        except Exception as e:
            logger.error(f"Unexpected error fetching Naver access token: {e}", exc_info=True)
            raise ValueError("An unexpected error occurred while fetching Naver access token.")

    async def get_user_info(self, code: str, state: str | None = None) -> schemas.SocialUserProfile:
        if not self.is_configured:
            raise ValueError("Naver OAuth service is not configured.")
            
        if not state:
            logger.warning("Naver OAuth requires a 'state' parameter but it was missing.")
            raise ValueError("Naver OAuth requires a 'state' parameter.")
            
        try:
            naver_access_token = await self._get_access_token(code, state)
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.user_info_url,
                    headers={"Authorization": f"Bearer {naver_access_token}"},
                )
                response.raise_for_status()
                profile_response = response.json()
                profile = profile_response.get("response", {})

                user_id = profile.get("id")
                email = profile.get("email")

                if not user_id or not email:
                    logger.error(f"Naver user info missing essential fields: id={user_id}, email={email}")
                    raise ValueError("Naver user profile is incomplete.")

                return schemas.SocialUserProfile(
                    provider=self.provider,
                    social_id=str(user_id),
                    email=email,
                    username=profile.get("name")
                )
        except ValueError as e:
            raise e
        except Exception as e:
            logger.error(f"Unexpected error fetching Naver user profile: {e}", exc_info=True)
            raise ValueError("An unexpected error occurred while fetching Naver user profile.")

# 서비스 인스턴스를 생성하여 다른 곳에서 쉽게 가져다 쓸 수 있도록 합니다.
naver_oauth_service = NaverOAuth2()