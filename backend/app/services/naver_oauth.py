# file: backend/app/services/naver_oauth.py

import httpx
import os
import logging # 로깅 모듈 임포트
from .oauth_base import OAuth2ServiceBase
from .. import schemas

logger = logging.getLogger(__name__)

class NaverOAuth2(OAuth2ServiceBase):
    def __init__(self):
        super().__init__(provider_name="naver")
        self.client_id = os.getenv("NAVER_CLIENT_ID")
        self.client_secret = os.getenv("NAVER_CLIENT_SECRET")
        # 네이버는 redirect_uri가 token 요청에 포함되지 않지만, 클라이언트에서 필요할 수 있으므로 관리.
        # 이 예시에서는 token_url에 직접 사용하지 않음.
        self.token_url = "https://nid.naver.com/oauth2.0/token"
        self.user_info_url = "https://openapi.naver.com/v1/nid/me"

        if not all([self.client_id, self.client_secret]):
            logger.error("Naver OAuth environment variables (NAVER_CLIENT_ID, NAVER_CLIENT_SECRET) are not set.")
            # raise ValueError("Naver OAuth credentials are not fully configured.")

    async def _get_access_token(self, code: str, state: str) -> str:
        params = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "state": state, # 네이버는 state 파라미터가 필수
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.token_url, params=params)
                response.raise_for_status()
                return response.json()["access_token"]
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching Naver access token: {e.response.status_code} - {e.response.text}", exc_info=True)
            raise ValueError(f"Failed to get Naver access token: {e.response.text}")
        except Exception as e:
            logger.error(f"Unexpected error fetching Naver access token: {e}", exc_info=True)
            raise ValueError("Failed to get Naver access token due to an unexpected error.")


    async def get_user_info(self, code: str, state: str | None = None) -> schemas.SocialUserProfile:
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
                profile = profile_response.get("response", {}) # 네이버는 'response' 키 아래에 실제 프로필 정보가 있음

                # 필요한 필드 존재 여부 검증 및 로깅
                user_id = profile.get("id")
                email = profile.get("email")

                if not user_id or not email:
                    logger.error(f"Naver user info missing essential fields: id={user_id}, email={email}, raw_profile={profile_response}")
                    raise ValueError("Naver user profile is incomplete.")

                return schemas.SocialUserProfile(
                    provider=self.provider,
                    social_id=str(user_id), # ID는 필수로 존재
                    email=email, # 이메일은 필수로 존재
                    username=profile.get("name") # 이름은 선택적
                )
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching Naver user info: {e.response.status_code} - {e.response.text}", exc_info=True)
            raise ValueError(f"Failed to get Naver user profile: {e.response.text}")
        except ValueError as e:
            raise # _get_access_token에서 발생한 ValueErrors 또는 필드 누락
        except Exception as e:
            logger.error(f"Unexpected error fetching Naver user profile: {e}", exc_info=True)
            raise ValueError("Failed to get Naver user profile due to an unexpected error.")

naver_oauth_service = NaverOAuth2()