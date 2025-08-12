# backend/app/initial_db.py

import os
import sys
import logging
from sqlalchemy.exc import IntegrityError

# 프로젝트 루트를 Python 경로에 추가 (backend 폴더 밖에서 실행 시 필요)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.app.database import engine_fastapi, Base, SessionLocal
from backend.app import models
from backend.app.security import get_password_hash
from .models import PlanType

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def init_db():
    logger.info("Attempting to create database tables...")
    try:
        Base.metadata.create_all(bind=engine_fastapi)
        logger.info("Database tables created/checked successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}", exc_info=True)
        return # 테이블 생성 실패 시 중단

    db = SessionLocal()
    try:
        # 1. 초기 구독 플랜 및 기능 데이터 정의 (plan_service.py 로직 참조)
        plans_to_seed = {
            PlanType.BASIC: {
                "price": 0.0,
                "features": {
                    "max_strategies": 3,
                    "max_coins_per_backtest": 1,
                    "live_bots_limit": 0,
                    "daily_backtest_count": 10,
                    "max_backtest_duration_years": 1,
                    "supported_timeframes": "1h,4h,1d",
                    "community_access": True,
                    "telegram_alerts": False,
                    "advanced_features_access": False,
                    "portfolio_backtest_access": False
                }
            },
            PlanType.TRADER: {
                "price": 49.99,
                "features": {
                    "max_strategies": 20,
                    "max_coins_per_backtest": 5,
                    "live_bots_limit": 3,
                    "daily_backtest_count": 100,
                    "max_backtest_duration_years": 5,
                    "supported_timeframes": "1m,5m,15m,30m,1h,4h,1d,1w,1M",
                    "community_access": True,
                    "telegram_alerts": True,
                    "advanced_features_access": False,
                    "portfolio_backtest_access": False
                }
            },
            PlanType.PRO: {
                "price": 129.99,
                "features": {
                    "max_strategies": 100,
                    "max_coins_per_backtest": 20,
                    "live_bots_limit": 10,
                    "daily_backtest_count": 9999,
                    "max_backtest_duration_years": None,
                    "supported_timeframes": "1m,5m,15m,30m,1h,4h,1d,1w,1M",
                    "community_access": True,
                    "telegram_alerts": True,
                    "advanced_features_access": True,
                    "portfolio_backtest_access": True
                }
            }
        }

        # 2. 플랜 데이터 추가 (수정된 로직)
        for plan_name, data in plans_to_seed.items():
            db_plan = db.query(models.Plan).filter(models.Plan.name == plan_name).first()
            if not db_plan:
                # Plan 객체 생성
                db_plan = models.Plan(name=plan_name, price=data['price'])
                db.add(db_plan)
                db.flush()  # Plan의 ID를 할당받기 위해 flush

                # PlanFeature 객체 생성 및 연결
                db_features = models.PlanFeature(plan_id=db_plan.id, **data['features'])
                db.add(db_features)
                logger.info(f"Seeded '{plan_name}' plan with its features.")
            else:
                logger.info(f"Plan '{plan_name}' already exists.")

        # 3. 초기 관리자 계정 생성 (기존 로직 유지)
        ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@cortex.com")
        ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "adminpassword")

        if not db.query(models.User).filter_by(email=ADMIN_EMAIL).first():
            admin_user = models.User(
                email=ADMIN_EMAIL,
                username="admin",
                hashed_password=get_password_hash(ADMIN_PASSWORD),
                role="admin",
                is_active=True,
                is_email_verified=True
            )
            db.add(admin_user)
            logger.info(f"Admin user '{ADMIN_EMAIL}' added.")
        else:
            logger.info(f"Admin user '{ADMIN_EMAIL}' already exists.")

        db.commit()
        logger.info("Initial data (plans and admin user) committed successfully.")
    except IntegrityError as e:
        db.rollback()
        logger.warning(f"Integrity error during initial data insert: {e}")
        logger.info("Rolling back changes. Initial data might already be present or conflicted.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error inserting initial data: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    init_db()