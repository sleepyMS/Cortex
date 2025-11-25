# file: backend/app/services/email_service.py

import logging
from typing import Dict, Any
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from ..config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """
    이메일 전송을 담당하는 서비스 클래스.
    SMTP를 사용하여 이메일을 전송합니다.
    """
    def __init__(self):
        self.conf = ConnectionConfig(
            MAIL_USERNAME=settings.EMAIL.MAIL_USERNAME,
            MAIL_PASSWORD=settings.EMAIL.MAIL_PASSWORD,
            MAIL_FROM=settings.EMAIL.MAIL_FROM,
            MAIL_PORT=settings.EMAIL.MAIL_PORT,
            MAIL_SERVER=settings.EMAIL.MAIL_SERVER,
            MAIL_STARTTLS=settings.EMAIL.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.EMAIL.MAIL_SSL_TLS,
            USE_CREDENTIALS=settings.EMAIL.USE_CREDENTIALS,
            VALIDATE_CERTS=settings.EMAIL.VALIDATE_CERTS
        )

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        plain_text_content: str | None = None
    ) -> bool:
        """단일 이메일을 비동기적으로 전송합니다."""
        
        message = MessageSchema(
            subject=subject,
            recipients=[to_email],
            body=html_content,
            subtype=MessageType.html
        )

        fm = FastMail(self.conf)
        
        try:
            await fm.send_message(message)
            logger.info(f"Email sent successfully to {to_email} with subject '{subject}'.")
            return True
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {e}", exc_info=True)
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
    
    def get_purchase_confirmation_content(self, context: Dict[str, Any]) -> Dict[str, str]:
        """
        구매 완료 알림을 위한 HTML 및 일반 텍스트 콘텐츠를 생성합니다.
        """
        subject = f"Cortex: '{context.get('order_name', '상품')}' 구매가 완료되었습니다."
        username = context.get('user_username') or context.get('user_email', '고객')
        
        html_content = f"""
        <html>
        <head></head>
        <body>
            <p>안녕하세요, {username}님!</p>
            <p>Cortex 마켓플레이스에서 주문이 성공적으로 처리되었습니다.</p>
            <ul style="list-style-type: none; padding-left: 0;">
                <li><strong>주문명:</strong> {context.get('order_name', 'N/A')}</li>
                <li><strong>주문 ID:</strong> {context.get('order_id', 'N/A')}</li>
                <li><strong>결제 금액:</strong> {int(context.get('total_amount', 0))}원</li>
            </ul>
            <p>구매하신 상품(크레딧 등)은 계정에 즉시 반영되었습니다. 인벤토리 또는 크레딧 내역을 확인해주세요.</p>
            <p>Cortex를 이용해 주셔서 감사합니다!</p>
            <br>
            <p><a href="{context.get('frontend_url', '#')}/dashboard?tab=credits" style="display: inline-block; padding: 10px 20px; background-color: #6a0dad; color: white; text-decoration: none; border-radius: 5px;">크레딧 관리하기</a></p>
            <br>
            <p>감사합니다,<br>Cortex 팀 드림</p>
        </body>
        </html>
        """
        
        plain_text_content = f"""
        안녕하세요, {username}님!
        Cortex 마켓플레이스에서 주문이 성공적으로 처리되었습니다.
        - 주문명: {context.get('order_name', 'N/A')}
        - 주문 ID: {context.get('order_id', 'N/A')}
        - 결제 금액: {int(context.get('total_amount', 0))}원

        구매하신 상품(크레딧 등)은 계정에 즉시 반영되었습니다. 인벤토리 또는 크레딧 내역을 확인해주세요.
        Cortex를 이용해 주셔서 감사합니다!

        내 인벤토리 보러가기: {context.get('frontend_url', '#')}/settings/inventory
        
        감사합니다,
        Cortex 팀 드림
        """
        
        return {"subject": subject, "html": html_content, "plain_text": plain_text_content}
    
    def get_backtest_completed_content(self, context: Dict[str, Any]) -> Dict[str, str]:
        """
        백테스트 완료 알림을 위한 HTML 및 일반 텍스트 콘텐츠를 생성합니다.
        """
        subject = f"Cortex: '{context.get('strategy_name', '전략')}' 백테스트가 완료되었습니다."
        username = context.get('username', '고객')
        
        html_content = f"""
        <html>
        <head></head>
        <body>
            <p>안녕하세요, {username}님!</p>
            <p>'<b>{context.get('strategy_name', 'N/A')}</b>' 전략에 대한 백테스트가 성공적으로 완료되었습니다.</p>
            <p>지금 바로 결과를 확인해보세요.</p>
            <br>
            <p><a href="{context.get('frontend_url', '#')}/backtester/{context.get('backtest_id', '')}" style="display: inline-block; padding: 10px 20px; background-color: #6a0dad; color: white; text-decoration: none; border-radius: 5px;">결과 확인하기</a></p>
            <br>
            <p>감사합니다,<br>Cortex 팀 드림</p>
        </body>
        </html>
        """
        
        plain_text_content = f"""
        안녕하세요, {username}님!
        '{context.get('strategy_name', 'N/A')}' 전략에 대한 백테스트가 성공적으로 완료되었습니다.
        지금 바로 결과를 확인해보세요: {context.get('frontend_url', '#')}/backtester/{context.get('backtest_id', '')}
        
        감사합니다,
        Cortex 팀 드림
        """
        return {"subject": subject, "html": html_content, "plain_text": plain_text_content}
    
    def get_subscription_welcome_content(self, context: Dict[str, Any]) -> Dict[str, str]:
        """
        첫 구독 결제(환영) 알림을 위한 HTML 및 일반 텍스트 콘텐츠를 생성합니다.
        """
        plan_name = context.get('plan_name', '플랜')
        username = context.get('username') or context.get('user_email', '고객')
        next_payment_date = context.get('next_payment_date')
        
        subject = f"Cortex: {plan_name} 플랜 구독을 시작해주셔서 감사합니다!"
        
        html_content = f"""
        <html>
        <head></head>
        <body>
            <p>안녕하세요, {username}님!</p>
            <p>Cortex의 '<b>{plan_name}</b>' 플랜 구독이 성공적으로 시작되었습니다. Cortex의 모든 기능을 지금 바로 이용해보세요.</p>
            <br>
            <p><strong>결제 내역:</strong></p>
            <ul style="list-style-type: none; padding-left: 0;">
                <li><strong>플랜명:</strong> {plan_name}</li>
                <li><strong>결제 금액:</strong> {int(context.get('amount', 0))}원</li>
                <li><strong>다음 결제일:</strong> {next_payment_date.strftime('%Y년 %m월 %d일') if next_payment_date else 'N/A'}</li>
            </ul>
            <br>
            <p><a href="{context.get('frontend_url', '#')}/dashboard" style="display: inline-block; padding: 10px 20px; background-color: #6a0dad; color: white; text-decoration: none; border-radius: 5px;">대시보드로 이동하기</a></p>
            <br>
            <p>감사합니다,<br>Cortex 팀 드림</p>
        </body>
        </html>
        """
        
        plain_text_content = f"""
        안녕하세요, {username}님!
        Cortex의 '{plan_name}' 플랜 구독이 성공적으로 시작되었습니다. Cortex의 모든 기능을 지금 바로 이용해보세요.

        [결제 내역]
        - 플랜명: {plan_name}
        - 결제 금액: {int(context.get('amount', 0))}원
        - 다음 결제일: {next_payment_date.strftime('%Y년 %m월 %d일') if next_payment_date else 'N/A'}

        대시보드로 이동하기: {context.get('frontend_url', '#')}/dashboard
        
        감사합니다,
        Cortex 팀 드림
        """
        return {"subject": subject, "html": html_content, "plain_text": plain_text_content}

    def get_subscription_renewal_content(self, context: Dict[str, Any]) -> Dict[str, str]:
        """
        정기 결제(갱신) 알림을 위한 HTML 및 일반 텍스트 콘텐츠를 생성합니다.
        """
        plan_name = context.get('plan_name', '플랜')
        username = context.get('username') or context.get('user_email', '고객')
        next_payment_date = context.get('next_payment_date')

        subject = f"Cortex: {plan_name} 플랜 구독이 갱신되었습니다."
        
        html_content = f"""
        <html>
        <head></head>
        <body>
            <p>안녕하세요, {username}님!</p>
            <p>Cortex의 '<b>{plan_name}</b>' 플랜 구독이 성공적으로 갱신되었습니다. 이용해주셔서 감사합니다.</p>
            <br>
            <p><strong>결제 내역:</strong></p>
            <ul style="list-style-type: none; padding-left: 0;">
                <li><strong>플랜명:</strong> {plan_name}</li>
                <li><strong>결제 금액:</strong> {int(context.get('amount', 0))}원</li>
                <li><strong>다음 결제일:</strong> {next_payment_date.strftime('%Y년 %m월 %d일') if next_payment_date else 'N/A'}</li>
            </ul>
            <br>
            <p>구독 상태는 언제든지 '설정' 메뉴에서 관리하실 수 있습니다.</p>
            <p><a href="{context.get('frontend_url', '#')}/settings/subscription" style="display: inline-block; padding: 10px 20px; background-color: #6a0dad; color: white; text-decoration: none; border-radius: 5px;">구독 관리하기</a></p>
            <br>
            <p>감사합니다,<br>Cortex 팀 드림</p>
        </body>
        </html>
        """
        
        plain_text_content = f"""
        안녕하세요, {username}님!
        Cortex의 '{plan_name}' 플랜 구독이 성공적으로 갱신되었습니다. 이용해주셔서 감사합니다.

        [결제 내역]
        - 플랜명: {plan_name}
        - 결제 금액: {int(context.get('amount', 0))}원
        - 다음 결제일: {next_payment_date.strftime('%Y년 %m월 %d일') if next_payment_date else 'N/A'}

        구독 관리하기: {context.get('frontend_url', '#')}/settings/subscription
        
        감사합니다,
        Cortex 팀 드림
        """
        return {"subject": subject, "html": html_content, "plain_text": plain_text_content}
    
    def get_subscription_failed_content(self, context: Dict[str, Any]) -> Dict[str, str]:
        """
        정기 결제 실패 알림을 위한 HTML 및 일반 텍스트 콘텐츠를 생성합니다.
        """
        plan_name = context.get('plan_name', '플랜')
        username = context.get('username') or context.get('user_email', '고객')
        
        subject = f"Cortex: {plan_name} 플랜 결제에 실패했습니다."
        
        html_content = f"""
        <html>
        <head></head>
        <body>
            <p>안녕하세요, {username}님.</p>
            <p>'<b>{plan_name}</b>' 플랜의 정기 결제에 실패하여 구독이 비활성화되었습니다.</p>
            <br>
            <p><strong>실패 사유:</strong> {context.get('failure_message', '카드사 또는 은행에서 결제를 거부했습니다.')}</p>
            <p>서비스를 계속 이용하시려면, '설정' 메뉴에서 결제 정보를 업데이트하고 구독을 다시 시작해주세요.</p>
            <br>
            <p><a href="{context.get('frontend_url', '#')}/settings/subscription" style="display: inline-block; padding: 10px 20px; background-color: #D92D20; color: white; text-decoration: none; border-radius: 5px;">결제 정보 업데이트하기</a></p>
            <br>
            <p>감사합니다,<br>Cortex 팀 드림</p>
        </body>
        </html>
        """
        
        plain_text_content = f"""
        안녕하세요, {username}님.
        '{plan_name}' 플랜의 정기 결제에 실패하여 구독이 비활성화되었습니다.

        실패 사유: {context.get('failure_message', '카드사 또는 은행에서 결제를 거부했습니다.')}
        서비스를 계속 이용하시려면, '설정' 메뉴에서 결제 정보를 업데이트하고 구독을 다시 시작해주세요.

        결제 정보 업데이트하기: {context.get('frontend_url', '#')}/settings/subscription
        
        감사합니다,
        Cortex 팀 드림
        """
        return {"subject": subject, "html": html_content, "plain_text": plain_text_content}

    def get_optimization_completed_content(self, context: Dict[str, Any]) -> Dict[str, str]:
        """
        최적화 완료 알림을 위한 HTML 및 일반 텍스트 콘텐츠를 생성합니다.
        """
        subject = f"Cortex: '{context.get('strategy_name', '전략')}' 최적화가 완료되었습니다."
        username = context.get('username', '고객')
        
        html_content = f"""
        <html>
        <head></head>
        <body>
            <p>안녕하세요, {username}님!</p>
            <p>'<b>{context.get('strategy_name', 'N/A')}</b>' 전략에 대한 파라미터 최적화 작업이 완료되었습니다.</p>
            <p>최적화된 파라미터와 성과를 확인하고 전략을 업데이트해보세요.</p>
            <br>
            <p><a href="{context.get('frontend_url', '#')}/optimization/{context.get('job_id', '')}" style="display: inline-block; padding: 10px 20px; background-color: #6a0dad; color: white; text-decoration: none; border-radius: 5px;">결과 확인하기</a></p>
            <br>
            <p>감사합니다,<br>Cortex 팀 드림</p>
        </body>
        </html>
        """
        
        plain_text_content = f"""
        안녕하세요, {username}님!
        '{context.get('strategy_name', 'N/A')}' 전략에 대한 파라미터 최적화 작업이 완료되었습니다.
        최적화된 파라미터와 성과를 확인하고 전략을 업데이트해보세요.

        결과 확인하기: {context.get('frontend_url', '#')}/optimization/{context.get('job_id', '')}
        
        감사합니다,
        Cortex 팀 드림
        """
        return {"subject": subject, "html": html_content, "plain_text": plain_text_content}
        
# 서비스 인스턴스 생성
email_service = EmailService()