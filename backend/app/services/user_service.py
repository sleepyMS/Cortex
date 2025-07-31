# file: backend/app/services/user_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import logging
from typing import List, Optional

from .. import models, schemas
from ..security import get_password_hash, verify_password # 비밀번호 해싱/검증 임포트

logger = logging.getLogger(__name__)

def get_user_by_id(db: Session, user_id: int) -> models.User | None:
    """ID로 사용자를 조회합니다."""
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> models.User | None:
    """이메일로 사용자를 조회합니다."""
    return db.query(models.User).filter(models.User.email == email).first()

def list_users(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    is_email_verified: Optional[bool] = None,
    role: Optional[str] = None,
    search_query: Optional[str] = None
) -> List[models.User]:
    """
    조건에 따라 사용자 목록을 조회합니다 (관리자 전용).
    """
    query = db.query(models.User)

    if is_active is not None:
        query = query.filter(models.User.is_active == is_active)
    if is_email_verified is not None:
        query = query.filter(models.User.is_email_verified == is_email_verified)
    if role:
        query = query.filter(models.User.role == role)
    if search_query:
        # 이메일 또는 사용자 이름으로 검색
        query = query.filter(
            (models.User.email.ilike(f"%{search_query}%")) |
            (models.User.username.ilike(f"%{search_query}%"))
        )
    
    # 생성 시간 내림차순 정렬 (최신 사용자부터)
    users = query.order_by(models.User.created_at.desc()).offset(skip).limit(limit).all()
    logger.info(f"Listed {len(users)} users (skip={skip}, limit={limit}).")
    return users

def update_user_profile(db: Session, user: models.User, user_update: schemas.UserUpdateProfile) -> models.User:
    """
    사용자 프로필 정보 (예: username)를 업데이트합니다.
    """
    update_data = user_update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"User ID {user.id} profile updated successfully.")
    return user

def update_user_password(db: Session, user: models.User, password_update: schemas.UserUpdatePassword) -> models.User:
    """
    사용자의 비밀번호를 업데이트합니다. (기존 비밀번호 확인 포함)
    """
    if not user.hashed_password or not verify_password(password_update.old_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="기존 비밀번호가 정확하지 않습니다.")
    
    user.hashed_password = get_password_hash(password_update.new_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"User ID {user.id} password updated successfully.")
    return user

def admin_update_user(db: Session, user_id: int, user_admin_update: schemas.UserAdminUpdate) -> models.User:
    """
    관리자 권한으로 특정 사용자 정보를 업데이트합니다.
    """
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")

    update_data = user_admin_update.model_dump(exclude_unset=True)

    if "new_password" in update_data and update_data["new_password"]:
        db_user.hashed_password = get_password_hash(update_data["new_password"])
        del update_data["new_password"] # 이미 처리했으므로 삭제

    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    logger.info(f"Admin updated user ID {user_id} successfully.")
    return db_user


def delete_user(db: Session, user_id: int) -> bool:
    """
    사용자를 삭제합니다.
    CASCADE 옵션에 따라 연관된 데이터(전략, 백테스트 등)도 함께 삭제됩니다.
    """
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return False # 삭제할 사용자가 없음
    
    db.delete(db_user)
    db.commit()
    logger.info(f"User ID {user_id} and associated data deleted successfully by admin.")
    return True