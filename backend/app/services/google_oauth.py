import httpx
import os
from .oauth_base import OAuth2ServiceBase
from .. import schemas

class GoogleOAuth2(OAuth2ServiceBase):
    def __init__(self):
        super().__init__(provider_name="google")
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        self.token_url = "https://oauth2.googleapis.com/token"
        self.user_info_url = "https://www.googleapis.com/oauth2/v3/userinfo"

    async def _get_access_token(self, code: str) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            response.raise_for_status()
            return response.json()["access_token"]

    async def get_user_info(self, code: str, state: str | None = None) -> schemas.SocialUserProfile:
        google_access_token = await self._get_access_token(code)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.user_info_url,
                headers={"Authorization": f"Bearer {google_access_token}"},
            )
            response.raise_for_status()
            user_data = response.json()
            
            return schemas.SocialUserProfile(
                provider=self.provider,
                social_id=user_data.get("sub"),
                email=user_data.get("email"),
                username=user_data.get("name")
            )

google_oauth_service = GoogleOAuth2()