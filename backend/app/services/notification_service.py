# file: backend/app/services/notification_service.py (신규 파일)

import uuid
import logging
from typing import Dict, Any

from sqlalchemy.orm import selectinload, joinedload

from .. import models, schemas
from ..config import settings

from .email_service import email_service 
from .. import models, schemas
from ..config import settings

logger = logging.getLogger(__name__)

class NotificationService:
    """
    구매 확인, 작업 완료 등 사용자에게 보내는 모든 알림을 담당하는 서비스.
    """
    def __init__(self):
        self.email_service = email_service
        logger.info("NotificationService initialized (using EmailService).")

    async def send_purchase_confirmation(self, payload: Dict[str, Any]): 
        """페이로드 정보로 구매 완료 알림을 보냅니다."""
        
        buyer_email = payload.get("buyer_email")
        if not buyer_email:
            logger.error(f"send_purchase_confirmation missing 'buyer_email' in payload.")
            return

        # email_service로 템플릿 context 생성
        context = {
            "user_email": buyer_email,
            "user_username": payload.get("buyer_username"),
            "order_name": payload.get("order_name"),
            "order_id": payload.get("order_id"),
            "total_amount": payload.get("total_amount"),
            "frontend_url": settings.APP.FRONTEND_BASE_URL
        }
        
        # email_service에서 템플릿 내용 가져오기
        email_content = self.email_service.get_purchase_confirmation_content(context)
        
        # email_service로 이메일 발송
        await self.email_service.send_email(
            to_email=buyer_email,
            subject=email_content["subject"],
            html_content=email_content["html"],
            plain_text_content=email_content["plain_text"]
        )

    async def send_backtest_completed_notification(self, db_session, backtest_id: str):
        """
        백테스트 완료 알림을 email_service를 통해 보냅니다.
        (이 태스크는 DB 접근이 필수입니다.)
        """
        
        # 1. DB에서 백테스트 정보와 사용자, 전략 이름을 Eager Loading
        backtest = await db_session.get(
            models.Backtest, 
            uuid.UUID(backtest_id), 
            options=[
                joinedload(models.Backtest.user),
                joinedload(models.Backtest.strategy)
            ]
        )
        
        if not backtest or not backtest.user or not backtest.strategy:
            logger.warning(f"Notification service: Backtest {backtest_id} or relations not found. Aborting email.")
            return

        # 2. email_service에 전달할 context 생성
        context = {
            "username": backtest.user.username or backtest.user.email.split('@')[0],
            "user_email": backtest.user.email,
            "strategy_name": backtest.strategy.name,
            "backtest_id": str(backtest.id),
            "frontend_url": settings.APP.FRONTEND_BASE_URL
        }

        # 3. email_service를 통해 템플릿 생성
        email_content = self.email_service.get_backtest_completed_content(context)
        
        # 4. email_service를 통해 이메일 발송
        await self.email_service.send_email(
            to_email=backtest.user.email,
            subject=email_content["subject"],
            html_content=email_content["html"],
            plain_text_content=email_content["plain_text"]
        )

    async def send_subscription_created_email(self, payload: Dict[str, Any]):
        """
        'subscription.created' 이벤트를 받아 환영 이메일을 보냅니다.
        (DB 접근 없음)
        """
        user_email = payload.get("user_email")
        if not user_email:
            logger.error(f"send_subscription_created_email missing 'user_email' in payload.")
            return

        logger.info(f"Sending subscription WELCOME email to {user_email}.")

        # 1. email_service에 전달할 context 생성 (payload 재사용)
        #    (email_service 템플릿 함수가 frontend_url을 사용하므로 추가)
        payload["frontend_url"] = settings.APP.FRONTEND_BASE_URL
        
        # 2. email_service에서 템플릿 내용 가져오기
        email_content = self.email_service.get_subscription_welcome_content(payload)
        
        # 3. email_service로 이메일 발송
        await self.email_service.send_email(
            to_email=user_email,
            subject=email_content["subject"],
            html_content=email_content["html"],
            plain_text_content=email_content["plain_text"]
        )

    async def send_subscription_renewed_email(self, payload: Dict[str, Any]):
        """
        'subscription.renewed' 이벤트를 받아 갱신 이메일을 보냅니다.
        (DB 접근 없음)
        """
        user_email = payload.get("user_email")
        if not user_email:
            logger.error(f"send_subscription_renewed_email missing 'user_email' in payload.")
            return
            
        logger.info(f"Sending subscription RENEWAL email to {user_email}.")

        # 1. email_service에 전달할 context 생성 (payload 재사용)
        payload["frontend_url"] = settings.APP.FRONTEND_BASE_URL
        
        # 2. email_service에서 템플릿 내용 가져오기
        email_content = self.email_service.get_subscription_renewal_content(payload)
        
        # 3. email_service로 이메일 발송
        await self.email_service.send_email(
            to_email=user_email,
            subject=email_content["subject"],
            html_content=email_content["html"],
            plain_text_content=email_content["plain_text"]
        )

    async def send_subscription_failed_email(self, payload: Dict[str, Any]):
        """
        'subscription.payment.failed' 이벤트를 받아 실패 이메일을 보냅니다.
        (DB 접근 없음)
        """
        user_email = payload.get("user_email")
        if not user_email:
            logger.error(f"send_subscription_failed_email missing 'user_email' in payload.")
            return

        logger.info(f"Sending subscription FAILED email to {user_email}.")

        payload["frontend_url"] = settings.APP.FRONTEND_BASE_URL
        email_content = self.email_service.get_subscription_failed_content(payload)
        
        await self.email_service.send_email(
            to_email=user_email,
            subject=email_content["subject"],
            html_content=email_content["html"],
            plain_text_content=email_content["plain_text"]
        )

# 서비스 인스턴스 생성
notification_service = NotificationService()