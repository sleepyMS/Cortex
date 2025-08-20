# file: backend/app/services/user_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, update
from sqlalchemy.orm import joinedload
from fastapi import HTTPException, status
import logging
from typing import List, Optional
import uuid
import secrets
from datetime import datetime, timezone
import asyncio 

from .. import models, schemas
from ..security import get_password_hash, verify_password

logger = logging.getLogger(__name__)

class UserService:

    async def get_user_by_id(self, db: AsyncSession, user_id: uuid.UUID) -> Optional[models.User]:
        """ID로 사용자를 비동기 조회합니다."""
        result = await db.execute(select(models.User).filter(models.User.id == user_id))
        return result.scalar_one_or_none()

    async def get_user_by_email(self, db: AsyncSession, email: str) -> Optional[models.User]:
        """이메일로 사용자를 비동기 조회합니다."""
        result = await db.execute(select(models.User).filter(models.User.email == email))
        return result.scalar_one_or_none()

    async def create_user(self, db: AsyncSession, user_create: schemas.UserCreate) -> models.User:
        """이메일/패스워드 기반의 신규 사용자를 생성하고 기본 구독을 할당합니다."""
        hashed_password = get_password_hash(user_create.password)
        new_user = models.User(
            email=user_create.email,
            username=user_create.username,
            hashed_password=hashed_password,
            is_email_verified=False
        )
        db.add(new_user)
        await db.flush()

        await self._assign_basic_plan(db, new_user)
        
        created_user = await self.get_user_by_id_with_subscription(db, new_user.id)
        if not created_user:
            raise HTTPException(status_code=500, detail="사용자 생성 후 조회에 실패했습니다.")
        return created_user
        
    async def get_or_create_social_user(
        self, db: AsyncSession, provider: str, social_id: str, email: str, username: Optional[str]
    ) -> models.User:
        """소셜 계정 정보를 바탕으로 사용자를 찾거나 생성하고 SocialAccount와 연결합니다."""
        query = select(models.SocialAccount).options(joinedload(models.SocialAccount.user)).filter_by(provider=provider, provider_user_id=social_id)
        result = await db.execute(query)
        social_account = result.scalar_one_or_none()
        if social_account and social_account.user:
            return social_account.user

        user = await self.get_user_by_email(db, email)
        if user:
            new_social_account = models.SocialAccount(user_id=user.id, provider=provider, provider_user_id=social_id)
            db.add(new_social_account)
            await db.flush()
            return user
        
        final_username = await self._generate_unique_username(db, username, email)
        new_user = models.User(
            email=email, username=final_username, hashed_password=None,
            is_active=True, role="user", is_email_verified=True
        )
        db.add(new_user)
        await db.flush()

        new_social_account = models.SocialAccount(user_id=new_user.id, provider=provider, provider_user_id=social_id)
        db.add(new_social_account)
        await self._assign_basic_plan(db, new_user)
        
        created_user = await self.get_user_by_id_with_subscription(db, new_user.id)
        if not created_user:
             raise HTTPException(status_code=500, detail="소셜 사용자 생성 후 조회에 실패했습니다.")
        return created_user

    async def list_users(
        self, db: AsyncSession, skip: int, limit: int, is_active: Optional[bool],
        is_email_verified: Optional[bool], role: Optional[str], search_query: Optional[str]
    ) -> List[models.User]:
        """조건에 따라 사용자 목록을 비동기 조회합니다 (관리자 전용)."""
        query = select(models.User).options(joinedload(models.User.subscription).joinedload(models.Subscription.plan))
        if is_active is not None: query = query.filter(models.User.is_active == is_active)
        if is_email_verified is not None: query = query.filter(models.User.is_email_verified == is_email_verified)
        if role: query = query.filter(models.User.role == role)
        if search_query:
            search_term = f"%{search_query}%"
            query = query.filter(or_(models.User.email.ilike(search_term), models.User.username.ilike(search_term)))
        
        query = query.order_by(models.User.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def update_user_profile(self, db: AsyncSession, user: models.User, user_update: schemas.UserUpdateProfile) -> models.User:
        """사용자 프로필 정보를 비동기 업데이트합니다."""
        update_data = user_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)
        db.add(user)
        await db.flush(); await db.refresh(user)
        return user

    async def update_user_password(self, db: AsyncSession, user: models.User, password_update: schemas.UserUpdatePassword) -> models.User:
        """사용자의 비밀번호를 비동기 업데이트합니다."""
        if not user.hashed_password or not verify_password(password_update.old_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="기존 비밀번호가 정확하지 않습니다.")
        user.hashed_password = get_password_hash(password_update.new_password)
        db.add(user)
        await db.flush(); await db.refresh(user)
        return user

    async def get_refresh_token_by_jti(self, db: AsyncSession, jti: str) -> Optional[models.RefreshToken]:
        """JTI로 리프레시 토큰을 조회하며, 연관된 사용자 정보도 함께 로드합니다."""
        query = select(models.RefreshToken).options(joinedload(models.RefreshToken.user)).filter(models.RefreshToken.jti == jti)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, db: AsyncSession, plain_token: str):
        """제공된 리프레시 토큰 '하나만'을 찾아 무효화합니다 (로그아웃용)."""
        try:
            # plain_token은 "jti.secret" 형식이므로 jti만 추출합니다.
            jti, _ = plain_token.split('.')
        except ValueError:
            # 형식이 잘못되었으면 조용히 무시하고 아무 작업도 하지 않습니다.
            logger.warning(f"Attempted to revoke a malformed refresh token.")
            return
        
        stmt = update(models.RefreshToken).where(
            models.RefreshToken.jti == jti, 
            models.RefreshToken.is_revoked == False
        ).values(is_revoked=True)
        await db.execute(stmt)
        await db.flush()

    async def revoke_all_refresh_tokens(self, db: AsyncSession, user_id: uuid.UUID):
        """특정 사용자의 모든 유효한 리프레시 토큰을 무효화합니다."""
        stmt = update(models.RefreshToken).where(
            models.RefreshToken.user_id == user_id, 
            models.RefreshToken.is_revoked == False
        ).values(is_revoked=True)
        await db.execute(stmt)
        await db.flush()

    async def get_dashboard_summary(self, db: AsyncSession, user: models.User) -> schemas.UserDashboardSummary:
        """사용자 대시보드에 필요한 모든 정보를 집계하여 반환합니다."""
        sub_query = select(models.Subscription).options(
            joinedload(models.Subscription.plan).joinedload(models.Plan.features)
        ).filter(models.Subscription.user_id == user.id)
        sub_result = await db.execute(sub_query)
        sub = sub_result.scalar_one_or_none()

        if not sub:
             raise HTTPException(status_code=500, detail="구독 정보를 찾을 수 없습니다.")

        features = sub.plan.features

        tasks = [
            db.execute(select(func.count(models.Backtest.id)).filter(models.Backtest.user_id == user.id)),
            db.execute(select(func.count(models.Backtest.id)).filter(models.Backtest.user_id == user.id, models.Backtest.status == 'completed')),
            db.execute(select(func.count(models.LiveBot.id)).filter(models.LiveBot.user_id == user.id)),
            db.execute(select(func.count(models.LiveBot.id)).filter(models.LiveBot.user_id == user.id, models.LiveBot.status.in_(['active', 'paused'])))
        ]
        results = await asyncio.gather(*tasks)
        
        return schemas.UserDashboardSummary(
            email=user.email, username=user.username, user_id=user.id, created_at=user.created_at,
            is_email_verified=user.is_email_verified, current_plan_name=sub.plan.name.value,
            current_plan_price=sub.plan.price, subscription_end_date=sub.current_period_end,
            subscription_is_active=sub.status == "active",
            max_backtests_per_day=features.daily_backtest_count,
            concurrent_bots_limit=features.live_bots_limit,
            allowed_timeframes=features.supported_timeframes.split(','),
            total_backtests_run_by_user=results[0].scalar_one(),
            successful_backtests_by_user=results[1].scalar_one(),
            total_live_bots_by_user=results[2].scalar_one(),
            active_live_bots_by_user=results[3].scalar_one()
        )
        
    async def admin_update_user(self, db: AsyncSession, user_id: uuid.UUID, user_admin_update: schemas.UserAdminUpdate) -> models.User:
        """관리자 권한으로 특정 사용자 정보를 업데이트합니다."""
        user = await self.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
        
        update_data = user_admin_update.model_dump(exclude_unset=True)
        if "new_password" in update_data and update_data["new_password"]:
            user.hashed_password = get_password_hash(update_data["new_password"])
            del update_data["new_password"]

        for key, value in update_data.items():
            setattr(user, key, value)
        
        db.add(user)
        await db.flush(); await db.refresh(user)
        return user
        
    async def delete_user(self, db: AsyncSession, user_id: uuid.UUID) -> bool:
        """사용자를 삭제합니다 (Hard Delete)."""
        user = await self.get_user_by_id(db, user_id)
        if not user: return False
        await db.delete(user)
        await db.flush()
        return True

    async def get_user_by_id_with_subscription(self, db: AsyncSession, user_id: uuid.UUID) -> Optional[models.User]:
        """ID로 사용자를 조회하며, 구독 정보를 Eager Loading합니다."""
        query = select(models.User).options(
            joinedload(models.User.subscription).joinedload(models.Subscription.plan)
        ).filter(models.User.id == user_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    # --- Private Helper Methods ---
    
    async def _assign_basic_plan(self, db: AsyncSession, user: models.User):
        """사용자에게 기본 'Basic' 플랜 구독을 할당합니다."""
        result = await db.execute(select(models.Plan).filter(models.Plan.name == models.PlanType.BASIC))
        basic_plan = result.scalar_one_or_none()
        if not basic_plan:
            logger.error("Default 'Basic Plan' not found in the database.")
            raise HTTPException(status_code=500, detail="서버 오류: 기본 플랜 설정이 누락되었습니다.")
        new_subscription = models.Subscription(
            user_id=user.id, plan_id=basic_plan.id, status="active",
            current_period_end=datetime.max.replace(tzinfo=timezone.utc)
        )
        db.add(new_subscription)

    async def _generate_unique_username(self, db: AsyncSession, username: Optional[str], email: str) -> str:
        """제공된 사용자 이름이 중복될 경우, 고유한 이름을 생성합니다."""
        if not username:
            username = email.split('@')[0]
        result = await db.execute(select(models.User).filter(models.User.username == username))
        if result.scalar_one_or_none() is None:
            return username
        base_username = username[:90] if len(username) > 90 else username
        return f"{base_username}_{secrets.token_hex(4)}"

user_service = UserService()