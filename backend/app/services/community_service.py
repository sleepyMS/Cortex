# file: backend/app/services/community_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
import logging
from typing import List, Optional
import uuid

from .. import models, schemas

logger = logging.getLogger(__name__)

class CommunityService:
    """
    커뮤니티 게시물, 댓글, 좋아요의 CRUD 및 관련 비즈니스 로직을 담당하는 비동기 서비스.
    """

    # --- 게시물 (Posts) 관련 서비스 함수 ---

    async def create_post(self, db: AsyncSession, user: models.User, post_create: schemas.CommunityPostCreate) -> models.CommunityPost:
        """새로운 커뮤니티 게시물을 비동기로 생성합니다."""
        if post_create.backtest_id:
            # 백테스트 존재 여부 및 소유권 확인
            result = await db.execute(select(models.Backtest).filter(models.Backtest.id == post_create.backtest_id))
            backtest = result.scalar_one_or_none()
            if not backtest: raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="공유하려는 백테스트 결과를 찾을 수 없습니다.")
            if backtest.user_id != user.id: raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 백테스트를 공유할 권한이 없습니다.")
            
            result = await db.execute(select(models.CommunityPost).filter(models.CommunityPost.backtest_id == post_create.backtest_id))
            if result.scalar_one_or_none(): raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이 백테스트 결과는 이미 공유되었습니다.")

        db_post = models.CommunityPost(
            author_id=user.id, backtest_id=post_create.backtest_id,
            title=post_create.title, content=post_create.content
        )
        db.add(db_post)
        await db.flush()
        return db_post

    async def get_posts(
        self, db: AsyncSession, skip: int, limit: int, sort_by: Optional[str],
        author_id: Optional[uuid.UUID], current_user: Optional[models.User]
    ) -> List[models.CommunityPost]:
        """게시물 목록을 비동기로 조회합니다."""
        query = select(models.CommunityPost).options(
            joinedload(models.CommunityPost.author),
            joinedload(models.CommunityPost.backtest)
        )

        if author_id:
            query = query.filter(models.CommunityPost.author_id == author_id)
        
        if sort_by == "created_at_asc":
            query = query.order_by(models.CommunityPost.created_at.asc())
        else:
            query = query.order_by(models.CommunityPost.created_at.desc())

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_post_by_id(self, db: AsyncSession, post_id: uuid.UUID) -> Optional[models.CommunityPost]:
        """ID로 단일 게시물을 Eager Loading하여 비동기로 조회합니다."""
        query = select(models.CommunityPost).options(
            joinedload(models.CommunityPost.author),
            joinedload(models.CommunityPost.backtest).joinedload(models.Backtest.result)
        ).filter(models.CommunityPost.id == post_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def update_post(
        self, db: AsyncSession, post_to_update: models.CommunityPost, post_update_data: schemas.CommunityPostUpdate
    ) -> models.CommunityPost:
        """게시물을 비동기로 업데이트합니다."""
        update_data = post_update_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(post_to_update, key, value)
        db.add(post_to_update)
        await db.flush()
        return post_to_update

    async def delete_post(self, db: AsyncSession, post_to_delete: models.CommunityPost):
        """게시물을 비동기로 삭제합니다."""
        await db.delete(post_to_delete)
        await db.flush()
        return

    # --- 댓글 (Comments) 관련 서비스 함수 ---

    async def create_comment(
        self, db: AsyncSession, user: models.User, post_id: uuid.UUID, comment_create: schemas.CommentCreate
    ) -> models.Comment:
        """게시물에 새 댓글을 비동기로 추가합니다."""
        db_comment = models.Comment(
            post_id=post_id,
            author_id=user.id,
            content=comment_create.content
        )
        db.add(db_comment)
        await db.flush()
        return db_comment

    async def get_comments_by_post_id(self, db: AsyncSession, post_id: uuid.UUID, skip: int, limit: int) -> List[models.Comment]:
        """특정 게시물의 댓글 목록을 비동기로 조회합니다."""
        query = select(models.Comment).options(joinedload(models.Comment.author)).filter(models.Comment.post_id == post_id).order_by(models.Comment.created_at.asc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def delete_comment(self, db: AsyncSession, comment_to_delete: models.Comment):
        """댓글을 비동기로 삭제합니다."""
        await db.delete(comment_to_delete)
        await db.flush()
        return

    # --- 좋아요 (Likes) 관련 서비스 함수 ---

    async def toggle_like(self, db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID) -> str:
        """게시물에 '좋아요'를 추가하거나 취소합니다."""
        result = await db.execute(select(models.CommunityPost).filter(models.CommunityPost.id == post_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="좋아요를 누를 게시물을 찾을 수 없습니다.")

        like_query = select(models.Like).filter_by(post_id=post_id, user_id=user_id)
        result = await db.execute(like_query)
        existing_like = result.scalar_one_or_none()

        if existing_like:
            await db.delete(existing_like)
            status = "unliked"
        else:
            db_like = models.Like(post_id=post_id, user_id=user_id)
            db.add(db_like)
            status = "liked"
        
        await db.flush()
        return status

community_service = CommunityService()