# file: backend/app/services/social_auth_service.py

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional

from .. import models, schemas
from ..models import PlanType
from ..security import generate_random_password

logger = logging.getLogger(__name__)

def get_or_create_social_user(
    provider: str,
    social_id: str,
    email: str,
    username: Optional[str],
    db: Session
) -> models.User:
    """
    소셜 계정 정보를 바탕으로 사용자를 찾거나 생성하고, SocialAccount와 연결합니다.
    새로운 사용자인 경우, 기본 'Basic' 플랜을 할당합니다.
    """
    try:
        # 1. SocialAccount 테이블에서 먼저 조회: 이미 이 소셜 계정이 연결된 User가 있는지 확인
        social_account = db.query(models.SocialAccount).filter_by(provider=provider, provider_user_id=social_id).first()
        if social_account:
            logger.info(f"Existing social account found for {provider} ID {social_id}. User ID: {social_account.user_id}")
            return social_account.user

        # 2. 이메일로 기존 User 조회: 이 소셜 계정의 이메일과 일치하는 기존 User가 있는지 확인
        user = db.query(models.User).filter_by(email=email).first()

        if user:
            # 3. 기존 User가 있다면, 새로운 SocialAccount를 연결
            logger.info(f"Existing user found for email {email}. Linking social account {provider} ID {social_id}.")
            new_social_account = models.SocialAccount(
                user_id=user.id,
                provider=provider,
                provider_user_id=social_id,
                email=email,
                username=username
            )
            db.add(new_social_account)
            return user
        else:
            # 4. 이메일과 소셜 계정 모두 없으면, 새로운 사용자 및 구독 생성
            logger.info(f"No existing user for email {email}. Creating new user via {provider} social login.")
            
            final_username = username
            if final_username:
                db_user_by_username = db.query(models.User).filter_by(username=final_username).first()
                if db_user_by_username:
                    base_username = final_username[:95] if len(final_username) > 95 else final_username
                    final_username = f"{base_username}_{secrets.token_hex(4)}"
                    logger.info(f"Username '{username}' was duplicated, adjusted to '{final_username}'.")
            else:
                base_email_username = email.split('@')[0]
                final_username = f"{base_email_username}_{secrets.token_hex(4)}"
                logger.info(f"No username provided by {provider}, generated '{final_username}'.")

            new_user = models.User(
                email=email,
                username=final_username,
                hashed_password=None,
                is_active=True,
                role="user"
            )
            db.add(new_user)
            db.flush()

            new_social_account = models.SocialAccount(
                user_id=new_user.id,
                provider=provider,
                provider_user_id=social_id,
                email=email,
                username=final_username
            )
            db.add(new_social_account)

            # 👈 새로운 사용자에게 Basic Plan 할당 로직 추가
            basic_plan = db.query(models.Plan).filter(models.Plan.name == PlanType.BASIC).first()
            if not basic_plan:
                # Basic Plan이 없으면 심각한 서버 오류이므로 HTTP 예외를 발생
                db.rollback()
                logger.error("Default 'Basic Plan' not found in the database.")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="서버 오류: 기본 플랜 설정이 누락되었습니다.")

            new_subscription = models.Subscription(
                user_id=new_user.id,
                plan_id=basic_plan.id,
                status="active",
                current_period_end=datetime.max.replace(tzinfo=timezone.utc)
            )
            db.add(new_subscription)
            # 👈 여기까지 db.commit() 없이 진행하고, 라우터에서 커밋을 담당함
            
            logger.info(f"New user {new_user.email} (ID: {new_user.id}) created via {provider} social login with a Basic Plan.")
            return new_user
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database IntegrityError in get_or_create_social_user: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="데이터베이스 충돌 오류. 이미 존재하는 사용자 또는 계정일 수 있습니다.")
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred in get_or_create_social_user: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="사용자 생성/조회 중 서버 오류가 발생했습니다.")