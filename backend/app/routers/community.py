# file: backend/app/routers/community.py

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import logging
from typing import List, Optional

from .. import schemas, models, security
from ..database import get_db
from ..services.community_service import community_service # 👈 커뮤니티 서비스 임포트

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["Community"])

# --- 게시물 (Posts) 엔드포인트 ---

@router.post("/posts", response_model=schemas.CommunityPostResponse, status_code=status.HTTP_201_CREATED, summary="Create a new community post")
async def create_post(
    post_create: schemas.CommunityPostCreate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    새로운 커뮤니티 게시물을 생성합니다. 백테스트 결과를 공유할 수 있습니다.
    """
    try:
        new_post = community_service.create_post(db, current_user, post_create)
        db.commit() # 서비스에서 flush 후 여기서 커밋
        db.refresh(new_post)
        logger.info(f"User {current_user.email} (ID: {current_user.id}) created community post ID: {new_post.id}.")
        return new_post
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to create post for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while creating post for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="게시물 생성 중 서버 오류가 발생했습니다."
        )


@router.get("/posts", response_model=List[schemas.CommunityPostResponse], summary="Get list of community posts")
async def get_posts(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    search_query: Optional[str] = Query(None, description="Search by post title or content"),
    sort_by: Optional[str] = Query(None, description="Sort order (e.g., 'created_at_desc', 'likes_count_desc')"),
    author_id: Optional[int] = Query(None, description="Filter by author ID"),
    # is_public 필터는 GET /community/posts 자체가 is_public=True를 기본으로 가정하고,
    # 비공개 조회는 별도 엔드포인트나 관리자 권한을 통해 처리될 수 있습니다.
    # 관리자를 위한 include_private 플래그 추가 (Depends(security.get_current_admin_user)와 조합)
    current_user: Optional[models.User] = Depends(security.get_current_user) # 비인증 사용자도 접근 가능
):
    """
    커뮤니티 게시물 목록을 조회합니다. 검색, 필터링, 정렬, 페이지네이션을 지원합니다.
    """
    # include_private 플래그는 current_user가 admin이거나 본인 게시물을 볼 때만 의미 있음
    is_admin = current_user and current_user.role == "admin"
    include_private_posts = is_admin # 관리자는 모든 is_public 상태의 게시물 조회 가능

    posts = community_service.get_posts(
        db,
        skip=skip,
        limit=limit,
        search_query=search_query,
        sort_by=sort_by,
        author_id=author_id,
        current_user=current_user,
        include_private=include_private_posts
    )
    logger.info(f"Fetched {len(posts)} community posts for public/user {current_user.email if current_user else 'anonymous'}.")
    return posts


@router.get("/posts/{post_id}", response_model=schemas.CommunityPostResponse, summary="Get details of a specific community post")
async def get_post_by_id(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(security.get_current_user) # 비인증 사용자도 접근 가능
):
    """
    특정 ID의 커뮤니티 게시물 상세 정보를 조회합니다.
    """
    post = community_service.get_post_by_id(db, post_id)
    if not post:
        logger.warning(f"Community post ID {post_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="게시물을 찾을 수 없습니다.")
    
    # 비공개 게시물인 경우, 소유자 또는 관리자만 접근 허용
    if not post.is_public:
        if not current_user or (post.author_id != current_user.id and current_user.role != "admin"):
            logger.warning(f"User {current_user.email if current_user else 'anonymous'} attempted to access private post {post_id} without permission.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 게시물을 조회할 권한이 없습니다.")
    
    logger.info(f"User {current_user.email if current_user else 'anonymous'} accessed community post: {post.id}.")
    return post


@router.put("/posts/{post_id}", response_model=schemas.CommunityPostResponse, summary="Update a specific community post")
async def update_post(
    post_id: int,
    post_update: schemas.CommunityPostUpdate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 게시물을 업데이트합니다. 게시물 소유자 또는 관리자만 가능합니다.
    """
    try:
        updated_post = community_service.update_post(db, post_id, current_user, post_update)
        db.commit() # 서비스에서 커밋 후 여기서 커밋
        db.refresh(updated_post)
        logger.info(f"Community post {updated_post.id} updated by user {current_user.email}.")
        return updated_post
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to update post {post_id} for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while updating post {post_id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="게시물 업데이트 중 서버 오류가 발생했습니다."
        )


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific community post")
async def delete_post(
    post_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 게시물을 삭제합니다. 게시물 소유자 또는 관리자만 가능합니다.
    """
    try:
        success = community_service.delete_post(db, post_id, current_user)
        if not success:
            logger.warning(f"Community post {post_id} not found or user {current_user.email} has no permission to delete.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="게시물을 찾을 수 없거나 삭제할 권한이 없습니다.")
        
        db.commit() # 서비스에서 삭제 후 여기서 커밋
        logger.info(f"Community post {post_id} deleted by user {current_user.email}.")
        return # 204 No Content는 응답 바디를 포함하지 않음
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to delete post {post_id} for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while deleting post {post_id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="게시물 삭제 중 서버 오류가 발생했습니다."
        )


# --- 댓글 (Comments) 엔드포인트 ---

@router.post("/posts/{post_id}/comments", response_model=schemas.CommentResponse, status_code=status.HTTP_201_CREATED, summary="Add a comment to a post")
async def create_comment(
    post_id: int,
    comment_create: schemas.CommentCreate,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 게시물에 새 댓글을 추가합니다.
    """
    try:
        new_comment = community_service.create_comment(db, post_id, current_user, comment_create)
        db.commit()
        db.refresh(new_comment)
        logger.info(f"User {current_user.email} (ID: {current_user.id}) added comment {new_comment.id} to post {post_id}.")
        return new_comment
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to create comment for user {current_user.email} on post {post_id}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while creating comment for user {current_user.email} on post {post_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="댓글 생성 중 서버 오류가 발생했습니다."
        )


@router.get("/posts/{post_id}/comments", response_model=List[schemas.CommentResponse], summary="Get comments for a specific post")
async def get_comments_for_post(
    post_id: int,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """
    특정 게시물의 댓글 목록을 조회합니다. 페이지네이션을 지원합니다.
    """
    comments = community_service.get_comments_for_post(db, post_id, skip, limit)
    logger.info(f"Fetched {len(comments)} comments for post {post_id}.")
    return comments


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a specific comment")
async def delete_comment(
    comment_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 ID의 댓글을 삭제합니다. 댓글 소유자 또는 관리자만 가능합니다.
    """
    try:
        success = community_service.delete_comment(db, comment_id, current_user)
        if not success:
            logger.warning(f"Comment {comment_id} not found or user {current_user.email} has no permission to delete.")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="댓글을 찾을 수 없거나 삭제할 권한이 없습니다.")
        
        db.commit()
        logger.info(f"Comment {comment_id} deleted by user {current_user.email}.")
        return
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to delete comment {comment_id} for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while deleting comment {comment_id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="댓글 삭제 중 서버 오류가 발생했습니다."
        )


# --- 좋아요 (Likes) 엔드포인트 ---

@router.post("/posts/{post_id}/likes", response_model=schemas.LikeResponse, summary="Like or unlike a post")
async def toggle_like(
    post_id: int,
    current_user: models.User = Depends(security.get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    특정 게시물에 '좋아요'를 추가하거나 취소합니다 (토글 기능).
    """
    try:
        result = community_service.toggle_like(db, post_id, current_user)
        db.commit() # 서비스에서 커밋 후 여기서 커밋
        logger.info(f"User {current_user.email} (ID: {current_user.id}) toggled like on post {post_id}. Status: {result.status}")
        return result
    except HTTPException as e:
        db.rollback()
        logger.warning(f"Failed to toggle like on post {post_id} for user {current_user.email}: {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"An unexpected error occurred while toggling like on post {post_id} for user {current_user.email}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="좋아요 처리 중 서버 오류가 발생했습니다."
        )

# GET /community/posts/{post_id}/likes 도 구현 가능하나,
# 좋아요 개수(likes_count)는 CommunityPostResponse에 포함되고,
# 누가 좋아요를 눌렀는지 목록은 자주 필요하지 않아 생략했습니다.
# 필요하다면 추가할 수 있습니다.