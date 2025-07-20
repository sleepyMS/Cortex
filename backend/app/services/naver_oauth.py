import httpx
import os
from .oauth_base import OAuth2ServiceBase
from .. import schemas

class NaverOAuth2(OAuth2ServiceBase):
    def __init__(self):
        super().__init__(provider_name="naver")
        self.client_id = os.getenv("NAVER_CLIENT_ID")
        self.client_secret = os.getenv("NAVER_CLIENT_SECRET")
        self.token_url = "https://nid.naver.com/oauth2.0/token"
        self.user_info_url = "https://openapi.naver.com/v1/nid/me"

    async def _get_access_token(self, code: str, state: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.token_url,
                params={
                    "grant_type": "authorization_code",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "state": state,
                },
            )
            response.raise_for_status()
            return response.json()["access_token"]

    async def get_user_info(self, code: str, state: str | None = None) -> schemas.SocialUserProfile:
        if not state:
            raise ValueError("Naver OAuth requires a 'state' parameter.")
            
        naver_access_token = await self._get_access_token(code, state)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.user_info_url,
                headers={"Authorization": f"Bearer {naver_access_token}"},
            )
            response.raise_for_status()
            profile = response.json()["response"]
            
            return schemas.SocialUserProfile(
                provider=self.provider,
                social_id=str(profile["id"]),
                email=profile["email"],
                username=profile.get("name")
            )

naver_oauth_service = NaverOAuth2()