# file: backend/app/services/email_service.py

import os
import httpx # 비동기 HTTP 클라이언트
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class EmailService:
    """
    이메일 전송을 담당하는 서비스 클래스.
    SendGrid, Mailgun, AWS SES 등 외부 이메일 서비스 API를 연동합니다.
    """
    def __init__(self):
        # 환경 변수에서 이메일 서비스 관련 설정 로드
        self.mail_api_key = os.getenv("MAIL_API_KEY") # SendGrid/Mailgun 등의 API 키
        self.mail_sender_email = os.getenv("MAIL_SENDER_EMAIL") # 보내는 이메일 주소
        self.mail_service_url = os.getenv("MAIL_SERVICE_URL") # SendGrid API URL 등

        # 모든 필수 환경 변수가 설정되었는지 확인
        if not all([self.mail_api_key, self.mail_sender_email, self.mail_service_url]):
            logger.warning("Email service environment variables are not fully configured. Email sending will be skipped.")
            self.is_configured = False
        else:
            self.is_configured = True
            logger.info("Email service is configured.")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        plain_text_content: str | None = None
    ) -> bool:
        """
        단일 이메일을 전송합니다.
        SendGrid API를 사용하는 예시를 기반으로 작성되었습니다.
        다른 서비스 사용 시 페이로드 및 URL 변경 필요.
        """
        if not self.is_configured:
            logger.error(f"Email service not configured. Skipping email to {to_email} with subject '{subject}'.")
            return False

        headers = {
            "Authorization": f"Bearer {self.mail_api_key}",
            "Content-Type": "application/json"
        }
        
        # SendGrid API v3 요청 페이로드 예시
        # 다른 서비스 사용 시 해당 서비스의 API 문서 참조
        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": self.mail_sender_email},
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": plain_text_content if plain_text_content else html_content},
                {"type": "text/html", "value": html_content}
            ]
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.mail_service_url, headers=headers, json=payload, timeout=10.0)
                response.raise_for_status() # 2xx 응답이 아니면 예외 발생
                logger.info(f"Email sent successfully to {to_email} with subject '{subject}'. Status: {response.status_code}")
                return True
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error sending email to {to_email} (Subject: '{subject}'): {e.response.status_code} - {e.response.text}", exc_info=True)
        except httpx.RequestError as e:
            logger.error(f"Network error sending email to {to_email} (Subject: '{subject}'): {e}", exc_info=True)
        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email} (Subject: '{subject}'): {e}", exc_info=True)
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