# file: backend/app/services/community_service.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError # 고유 제약 조건 위반 시
from fastapi import HTTPException, status
import logging
from typing import List, Dict, Any, Optional

from .. import models, schemas

logger = logging.getLogger(__name__)

class CommunityService:
    """
    커뮤니티 게시물, 댓글, 좋아요의 CRUD 및 관련 비즈니스 로직을 담당하는 서비스.
    """

    # --- 게시물 (Posts) 관련 서비스 함수 ---

    def create_post(self, db: Session, user: models.User, post_create: schemas.CommunityPostCreate) -> models.CommunityPost:
        """
        새로운 커뮤니티 게시물을 생성합니다.
        백테스트 결과 공유 시 백테스트 ID의 유효성 및 소유권을 검증합니다.
        """
        if post_create.backtest_id:
            # 1. 백테스트 존재 여부 확인
            backtest = db.query(models.Backtest).filter(models.Backtest.id == post_create.backtest_id).first()
            if not backtest:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="공유하려는 백테스트 결과를 찾을 수 없습니다.")
            
            # 2. 백테스트 소유권 확인
            if backtest.user_id != user.id:
                logger.warning(f"User {user.email} (ID: {user.id}) attempted to share backtest {post_create.backtest_id} not owned by them.")
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 백테스트를 공유할 권한이 없습니다.")
            
            # 3. 이미 공유된 백테스트인지 확인 (CommunityPost의 backtest_id는 unique)
            existing_post_for_backtest = db.query(models.CommunityPost).filter(
                models.CommunityPost.backtest_id == post_create.backtest_id
            ).first()
            if existing_post_for_backtest:
                logger.warning(f"Backtest ID {post_create.backtest_id} already shared by user {user.email}.")
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이 백테스트 결과는 이미 공유되었습니다.")

        db_post = models.CommunityPost(
            author_id=user.id,
            backtest_id=post_create.backtest_id,
            title=post_create.title,
            content=post_create.content,
            is_public=post_create.is_public
        )
        db.add(db_post)
        db.flush() # ID를 얻기 위해
        db.refresh(db_post)
        logger.info(f"User {user.email} (ID: {user.id}) created new post: '{db_post.title}' (ID: {db_post.id}).")
        return db_post

    def get_posts(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        search_query: Optional[str] = None,
        sort_by: Optional[str] = None, # 'created_at_desc', 'likes_count_desc'
        author_id: Optional[int] = None,
        current_user: Optional[models.User] = None, # 비인증 사용자도 조회 가능해야 하므로 Optional
        include_private: bool = False # 관리자용 또는 본인 비공개 조회용
    ) -> List[models.CommunityPost]:
        """
        게시물 목록을 조회합니다. 필터링, 검색, 정렬 및 페이지네이션을 지원합니다.
        비공개 게시물은 특정 조건에서만 조회 가능합니다.
        """
        query = db.query(models.CommunityPost)

        # 기본적으로 공개 게시물만 조회. 관리자이거나 본인 게시물만 조회 시 조건 변경
        if not include_private: # 비공개 게시물을 포함하지 않는 경우
            query = query.filter(models.CommunityPost.is_public == True)
        elif current_user and not current_user.role == "admin": # 관리자가 아니면서 include_private True 요청 시 본인 것만
            query = query.filter(
                (models.CommunityPost.is_public == True) |
                (models.CommunityPost.author_id == current_user.id)
            )
        # 관리자는 include_private=True이면 모든 is_public 상태의 게시물 조회 가능

        if author_id:
            query = query.filter(models.CommunityPost.author_id == author_id)
        if search_query:
            query = query.filter(
                (models.CommunityPost.title.ilike(f"%{search_query}%")) |
                (models.CommunityPost.content.ilike(f"%{search_query}%"))
            )

        # 관계 로드 (N+1 쿼리 방지)
        query = query.options(
            joinedload(models.CommunityPost.author),
            joinedload(models.CommunityPost.backtest) # 백테스트 결과도 함께 로드
        )

        # 정렬 로직
        if sort_by == "created_at_asc":
            query = query.order_by(models.CommunityPost.created_at.asc())
        elif sort_by == "likes_count_desc":
            # Likes Count는 동적으로 계산하거나, CommunityPost 모델에 캐시 필드를 추가해야 함.
            # 여기서는 예시로만 표시하며, 실제 구현 시에는 성능 최적화 필요
            logger.warning("Sorting by likes_count_desc may be inefficient without pre-calculated field.")
            query = query.order_by(models.CommunityPost.likes.count().desc()) # ORM Count 사용
        elif sort_by == "comments_count_desc":
            logger.warning("Sorting by comments_count_desc may be inefficient without pre-calculated field.")
            query = query.order_by(models.CommunityPost.comments.count().desc()) # ORM Count 사용
        else: # created_at_desc 기본 정렬
            query = query.order_by(models.CommunityPost.created_at.desc())

        posts = query.offset(skip).limit(limit).all()
        logger.info(f"Fetched {len(posts)} community posts.")
        return posts

    def get_post_by_id(self, db: Session, post_id: int) -> models.CommunityPost | None:
        """
        ID로 단일 게시물을 조회합니다.
        작성자, 백테스트 결과, 댓글 등을 함께 로드합니다.
        """
        post = db.query(models.CommunityPost).options(
            joinedload(models.CommunityPost.author),
            joinedload(models.CommunityPost.backtest)
            # joinedload(models.CommunityPost.comments), # 댓글 목록은 별도 엔드포인트에서 페이지네이션
            # joinedload(models.CommunityPost.likes) # 좋아요 목록도 별도 엔드포인트에서
        ).filter(models.CommunityPost.id == post_id).first()
        return post

    def update_post(self, db: Session, post_id: int, user: models.User, post_update: schemas.CommunityPostUpdate) -> models.CommunityPost:
        """
        게시물을 업데이트합니다. (소유권 또는 관리자 권한 검증 포함)
        """
        db_post = self.get_post_by_id(db, post_id)
        if not db_post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="게시물을 찾을 수 없습니다.")
        
        # 소유자 또는 관리자만 수정 가능
        if db_post.author_id != user.id and user.role != "admin":
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to update post {post_id} not owned by them and is not admin.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 게시물을 수정할 권한이 없습니다.")

        update_data = post_update.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            setattr(db_post, key, value)
        
        db.add(db_post)
        db.commit() # 변경사항 커밋
        db.refresh(db_post)
        logger.info(f"User {user.email} (ID: {user.id}) updated post: '{db_post.title}' (ID: {db_post.id}).")
        return db_post

    def delete_post(self, db: Session, post_id: int, user: models.User) -> bool:
        """
        게시물을 삭제합니다. (소유권 또는 관리자 권한 검증 포함)
        """
        db_post = self.get_post_by_id(db, post_id)
        if not db_post:
            return False # 삭제할 게시물 없음
        
        # 소유자 또는 관리자만 삭제 가능
        if db_post.author_id != user.id and user.role != "admin":
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to delete post {post_id} not owned by them and is not admin.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 게시물을 삭제할 권한이 없습니다.")

        db.delete(db_post)
        db.commit()
        logger.info(f"User {user.email} (ID: {user.id}) deleted post ID: {db_post.id}.")
        return True

    # --- 댓글 (Comments) 관련 서비스 함수 ---

    def create_comment(self, db: Session, post_id: int, user: models.User, comment_create: schemas.CommentCreate) -> models.Comment:
        """
        게시물에 새 댓글을 추가합니다.
        """
        db_post = self.get_post_by_id(db, post_id)
        if not db_post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="댓글을 작성할 게시물을 찾을 수 없습니다.")

        db_comment = models.Comment(
            post_id=post_id,
            author_id=user.id,
            content=comment_create.content
        )
        db.add(db_comment)
        db.flush()
        db.refresh(db_comment)
        logger.info(f"User {user.email} (ID: {user.id}) commented on post {post_id}.")
        return db_comment

    def get_comments_for_post(self, db: Session, post_id: int, skip: int = 0, limit: int = 100) -> List[models.Comment]:
        """
        특정 게시물의 댓글 목록을 조회합니다.
        """
        comments = db.query(models.Comment).filter(models.Comment.post_id == post_id).options(
            joinedload(models.Comment.author) # 작성자 정보도 함께 로드
        ).order_by(models.Comment.created_at.asc()).offset(skip).limit(limit).all()
        logger.info(f"Fetched {len(comments)} comments for post {post_id}.")
        return comments

    def delete_comment(self, db: Session, comment_id: int, user: models.User) -> bool:
        """
        댓글을 삭제합니다. (소유권 또는 관리자 권한 검증 포함)
        """
        db_comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
        if not db_comment:
            return False # 삭제할 댓글 없음
        
        # 소유자 또는 관리자만 삭제 가능
        if db_comment.author_id != user.id and user.role != "admin":
            logger.warning(f"User {user.email} (ID: {user.id}) attempted to delete comment {comment_id} not owned by them and is not admin.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="이 댓글을 삭제할 권한이 없습니다.")

        db.delete(db_comment)
        db.commit()
        logger.info(f"User {user.email} (ID: {user.id}) deleted comment ID: {db_comment.id}.")
        return True

    # --- 좋아요 (Likes) 관련 서비스 함수 ---

    def toggle_like(self, db: Session, post_id: int, user: models.User) -> schemas.LikeResponse:
        """
        게시물에 '좋아요'를 추가하거나 취소합니다. (토글 기능)
        """
        db_post = self.get_post_by_id(db, post_id)
        if not db_post:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="좋아요를 누를 게시물을 찾을 수 없습니다.")

        existing_like = db.query(models.Like).filter_by(post_id=post_id, user_id=user.id).first()

        if existing_like:
            # 이미 좋아요를 누른 상태이므로, 좋아요 취소
            db.delete(existing_like)
            db.commit()
            logger.info(f"User {user.email} (ID: {user.id}) unliked post {post_id}.")
            return schemas.LikeResponse(user_id=user.id, post_id=post_id, status=False)
        else:
            # 좋아요 추가
            db_like = models.Like(post_id=post_id, user_id=user.id)
            db.add(db_like)
            try:
                db.commit()
                db.refresh(db_like)
                logger.info(f"User {user.email} (ID: {user.id}) liked post {post_id}.")
                return schemas.LikeResponse(user_id=user.id, post_id=post_id, status=True)
            except IntegrityError: # 이미 좋아요를 누른 경우 (경합 조건)
                db.rollback()
                logger.warning(f"User {user.email} (ID: {user.id}) attempted to like post {post_id} multiple times (IntegrityError).")
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 좋아요를 누르셨습니다.")
            except Exception as e:
                db.rollback()
                logger.error(f"Unexpected error when liking post {post_id} by user {user.email}: {e}", exc_info=True)
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="좋아요 처리 중 서버 오류가 발생했습니다.")


# 서비스 인스턴스 생성
community_service = CommunityService()