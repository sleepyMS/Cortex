# backend/app/initial_db.py

import os
import sys
import logging
from sqlalchemy.exc import IntegrityError # IntegrityError 임포트 추가

# 프로젝트 루트를 Python 경로에 추가 (backend 폴더 밖에서 실행 시 필요)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.app.database import engine_fastapi, Base, SessionLocal
from backend.app import models
from backend.app.security import get_password_hash # 👈 비밀번호 해싱 함수 임포트

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
    
    db = SessionLocal() # FastAPI 엔진에 바인딩된 세션 인스턴스 생성
    try:
        # 1. 기본 플랜 데이터 추가 (기존 로직)
        if not db.query(models.Plan).filter_by(name="basic").first():
            basic_plan = models.Plan(
                name="basic",
                price=0.0,
                features={"max_backtests_per_day": 5, "concurrent_bots_limit": 0, "allowed_timeframes": ["1h"]}
            )
            db.add(basic_plan)
            logger.info("Basic plan added.")

        if not db.query(models.Plan).filter_by(name="trader").first():
            trader_plan = models.Plan(
                name="trader",
                price=29.99,
                features={"max_backtests_per_day": 50, "concurrent_bots_limit": 5, "allowed_timeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d"]}
            )
            db.add(trader_plan)
            logger.info("Trader plan added.")
        
        if not db.query(models.Plan).filter_by(name="pro").first():
            pro_plan = models.Plan(
                name="pro",
                price=99.99,
                features={"max_backtests_per_day": 9999, "concurrent_bots_limit": 20, "allowed_timeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"]}
            )
            db.add(pro_plan)
            logger.info("Pro plan added.")

        # 2. 초기 관리자 계정 생성 (활성화)
        ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@cortex.com") # .env에서 가져오거나 기본값 사용
        ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "adminpassword") # .env에서 가져오거나 기본값 사용

        if not db.query(models.User).filter_by(email=ADMIN_EMAIL).first():
            admin_user = models.User(
                email=ADMIN_EMAIL,
                username="admin",
                hashed_password=get_password_hash(ADMIN_PASSWORD), # security.py의 함수 사용
                role="admin", # 👈 역할 'admin' 설정
                is_active=True,
                is_email_verified=True # 관리자 계정은 바로 이메일 인증된 것으로 처리
            )
            db.add(admin_user)
            logger.info(f"Admin user '{ADMIN_EMAIL}' added.")
        else:
            logger.info(f"Admin user '{ADMIN_EMAIL}' already exists.")

        db.commit()
        logger.info("Initial data (plans and admin user) committed successfully.")
    except IntegrityError as e:
        db.rollback()
        logger.warning(f"Integrity error during initial data insert (e.g., admin user/plan already exists): {e}")
        logger.info("Rolling back changes. Initial data might already be present or conflicted.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error inserting initial data: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    init_db()