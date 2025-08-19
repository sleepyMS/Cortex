# file: backend/app/routers/community.py

from fastapi import APIRouter, HTTPException, Depends, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
import logging
from typing import List, Optional
import uuid

from .. import schemas, models
# ▼▼▼ [수정] 비동기 의존성 및 서비스 임포트 정리 ▼▼▼
from ..dependencies import (
    get_async_db, get_current_active_user, get_current_user, 
    get_viewable_post, get_post_for_modification, 
    get_comment_for_modification, get_existing_post
)
from ..services.community_service import community_service
from ..limiter import limiter
# ▲▲▲ [수정] ▲▲▲

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["Community"])

# --- 게시물(Posts) 관련 엔드포인트 ---

@router.post("/posts", response_model=schemas.CommunityPostResponse, status_code=status.HTTP_201_CREATED, summary="Create a new community post")
@limiter.limit("10/hour")
async def create_post(
    post_create: schemas.CommunityPostCreate,
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """자신의 백테스팅 결과를 커뮤니티에 공유(게시)합니다."""
    try:
        new_post = await community_service.create_post(db, current_user, post_create)
        await db.commit()
        # Eager Loading을 위해 ID로 다시 조회
        created_post = await community_service.get_post_by_id(db, new_post.id)
        logger.info(f"User {current_user.email} created community post ID: {created_post.id}.")
        return created_post
    except HTTPException as e:
        await db.rollback()
        raise e
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating post by user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="게시물 생성 중 서버 오류가 발생했습니다.")

@router.get("/posts", response_model=List[schemas.CommunityPostResponse], summary="Get list of community posts")
async def get_posts(
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort_by: Optional[str] = Query(None),
    author_id: Optional[uuid.UUID] = Query(None),
    current_user: Optional[models.User] = Depends(get_current_user) # 비로그인 사용자도 조회 가능
):
    """커뮤니티 피드의 게시물 목록을 비동기로 조회합니다."""
    posts = await community_service.get_posts(db, skip, limit, sort_by, author_id, current_user)
    return posts

@router.get("/posts/{post_id}", response_model=schemas.CommunityPostResponse, summary="Get a specific community post")
async def get_post(
    post: models.CommunityPost = Depends(get_viewable_post)
):
    """특정 게시물의 상세 정보를 조회합니다. (조회 권한 자동 검증)"""
    return post

@router.put("/posts/{post_id}", response_model=schemas.CommunityPostResponse, summary="Update a community post")
async def update_post(
    post_update: schemas.CommunityPostUpdate,
    post_to_update: models.CommunityPost = Depends(get_post_for_modification),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 게시물을 업데이트합니다. (소유주 또는 관리자)"""
    try:
        updated_post = await community_service.update_post(db, post_to_update, post_update)
        await db.commit()
        await db.refresh(updated_post)
        return updated_post
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating post {post_to_update.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="게시물 업데이트 중 오류가 발생했습니다.")

@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a community post")
async def delete_post(
    post_to_delete: models.CommunityPost = Depends(get_post_for_modification),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 게시물을 삭제합니다. (소유주 또는 관리자)"""
    await community_service.delete_post(db, post_to_delete)
    await db.commit()
    return

# --- 댓글(Comments) 관련 엔드포인트 ---

@router.post("/posts/{post_id}/comments", response_model=schemas.CommentResponse, status_code=status.HTTP_201_CREATED, summary="Create a comment on a post")
@limiter.limit("30/minute")
async def create_comment(
    comment_create: schemas.CommentCreate,
    request: Request,
    post: models.CommunityPost = Depends(get_existing_post),
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """특정 게시물에 댓글을 작성합니다."""
    new_comment = await community_service.create_comment(db, current_user, post.id, comment_create)
    await db.commit()
    await db.refresh(new_comment)
    return new_comment

@router.get("/posts/{post_id}/comments", response_model=List[schemas.CommentResponse], summary="Get comments for a post")
async def get_comments(
    post_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    """특정 게시물의 댓글 목록을 조회합니다."""
    comments = await community_service.get_comments_by_post_id(db, post_id, skip, limit)
    return comments

@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a comment")
async def delete_comment(
    comment_to_delete: models.Comment = Depends(get_comment_for_modification),
    db: AsyncSession = Depends(get_async_db)
):
    """댓글을 삭제합니다. (소유주 또는 관리자)"""
    await community_service.delete_comment(db, comment_to_delete)
    await db.commit()
    return

# --- 좋아요(Likes) 관련 엔드포인트 ---

@router.post("/posts/{post_id}/likes", response_model=schemas.LikeResponse, summary="Toggle like on a post")
@limiter.limit("60/minute")
async def toggle_like(
    post_id: uuid.UUID,
    request: Request,
    current_user: models.User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """게시물에 '좋아요'를 추가하거나 취소합니다."""
    like_status = await community_service.toggle_like(db, post_id, current_user.id)
    await db.commit()
    return schemas.LikeResponse(user_id=current_user.id, post_id=post_id, status=like_status)