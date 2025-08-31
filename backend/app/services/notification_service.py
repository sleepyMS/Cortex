# file: backend/app/services/notification_service.py (신규 파일)

import uuid
import logging
from typing import Dict, Any
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pathlib import Path

from .. import models, schemas
from ..config import settings
from ..utils.email_provider import EmailProvider, ConsoleEmailProvider, SendGridEmailProvider

logger = logging.getLogger(__name__)

class NotificationService:
    """
    구매 확인, 작업 완료 등 사용자에게 보내는 모든 알림을 담당하는 서비스.
    """
    def __init__(self):
        # Jinja2 템플릿 엔진 초기화
        template_dir = Path(__file__).resolve().parent.parent / "templates"
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )

        # 설정에 따라 이메일 전송기(Provider) 선택
        if settings.EMAIL.MAIL_API_KEY:
            self.email_provider: EmailProvider = SendGridEmailProvider(
                api_key=settings.EMAIL.MAIL_API_KEY,
                sender_email=settings.EMAIL.MAIL_SENDER_EMAIL
            )
            logger.info("Using SendGridEmailProvider for notifications.")
        else:
            self.email_provider: EmailProvider = ConsoleEmailProvider()
            logger.warning("No email API key found. Using ConsoleEmailProvider for notifications.")

    def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Jinja2 템플릿을 렌더링합니다."""
        template = self.jinja_env.get_template(template_name)
        return template.render(context)

    async def send_purchase_confirmation(self, db_session, order_id: str):
        """구매 완료 알림을 보냅니다."""
        # DB에서 주문 정보, 사용자 정보 등을 조회
        order = await db_session.get(models.MarketplaceOrder, uuid.UUID(order_id), options=[...])
        if not order: return

        context = {"user": order.buyer, "order": order, "frontend_url": settings.APP.FRONTEND_BASE_URL}
        html_content = self._render_template("email_purchase_confirmation.html", context)
        
        await self.email_provider.send_email(
            to_email=order.buyer.email,
            subject="Cortex 마켓플레이스 구매가 완료되었습니다.",
            html_content=html_content
        )

    async def send_backtest_completed_notification(self, db_session, backtest_id: str):
        """백테스트 완료 알림을 보냅니다."""
        backtest = await db_session.get(models.Backtest, uuid.UUID(backtest_id), options=[...])
        if not backtest: return

        context = {"user": backtest.user, "backtest": backtest, "frontend_url": settings.APP.FRONTEND_BASE_URL}
        html_content = self._render_template("email_backtest_completed.html", context)

        await self.email_provider.send_email(
            to_email=backtest.user.email,
            subject=f"'{backtest.strategy.name}' 전략의 백테스트가 완료되었습니다.",
            html_content=html_content
        )

# 서비스 인스턴스 생성
notification_service = NotificationService()