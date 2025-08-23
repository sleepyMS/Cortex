# file: backend/app/services/kakao_oauth.py

import httpx
import logging
from .oauth_base import OAuth2ServiceBase
from .. import schemas

# --- 중앙 설정 객체 임포트 ---
from ..config import settings

logger = logging.getLogger(__name__)

class KakaoOAuth2(OAuth2ServiceBase):
    def __init__(self):
        super().__init__(provider_name="kakao")

        # --- 모든 설정을 settings 객체에서 가져옴 ---
        kakao_settings = settings.AUTH
        self.client_id = kakao_settings.KAKAO_CLIENT_ID
        self.client_secret = kakao_settings.KAKAO_CLIENT_SECRET
        self.redirect_uri = kakao_settings.KAKAO_REDIRECT_URI

        self.token_url = "https://kauth.kakao.com/oauth/token"
        self.user_info_url = "https://kapi.kakao.com/v2/user/me"

        # 카카오에서는 client_secret이 선택 사항일 수 있으므로, client_id와 redirect_uri만 검증합니다.
        if not all([self.client_id, self.redirect_uri]):
            logger.warning("Kakao OAuth credentials are not fully configured in .env file. Kakao login will be disabled.")
            self.is_configured = False
        else:
            self.is_configured = True

    async def _get_access_token(self, code: str) -> str:
        if not self.is_configured:
            raise ValueError("Kakao OAuth service is not configured.")
            
        payload = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "code": code,
        }
        if self.client_secret:
            payload["client_secret"] = self.client_secret
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.token_url, data=payload)
                response.raise_for_status()
                return response.json()["access_token"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching Kakao access token: {e.response.text}", exc_info=True)
            raise ValueError("Failed to get Kakao access token.")
        except Exception as e:
            logger.error(f"Unexpected error fetching Kakao access token: {e}", exc_info=True)
            raise ValueError("An unexpected error occurred while fetching Kakao access token.")

    async def get_user_info(self, code: str, state: str | None = None) -> schemas.SocialUserProfile:
        if not self.is_configured:
            raise ValueError("Kakao OAuth service is not configured.")

        try:
            kakao_access_token = await self._get_access_token(code)
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.user_info_url,
                    headers={"Authorization": f"Bearer {kakao_access_token}"},
                )
                response.raise_for_status()
                profile = response.json()

                kakao_account = profile.get("kakao_account", {})
                user_id = profile.get("id")
                email = kakao_account.get("email")

                if not user_id or not email:
                    logger.error(f"Kakao user info missing essential fields: id={user_id}, email={email}")
                    raise ValueError("Kakao user profile is incomplete or missing required consents.")

                return schemas.SocialUserProfile(
                    provider=self.provider,
                    social_id=str(user_id),
                    email=email,
                    username=profile.get("properties", {}).get("nickname")
                )
        except ValueError as e:
            raise e
        except Exception as e:
            logger.error(f"Unexpected error fetching Kakao user profile: {e}", exc_info=True)
            raise ValueError("An unexpected error occurred while fetching Kakao user profile.")

# 서비스 인스턴스를 생성하여 다른 곳에서 쉽게 가져다 쓸 수 있도록 합니다.
kakao_oauth_service = KakaoOAuth2()