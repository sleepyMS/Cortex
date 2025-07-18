# file: backend/app/services/oauth.py

import httpx
from pydantic import BaseModel, EmailStr
import os
from dotenv import load_dotenv

load_dotenv() # .env 파일의 환경 변수를 로드

class GoogleUserInfo(BaseModel):
    id: str
    email: EmailStr
    verified_email: bool
    name: str | None = None
    picture: str | None = None

class GoogleOAuth2:
    def __init__(self):
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
        self.token_url = "https://oauth2.googleapis.com/token"
        self.user_info_url = "https://www.googleapis.com/oauth2/v3/userinfo"

    async def get_access_token(self, code: str) -> str:
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

    async def get_user_info(self, access_token: str) -> GoogleUserInfo:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.user_info_url,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            user_data = response.json()
            # Google API 응답 필드명을 GoogleUserInfo 모델에 맞게 변환
            transformed_user_data = {
                "id": user_data.get("sub"),
                "email": user_data.get("email"),
                "verified_email": user_data.get("email_verified"),
                "name": user_data.get("name"),
                "picture": user_data.get("picture"),
            }
            return GoogleUserInfo(**transformed_user_data)

google_oauth = GoogleOAuth2()