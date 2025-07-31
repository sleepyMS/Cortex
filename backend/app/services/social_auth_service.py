# file: backend/app/services/social_auth_service.py

from fastapi import HTTPException, status

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import logging
import secrets

from .. import models # models 임포트
from ..security import generate_random_password # security.py에서 임시 비밀번호 생성 함수 임포트

logger = logging.getLogger(__name__)

def get_or_create_social_user(
    provider: str,
    social_id: str,
    email: str,
    username: str | None,
    db: Session
) -> models.User:
    """
    소셜 계정 정보를 바탕으로 사용자를 찾거나 생성하고, SocialAccount와 연결합니다.
    이 함수는 DB 세션을 커밋하지 않습니다. 상위 호출자가 커밋을 담당해야 합니다.
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
                email=email, # SocialAccount에도 이메일 저장
                username=username # SocialAccount에도 닉네임 저장
            )
            db.add(new_social_account)
            # db.commit() # 호출하는 라우터에서 커밋을 담당하므로 제거
            return user
        else:
            # 4. 신규 User 생성 및 SocialAccount 연결
            logger.info(f"No existing user for email {email}. Creating new user via {provider} social login.")
            
            # 4a. 제안된 username이 이미 사용 중인지 확인하고 고유하게 만듦
            final_username = username
            if final_username: # username이 제공된 경우에만 중복 확인
                db_user_by_username = db.query(models.User).filter_by(username=final_username).first()
                if db_user_by_username:
                    # 중복이라면, 뒤에 짧은 랜덤 문자열을 붙여 고유하게 만듦
                    # 최대 길이를 고려하여 자르거나 더 짧게 생성 (예: secrets.token_hex(2))
                    # username 필드 길이가 100이므로 최대 95자 + '_xxxx'
                    base_username = final_username[:95] if len(final_username) > 95 else final_username
                    final_username = f"{base_username}_{secrets.token_hex(4)}"
                    logger.info(f"Username '{username}' was duplicated, adjusted to '{final_username}'.")
            else: # username이 제공되지 않은 경우, 이메일 기반으로 기본 생성
                base_email_username = email.split('@')[0]
                final_username = f"{base_email_username}_{secrets.token_hex(4)}"
                logger.info(f"No username provided by {provider}, generated '{final_username}'.")

            # 소셜 로그인 사용자는 비밀번호가 필요 없으므로 None
            new_user = models.User(
                email=email,
                username=final_username,
                hashed_password=None, # 소셜 로그인 사용자는 비밀번호 없음
                is_active=True,
                role="user"
            )
            db.add(new_user)
            db.flush() # new_user의 ID를 즉시 얻기 위해 flush (커밋은 아님)
            # db.refresh(new_user) # ID만 필요하므로 flush로 충분

            new_social_account = models.SocialAccount(
                user_id=new_user.id,
                provider=provider,
                provider_user_id=social_id,
                email=email,
                username=final_username # 새로 생성된 사용자 이름으로 연결
            )
            db.add(new_social_account)
            # db.commit() # 호출하는 라우터에서 커밋을 담당하므로 제거
            logger.info(f"New user {new_user.email} (ID: {new_user.id}) created via {provider} social login.")
            return new_user
    except IntegrityError as e:
        db.rollback()
        logger.error(f"Database IntegrityError in get_or_create_social_user: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="데이터베이스 충돌 오류. 이미 존재하는 사용자 또는 계정일 수 있습니다.")
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred in get_or_create_social_user: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="사용자 생성/조회 중 서버 오류가 발생했습니다.")