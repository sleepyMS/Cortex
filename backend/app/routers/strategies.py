from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, models
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(
    prefix="/strategies",
    tags=["strategies"],
)

@router.post("", response_model=schemas.Strategy, status_code=status.HTTP_201_CREATED)
def create_strategy(
    strategy_in: schemas.StrategyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    현재 로그인된 사용자를 위해 새로운 투자 전략을 생성합니다.
    """
    new_strategy = models.Strategy(
        **strategy_in.model_dump(),
        author_id=current_user.id
    )
    db.add(new_strategy)
    db.commit()
    db.refresh(new_strategy)
    return new_strategy


@router.get("", response_model=List[schemas.Strategy])
def read_strategies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    현재 로그인된 사용자가 생성한 모든 전략 목록을 조회합니다.
    """
    strategies = db.query(models.Strategy).filter(models.Strategy.author_id == current_user.id).all()
    return strategies