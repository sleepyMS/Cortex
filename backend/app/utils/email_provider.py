# # file: backend/app/utils/email_provider.py (신규 파일)
# import logging
# from typing import List, Dict, Any

# logger = logging.getLogger(__name__)

# class EmailProvider:
#     """이메일 전송기의 기본 인터페이스"""
#     async def send_email(self, to_email: str, subject: str, html_content: str):
#         raise NotImplementedError

# class ConsoleEmailProvider(EmailProvider):
#     """개발용: 이메일을 실제로 보내지 않고 콘솔에 내용을 출력합니다."""
#     async def send_email(self, to_email: str, subject: str, html_content: str):
#         print("--- SENDING EMAIL (CONSOLE) ---")
#         print(f"To: {to_email}")
#         print(f"Subject: {subject}")
#         print("Body (HTML):")
#         print(html_content)
#         print("-------------------------------")
#         logger.info(f"Email sent to console for: {to_email}")

# class SendGridEmailProvider(EmailProvider):
#     """프로덕션용: SendGrid를 사용하여 실제 이메일을 발송합니다."""
#     def __init__(self, api_key: str, sender_email: str):
#         self.api_key = api_key
#         self.sender_email = sender_email
    
#     async def send_email(self, to_email: str, subject: str, html_content: str):
#         # 여기에 실제 SendGrid API 연동 로직 구현
#         pass