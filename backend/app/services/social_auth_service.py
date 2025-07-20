from sqlalchemy.orm import Session
from .. import models
import secrets # 👈 secrets 모듈 임포트

def get_or_create_social_user(provider: str, social_id: str, email: str, username: str | None, db: Session) -> models.User:
    """
    소셜 계정 정보를 바탕으로 사용자를 찾거나 생성하고, SocialAccount와 연결합니다.
    """
    # 1. SocialAccount 테이블에서 먼저 조회
    social_account = db.query(models.SocialAccount).filter_by(provider=provider, provider_user_id=social_id).first()
    if social_account:
        return social_account.user

    # 2. 이메일로 기존 User 조회
    user = db.query(models.User).filter_by(email=email).first()

    if user:
        # 3. 기존 User가 있다면, 새로운 SocialAccount를 연결
        new_social_account = models.SocialAccount(
            user_id=user.id, provider=provider, provider_user_id=social_id
        )
        db.add(new_social_account)
        db.commit()
        return user
    else:
        # 👇 4. 신규 User 생성 로직 개선
        
        # 4a. 제안된 username이 이미 사용 중인지 확인
        db_user_by_username = db.query(models.User).filter_by(username=username).first()
        
        final_username = username
        # 4b. 중복이라면, 뒤에 랜덤 문자열을 붙여 고유하게 만듦
        if db_user_by_username:
            final_username = f"{username}_{secrets.token_hex(4)}"

        new_user = models.User(
            email=email,
            username=final_username,
            hashed_password=None
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        new_social_account = models.SocialAccount(
            user_id=new_user.id, provider=provider, provider_user_id=social_id
        )
        db.add(new_social_account)
        db.commit()
        return new_user