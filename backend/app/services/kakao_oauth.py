# file: backend/app/services/kakao_oauth.py

import httpx
import os
import logging # 로깅 모듈 임포트
from .oauth_base import OAuth2ServiceBase
from .. import schemas

logger = logging.getLogger(__name__)

class KakaoOAuth2(OAuth2ServiceBase):
    def __init__(self):
        super().__init__(provider_name="kakao")
        self.client_id = os.getenv("KAKAO_CLIENT_ID")
        self.client_secret = os.getenv("KAKAO_CLIENT_SECRET")
        self.redirect_uri = os.getenv("KAKAO_REDIRECT_URI")
        self.token_url = "https://kauth.kakao.com/oauth/token"
        self.user_info_url = "https://kapi.kakao.com/v2/user/me"

        if not all([self.client_id, self.redirect_uri]): # client_secret은 카카오에서 선택적
            logger.error("Kakao OAuth environment variables (KAKAO_CLIENT_ID, KAKAO_REDIRECT_URI) are not set.")
            # raise ValueError("Kakao OAuth credentials are not fully configured.")

    async def _get_access_token(self, code: str) -> str:
        payload = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "code": code,
        }
        if self.client_secret: # client_secret이 존재하면 payload에 추가
            payload["client_secret"] = self.client_secret
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.token_url, data=payload)
                response.raise_for_status()
                return response.json()["access_token"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching Kakao access token: {e.response.status_code} - {e.response.text}", exc_info=True)
            raise ValueError(f"Failed to get Kakao access token: {e.response.text}")
        except Exception as e:
            logger.error(f"Unexpected error fetching Kakao access token: {e}", exc_info=True)
            raise ValueError("Failed to get Kakao access token due to an unexpected error.")


    async def get_user_info(self, code: str, state: str | None = None) -> schemas.SocialUserProfile:
        try:
            kakao_access_token = await self._get_access_token(code)
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.user_info_url,
                    headers={"Authorization": f"Bearer {kakao_access_token}"},
                )
                response.raise_for_status()
                profile = response.json()

                # 필요한 필드 존재 여부 검증 및 로깅
                kakao_account = profile.get("kakao_account", {})
                user_id = profile.get("id")
                email = kakao_account.get("email")

                if not user_id or not email:
                    logger.error(f"Kakao user info missing essential fields: id={user_id}, email={email}, raw_profile={profile}")
                    raise ValueError("Kakao user profile is incomplete or missing required consents.")

                return schemas.SocialUserProfile(
                    provider=self.provider,
                    social_id=str(user_id), # ID는 필수로 존재
                    email=email, # 이메일은 필수로 존재
                    username=profile.get("properties", {}).get("nickname") # 닉네임은 선택적
                )
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching Kakao user info: {e.response.status_code} - {e.response.text}", exc_info=True)
            raise ValueError(f"Failed to get Kakao user profile: {e.response.text}")
        except ValueError as e:
            raise # _get_access_token에서 발생한 ValueErrors 또는 필드 누락
        except Exception as e:
            logger.error(f"Unexpected error fetching Kakao user profile: {e}", exc_info=True)
            raise ValueError("Failed to get Kakao user profile due to an unexpected error.")

kakao_oauth_service = KakaoOAuth2()