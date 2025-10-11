# file: backend/app/services/email_service.py

import httpx
import logging
from typing import Dict

# --- 중앙 설정 객체 임포트 ---
from ..config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """
    이메일 전송을 담당하는 서비스 클래스.
    SendGrid, MailerSend 등 외부 이메일 서비스 API를 연동합니다.
    """
    def __init__(self):
        # --- 모든 설정을 settings 객체에서 가져옴 ---
        email_settings = settings.EMAIL
        self.mail_api_key = email_settings.MAIL_API_KEY
        self.mail_sender_email = email_settings.MAIL_SENDER_EMAIL
        self.mail_service_url = email_settings.MAIL_SERVICE_URL

        if not all([self.mail_api_key, self.mail_sender_email, self.mail_service_url]):
            logger.warning("Email service is not fully configured in .env file. Email sending will be disabled.")
            self.is_configured = False
        else:
            self.is_configured = True
            logger.info("Email service is configured for MailerSend.")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        plain_text_content: str | None = None
    ) -> bool:
        """단일 이메일을 비동기적으로 전송합니다."""

        if not self.is_configured:
            logger.error(f"Email service not configured. Skipping email to {to_email} with subject '{subject}'.")
            return False

        headers = {
            "Authorization": f"Bearer {self.mail_api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "from": {
                "email": self.mail_sender_email,
                "name": "Cortex"
            },
            "to": [
                {"email": to_email}
            ],
            "subject": subject,
            "text": plain_text_content or " ",
            "html": html_content
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.mail_service_url, headers=headers, json=payload, timeout=10.0)
                response.raise_for_status()
                logger.info(f"Email sent successfully to {to_email} with subject '{subject}'.")
                return True
        except httpx.HTTPStatusError as e:
            logger.error(f"MailerSend API returned an error: {e.response.text}", exc_info=True)
        except httpx.RequestError as e:
            logger.error(f"Network error sending email to {to_email}: {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {e}", exc_info=True)
        return False

    def get_verification_email_content(self, username: str, verification_link: str) -> Dict[str, str]:
        """
        이메일 인증을 위한 HTML 및 일반 텍스트 콘텐츠를 생성합니다.
        """
        subject = "Cortex: 이메일 주소를 인증해주세요!"
        html_content = f"""
        <html>
        <head></head>
        <body>
            <p>안녕하세요, {username}님!</p>
            <p>Cortex 서비스에 가입해 주셔서 감사합니다. 계정을 활성화하려면 아래 링크를 클릭하여 이메일 주소를 인증해주세요:</p>
            <p><a href="{verification_link}" style="display: inline-block; padding: 10px 20px; background-color: #6a0dad; color: white; text-decoration: none; border-radius: 5px;">이메일 인증하기</a></p>
            <p>링크가 작동하지 않거나 보이지 않으면, 다음 URL을 브라우저에 직접 붙여넣으세요:</p>
            <p>{verification_link}</p>
            <p>이 링크는 1시간 후 만료됩니다.</p>
            <p>감사합니다,<br>Cortex 팀 드림</p>
        </body>
        </html>
        """
        plain_text_content = f"""
        안녕하세요, {username}님!
        Cortex 서비스에 가입해 주셔서 감사합니다. 계정을 활성화하려면 다음 링크를 클릭하여 이메일 주소를 인증해주세요:
        {verification_link}
        이 링크는 1시간 후 만료됩니다.
        감사합니다,
        Cortex 팀 드림
        """
        return {"subject": subject, "html": html_content, "plain_text": plain_text_content}

    def get_password_reset_email_content(self, username: str, reset_link: str) -> Dict[str, str]:
        """
        비밀번호 재설정을 위한 HTML 및 일반 텍스트 콘텐츠를 생성합니다.
        """
        subject = "Cortex: 비밀번호 재설정 요청"
        html_content = f"""
        <html>
        <head></head>
        <body>
            <p>안녕하세요, {username}님!</p>
            <p>비밀번호 재설정 요청이 접수되었습니다. 비밀번호를 재설정하려면 아래 링크를 클릭해주세요:</p>
            <p><a href="{reset_link}" style="display: inline-block; padding: 10px 20px; background-color: #6a0dad; color: white; text-decoration: none; border-radius: 5px;">비밀번호 재설정하기</a></p>
            <p>링크가 작동하지 않거나 보이지 않으면, 다음 URL을 브라우저에 직접 붙여넣으세요:</p>
            <p>{reset_link}</p>
            <p>이 링크는 1시간 후 만료됩니다.</p>
            <p>만약 본인이 요청한 것이 아니라면, 이 이메일을 무시해주세요.</p>
            <p>감사합니다,<br>Cortex 팀 드림</p>
        </body>
        </html>
        """
        plain_text_content = f"""
        안녕하세요, {username}님!
        비밀번호 재설정 요청이 접수되었습니다. 비밀번호를 재설정하려면 다음 링크를 클릭해주세요:
        {reset_link}
        이 링크는 1시간 후 만료됩니다.
        만약 본인이 요청한 것이 아니라면, 이 이메일을 무시해주세요.
        감사합니다,
        Cortex 팀 드림
        """
        return {"subject": subject, "html": html_content, "plain_text": plain_text_content}

# 서비스 인스턴스 생성
email_service = EmailService()