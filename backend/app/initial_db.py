# file: backend/app/initial_db.py

import logging
from sqlalchemy.exc import IntegrityError
import sys
import os

# --- (변경) 경로 설정을 스크립트 실행 방식에 맞게 개선 ---
# 이 스크립트는 프로젝트 루트(Cortex/)에서 `python -m backend.app.initial_db`로 실행하는 것을 권장합니다.
# 그렇게 하면 아래 sys.path 조작이 필요 없어집니다.
# 만약 backend 폴더에서 직접 실행해야 한다면 이 코드는 유효합니다.
# sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# --- (변경) 중앙 설정 및 올바른 동기 DB 모듈 임포트 ---
from backend.app.config import settings
from backend.app.database import sync_engine, Base, SyncSessionLocal
from backend.app import models
from backend.app.security import get_password_hash
from backend.app.models import PlanType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_db():
    """
    데이터베이스 테이블을 생성하고, 구독 플랜과 초기 관리자 계정을 시딩합니다.
    이 함수는 동기적으로 실행됩니다.
    """
    logger.info("Attempting to create database tables...")
    try:
        # (변경) 동기 엔진을 사용하여 테이블 생성
        Base.metadata.create_all(bind=sync_engine)
        logger.info("Database tables created or already exist.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}", exc_info=True)
        return

    # (변경) 동기 세션을 사용
    db = SyncSessionLocal()
    try:
        # --- 1. config.py에서 구독 플랜 정보 가져오기 ---
        plans_to_seed = {
            PlanType.BASIC: settings.PLANS.BASIC,
            PlanType.TRADER: settings.PLANS.TRADER,
            PlanType.PRO: settings.PLANS.PRO
        }
        
        # 가격 정보는 별도로 매핑
        plan_prices = {
            PlanType.BASIC: 0.0,
            PlanType.TRADER: 49.99, # 이 가격 정보도 config에 추가하는 것을 고려할 수 있습니다.
            PlanType.PRO: 129.99
        }

        logger.info("Seeding subscription plans...")
        for plan_name, features in plans_to_seed.items():
            db_plan = db.query(models.Plan).filter(models.Plan.name == plan_name).first()
            if not db_plan:
                db_plan = models.Plan(name=plan_name, price=plan_prices[plan_name])
                db.add(db_plan)
                db.flush()

                # Pydantic 모델을 dict로 변환하여 PlanFeature 생성
                feature_data = features.model_dump()
                db_features = models.PlanFeature(plan_id=db_plan.id, **feature_data)
                db.add(db_features)
                logger.info(f"Seeded '{plan_name.value}' plan with its features.")
            else:
                logger.info(f"Plan '{plan_name.value}' already exists.")

        # --- 2. config.py에서 관리자 계정 정보 가져오기 ---
        logger.info("Seeding admin user...")
        if settings.APP.ADMIN_EMAIL and settings.APP.ADMIN_PASSWORD:
            if not db.query(models.User).filter_by(email=settings.APP.ADMIN_EMAIL).first():
                admin_user = models.User(
                    email=settings.APP.ADMIN_EMAIL,
                    username="admin",
                    hashed_password=get_password_hash(settings.APP.ADMIN_PASSWORD),
                    role="admin",
                    is_active=True,
                    is_email_verified=True
                )
                db.add(admin_user)
                # 관리자에게도 기본 플랜을 할당해주는 것이 좋습니다.
                # await self._assign_basic_plan(db, new_user) 로직과 유사하게 구현 가능
                logger.info(f"Admin user '{settings.APP.ADMIN_EMAIL}' created.")
            else:
                logger.info(f"Admin user '{settings.APP.ADMIN_EMAIL}' already exists.")
        else:
            logger.warning("Admin credentials not found in .env, skipping admin user creation.")

        db.commit()
        logger.info("Initial data seeding committed successfully.")
    except IntegrityError:
        db.rollback()
        logger.warning("Initial data might already be present. Rolling back changes.")
    except Exception as e:
        db.rollback()
        logger.error(f"An error occurred during data seeding: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()