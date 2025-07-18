# file: backend/app/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import schemas, models
from ..database import get_db
from ..dependencies import get_current_user # 새로 생성한 의존성 함수 임포트

router = APIRouter(
    prefix="/users",
    tags=["users"],
)

@router.get("/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    """
    현재 로그인된 사용자 정보를 조회합니다.
    """
    return current_user

# (선택 사항) 특정 ID의 사용자 조회 (관리자 권한 필요 등)
# @router.get("/{user_id}", response_model=schemas.User)
# async def read_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_active_admin_user)):
#     user = db.query(models.User).filter(models.User.id == user_id).first()
#     if user is None:
#         raise HTTPException(status_code=404, detail="User not found")
#     return user