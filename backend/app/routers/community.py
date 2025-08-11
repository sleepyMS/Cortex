# file: backend/app/routers/community.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import logging
from typing import List, Optional
import uuid

from .. import schemas, models, security
from ..dependencies import get_post_for_modification, get_verified_comment, get_viewable_post
from ..database import get_db
from ..services.community_service import community_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["Community"])

# --- 게시물 (Posts) 엔드포인트 ---

@router.post("/posts", response_model=schemas.CommunityPostResponse, status_code=status.HTTP_201_CREATED, summary="Create a new community post")
async def create_post(
    post_create: schemas.CommunityPostCreate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """새로운 커뮤니티 게시물을 생성합니다."""
    try:
        new_post = community_service.create_post(db, current_user, post_create)
        db.commit()
        db.refresh(new_post)
        logger.info(f"User {current_user.email} created community post ID: {new_post.id}.")
        return new_post
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating post for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="게시물 생성 중 서버 오류 발생")

@router.get("/posts", response_model=List[schemas.CommunityPostResponse], summary="Get list of community posts")
async def get_posts(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search_query: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    author_id: Optional[uuid.UUID] = Query(None), 
    current_user: Optional[models.User] = Depends(security.get_current_user)
):
    """커뮤니티 게시물 목록을 조회합니다."""
    posts = community_service.get_posts(db, skip=skip, limit=limit, search_query=search_query, sort_by=sort_by, author_id=author_id, current_user=current_user)
    return posts

# 복잡한 조회 권한 검사를 의존성 주입으로 대체
@router.get("/posts/{post_id}", response_model=schemas.CommunityPostResponse, summary="Get details of a specific community post")
async def get_post_by_id(
    # 'get_viewable_post'가 (공개 OR 소유주 OR 관리자) 검증을 모두 처리합니다.
    post: models.CommunityPost = Depends(get_viewable_post)
):
    """특정 ID의 커뮤니티 게시물 상세 정보를 조회합니다. (조회 권한 자동 검증)"""
    logger.info(f"Community post {post.id} accessed.")
    return post

# 소유권 검증 로직을 의존성 주입으로 대체
@router.put("/posts/{post_id}", response_model=schemas.CommunityPostResponse, summary="Update a specific community post")
async def update_post(
    post_update: schemas.CommunityPostUpdate,
    # 'get_post_for_modification'가 '소유주'만 허용하는 엄격한 검증을 처리합니다.
    post_to_update: models.CommunityPost = Depends(get_post_for_modification),
    db: Session = Depends(get_db)
):
    """특정 ID의 게시물을 업데이트합니다. (소유권 자동 검증)"""
    try:
        updated_post = community_service.update_post(db, post_to_update, post_update)
        db.commit()
        db.refresh(updated_post)
        logger.info(f"Community post {updated_post.id} updated by user {updated_post.author_id}.")
        return updated_post
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating post {post_to_update.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="게시물 업데이트 중 서버 오류 발생")

# 소유권 검증 로직을 의존성 주입으로 대체
@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific community post")
async def delete_post(
    # 'get_post_for_modification'가 '소유주'만 허용하는 엄격한 검증을 처리합니다.
    post_to_delete: models.CommunityPost = Depends(get_post_for_modification),
    db: Session = Depends(get_db)
):
    """특정 ID의 게시물을 삭제합니다. (소유권 자동 검증)"""
    try:
        community_service.delete_post(db, post_to_delete)
        db.commit()
        logger.info(f"Community post {post_to_delete.id} deleted by user {post_to_delete.author_id}.")
        return
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting post {post_to_delete.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="게시물 삭제 중 서버 오류 발생")

# --- 댓글 (Comments) 엔드포인트 ---

@router.post("/posts/{post_id}/comments", response_model=schemas.CommentResponse, status_code=status.HTTP_201_CREATED, summary="Add a comment to a post")
async def create_comment(
    post_id: uuid.UUID,
    comment_create: schemas.CommentCreate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """특정 게시물에 새 댓글을 추가합니다."""
    try:
        new_comment = community_service.create_comment(db, post_id, current_user, comment_create)
        db.commit()
        db.refresh(new_comment)
        logger.info(f"User {current_user.email} added comment {new_comment.id} to post {post_id}.")
        return new_comment
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating comment for user {current_user.email} on post {post_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="댓글 생성 중 서버 오류 발생")

@router.get("/posts/{post_id}/comments", response_model=List[schemas.CommentResponse], summary="Get comments for a specific post")
async def get_comments_for_post(
    post_id: uuid.UUID,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """특정 게시물의 댓글 목록을 조회합니다."""
    comments = community_service.get_comments_for_post(db, post_id, skip, limit)
    return comments

# 소유권 검증 로직을 의존성 주입으로 대체
@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific comment")
async def delete_comment(
    # 'get_verified_comment'가 '소유주'만 허용하는 엄격한 검증을 처리합니다.
    comment_to_delete: models.Comment = Depends(get_verified_comment),
    db: Session = Depends(get_db)
):
    """특정 ID의 댓글을 삭제합니다. (소유권 자동 검증)"""
    try:
        community_service.delete_comment(db, comment_to_delete)
        db.commit()
        logger.info(f"Comment {comment_to_delete.id} deleted by user {comment_to_delete.author_id}.")
        return
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting comment {comment_to_delete.id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="댓글 삭제 중 서버 오류 발생")

# --- 좋아요 (Likes) 엔드포인트 ---

@router.post("/posts/{post_id}/likes", response_model=schemas.LikeResponse, summary="Like or unlike a post")
async def toggle_like(
    post_id: uuid.UUID,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """특정 게시물에 '좋아요'를 추가하거나 취소합니다."""
    try:
        result = community_service.toggle_like(db, post_id, current_user)
        db.commit()
        logger.info(f"User {current_user.email} toggled like on post {post_id}. Status: {result.status}")
        return result
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error toggling like on post {post_id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="좋아요 처리 중 서버 오류 발생")