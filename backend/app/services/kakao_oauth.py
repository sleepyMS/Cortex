import httpx
import os
from .oauth_base import OAuth2ServiceBase
from .. import schemas

class KakaoOAuth2(OAuth2ServiceBase):
    def __init__(self):
        super().__init__(provider_name="kakao")
        self.client_id = os.getenv("KAKAO_CLIENT_ID")
        self.redirect_uri = os.getenv("KAKAO_REDIRECT_URI")
        self.token_url = "https://kauth.kakao.com/oauth/token"
        self.user_info_url = "https://kapi.kakao.com/v2/user/me"

    async def _get_access_token(self, code: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "authorization_code",
                    "client_id": self.client_id,
                    "redirect_uri": self.redirect_uri,
                    "code": code,
                },
            )
            response.raise_for_status()
            return response.json()["access_token"]

    async def get_user_info(self, code: str, state: str | None = None) -> schemas.SocialUserProfile:
        kakao_access_token = await self._get_access_token(code)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.user_info_url,
                headers={"Authorization": f"Bearer {kakao_access_token}"},
            )
            response.raise_for_status()
            profile = response.json()

            return schemas.SocialUserProfile(
                provider=self.provider,
                social_id=str(profile["id"]),
                email=profile["kakao_account"]["email"],
                username=profile["properties"].get("nickname")
            )

kakao_oauth_service = KakaoOAuth2()