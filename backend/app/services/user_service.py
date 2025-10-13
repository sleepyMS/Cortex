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
from ..celery_app import celery_app
from ..services.attendance_service import attendance_service
from ..services.credit_service import credit_service


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
    
    async def get_user_by_username(self, db: AsyncSession, username: str) -> Optional[models.User]:
        """사용자 이름으로 사용자를 조회합니다."""
        result = await db.execute(select(models.User).filter(models.User.username == username))
        return result.scalar_one_or_none()

    async def create_user(self, db: AsyncSession, user_create: schemas.UserCreate) -> models.User:
        """
        이메일/패스워드 기반의 신규 사용자를 생성하고, 고유한 사용자 이름을 할당한 뒤,
        기본 구독을 할당합니다.
        """
        
        final_username = await self._generate_unique_username(
            db, user_create.username, user_create.email
        )

        hashed_password = get_password_hash(user_create.password)
        new_user = models.User(
            email=user_create.email,
            username=final_username,
            hashed_password=hashed_password,
            is_email_verified=False
        )
        db.add(new_user)
        
        await db.flush()
        await self._assign_basic_plan(db, new_user)
        
        return new_user
        
    async def get_or_create_social_user(
        self, db: AsyncSession, provider: str, social_id: str, email: str, username: Optional[str]
    ) -> models.User:
        """
        소셜 계정 정보를 바탕으로 사용자를 찾거나 생성하고 SocialAccount와 연결합니다.
        로직을 세 가지 시나리오에 따라 명확하게 분리하여 가독성을 높였습니다.
        """
        # Case 1: 가장 흔한 경우. 기존 소셜 로그인 사용자인지 확인합니다.
        query = select(models.SocialAccount).options(
            joinedload(models.SocialAccount.user).joinedload(models.User.subscription)
        ).filter_by(provider=provider, provider_user_id=social_id)
        
        result = await db.execute(query)
        existing_social_account = result.scalar_one_or_none()
        
        if existing_social_account and existing_social_account.user:
            logger.info(f"Existing social user found: {email} ({provider})")
            return existing_social_account.user

        # Case 2: 소셜 계정은 없지만, 동일 이메일의 기존 사용자인지 확인합니다.
        user = await self.get_user_by_email(db, email)

        if not user:
            # Case 3: 완전히 새로운 사용자입니다. 신규 사용자와 구독을 생성합니다.
            logger.info(f"Creating a new user for social login: {email} ({provider})")
            final_username = await self._generate_unique_username(db, username, email)
            user = models.User(
                email=email,
                username=final_username,
                hashed_password=None, # 소셜 로그인이므로 비밀번호는 없음
                is_active=True,
                role="user",
                is_email_verified=True # 소셜 제공자가 이메일을 보증하므로 바로 인증 처리
            )
            db.add(user)
            await db.flush()  # user.id를 확정하기 위해 flush
            
            # 신규 사용자에게 기본 플랜을 할당합니다.
            await self._assign_basic_plan(db, user)

        # 이제 user 객체는 반드시 존재합니다 (Case 2에서 찾았거나 Case 3에서 생성됨).
        # 이 사용자에게 새로운 소셜 계정 정보를 연결합니다.
        logger.info(f"Linking new social account ({provider}) to user: {email}")
        new_social_account = models.SocialAccount(
            user_id=user.id,
            provider=provider,
            provider_user_id=social_id
        )
        db.add(new_social_account)
        await db.flush()

        # 최종적으로 모든 정보가 포함된 사용자 객체를 다시 조회하여 반환합니다.
        # 이렇게 하면 어떤 경우든 일관된 형태의 객체를 반환할 수 있습니다.
        created_or_found_user = await self.get_user_by_id_with_subscription(db, user.id)
        if not created_or_found_user:
            # 이 에러는 발생해서는 안되지만, 만약을 위한 방어 코드입니다.
            raise HTTPException(status_code=500, detail="소셜 사용자 처리 후 조회에 실패했습니다.")
        
        return created_or_found_user

    async def get_user_profile(self, db: AsyncSession, user: models.User) -> schemas.UserProfileResponse:
        """사용자 모델에서 프로필 관리용 스키마에 맞는 데이터를 반환합니다."""
        # User 모델에 bio, avatar_url, social_links 등의 필드가 추가되어야 합니다.
        # 지금은 없다고 가정하고, 기본값을 반환하도록 구현합니다.
        return schemas.UserProfileResponse(
            username=user.username,
            bio=getattr(user, 'bio', None), # getattr로 안전하게 접근
            avatar_url=getattr(user, 'avatar_url', None),
            social_links=getattr(user, 'social_links', None),
            featured_strategy_id=getattr(user, 'featured_strategy_id', None),
            featured_post_id=getattr(user, 'featured_post_id', None)
        )
    
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

    async def update_user_profile(
        self, db: AsyncSession, user: models.User, user_update: schemas.UserProfileUpdate
    ) -> models.User:
        """사용자 프로필 정보를 비동기 업데이트합니다."""
        # username 중복 검사 (선택적)
        if user_update.username != user.username:
            existing_user = await db.scalar(select(models.User).filter(models.User.username == user_update.username))
            if existing_user:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 사용자 이름입니다.")

        # Pydantic 모델을 딕셔너리로 변환하여 업데이트
        update_data = user_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)
            
        db.add(user)
        
        return user

    async def update_user_password(self, db: AsyncSession, user: models.User, password_update: schemas.UserUpdatePassword) -> models.User:
        """사용자의 비밀번호를 업데이트하고, 다른 모든 활성 세션을 강제 로그아웃시킵니다."""
        if not user.hashed_password or not verify_password(password_update.old_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="기존 비밀번호가 정확하지 않습니다.")
        
        # 1. 새로운 비밀번호 설정
        user.hashed_password = get_password_hash(password_update.new_password)
        db.add(user)
        
        # 2. 현재 사용자의 모든 리프레시 토큰을 무효화하여 다른 세션에서 로그아웃 처리
        #    (현재 세션은 access token이 유효한 동안 유지되며, 만료 후 재로그인 필요)
        await self.revoke_all_refresh_tokens(db, user.id)
        logger.info(f"Revoked all refresh tokens for user {user.email} after password change.")
        
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
        
        # scalar_one()은 결과가 없으면 에러를 발생시키므로, scalar()를 사용하고 기본값을 제공하는 것이 더 안전합니다.
        total_backtests = results[0].scalar() or 0
        successful_backtests = results[1].scalar() or 0
        total_bots = results[2].scalar() or 0
        active_bots = results[3].scalar() or 0
        
        return schemas.UserDashboardSummary(
            email=user.email, username=user.username, user_id=user.id, created_at=user.created_at,
            is_email_verified=user.is_email_verified, current_plan_name=sub.plan.name.value,
            current_plan_price=sub.plan.price, subscription_end_date=sub.current_period_end,
            subscription_is_active=sub.status == "active",
            concurrent_bots_limit=features.live_bots_limit,
            allowed_timeframes=features.supported_timeframes.split(','),
            total_backtests_run_by_user=total_backtests,
            successful_backtests_by_user=successful_backtests,
            total_live_bots_by_user=total_bots,
            active_live_bots_by_user=active_bots
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
        """
        사용자 계정을 Soft Delete 처리하고,
        연관된 모든 자산(자동매매 봇, 마켓 상품, 소셜 계정)을 안전하게 정리합니다.
        """
        user = await self.get_user_by_id(db, user_id)
        if not user:
            return False

        # 1. 이 사용자가 실행 중인 모든 활성/일시중지 봇을 찾아 'stopped' 상태로 변경합니다.
        stop_bots_stmt = (
            update(models.LiveBot)
            .where(
                models.LiveBot.user_id == user_id,
                models.LiveBot.status.in_(['active', 'paused', 'initializing'])
            )
            .values(
                status='stopped',
                stopped_at=datetime.now(timezone.utc)
            )
        )
        await db.execute(stop_bots_stmt)
        logger.info(f"Stopped all active/paused live bots for user {user.email} before deletion.")

        # --- 2. 마켓플레이스 상품 판매 중단 ---
        unlist_stmt = (
            update(models.MarketplaceProduct)
            .where(
                models.MarketplaceProduct.seller_id == user_id,
                models.MarketplaceProduct.is_active == True,
            )
            .values(is_active=False)
        )
        await db.execute(unlist_stmt)
        logger.info(f"Deactivated all active marketplace products for user {user.email} before deletion.")

        # --- 3. 소셜 계정 연결 해제 ---
        social_accounts_query = select(models.SocialAccount).filter(
            models.SocialAccount.user_id == user_id
        )
        result = await db.execute(social_accounts_query)
        social_accounts_to_delete = result.scalars().all()

        for account in social_accounts_to_delete:
            await db.delete(account)
        
        if social_accounts_to_delete:
            logger.info(f"Deleted {len(social_accounts_to_delete)} social accounts for user {user.email} before soft deletion.")

        # --- 4. 개인 식별 정보 익명화 ---
        unique_id_str = str(user.id)
        user.username = f"deleted_user_{unique_id_str.split('-')[0]}"
        user.email = f"deleted_user_{unique_id_str}@cortex.com"
        user.hashed_password = None
        user.bio = None
        user.social_links = None
        
        # --- 5. 계정 비활성화 ---
        user.is_active = False
        user.is_email_verified = False

        # --- 6. 모든 세션 강제 로그아웃 ---
        await self.revoke_all_refresh_tokens(db, user.id)
        
        db.add(user)
        await db.flush()
        return True
    
    async def get_user_profile_with_checkin(self, db: AsyncSession, user: models.User) -> models.User:
        """
        사용자 프로필을 조회하며, 일일 출석 체크와 크레딧 잔액 조회를 함께 처리합니다.
        트랜잭션 관리는 상위 의존성(get_async_db)에 위임합니다.
        """
        # 불필요한 트랜잭션 블록을 제거하고 비즈니스 로직만 호출합니다.
        # attendance_service.record_login 내의 DB 작업은 get_async_db가 시작한
        # 전체 트랜잭션에 안전하게 포함됩니다.
        await attendance_service.record_login(db, user)
        
        # 이 함수 내의 모든 DB 작업은 하나의 트랜잭션으로 묶이므로,
        # 별도의 커밋 없이도 최신 상태를 일관성 있게 조회할 수 있습니다.
        credit_summary = await credit_service.get_balance_summary(db, user.id)
        
        user.credit_balance = credit_summary
        
        return user

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
            # 기본 플랜은 만료되지 않으므로, 만료일을 최댓값으로 설정하여 '무제한'을 표현합니다.
            current_period_end=datetime.max.replace(tzinfo=timezone.utc)
        )
        db.add(new_subscription)
        
        user.subscription = new_subscription
        new_subscription.plan = basic_plan


    async def _generate_unique_username(self, db: AsyncSession, username: Optional[str], email: str) -> str:
        """제공된 사용자 이름이 중복될 경우, 고유한 이름을 생성합니다."""
        if not username:
            username = email.split('@')[0]
        result = await db.execute(select(models.User).filter(models.User.username == username))
        if result.scalar_one_or_none() is None:
            return username
        base_username = username[:90] if len(username) > 90 else username
        return f"{base_username}_{secrets.token_hex(4)}"
    
    async def get_user_inventory(self, db: AsyncSession, user_id: uuid.UUID) -> List[schemas.UserInventoryItemResponse]:
        """ DB 모델을 조회한 후, API 응답 스키마에 맞게 수동으로 데이터를 조립하여 반환합니다."""
        query = (
            select(models.UserInventory)
            .options(
                joinedload(models.UserInventory.product)
                    .joinedload(models.MarketplaceProduct.shop_item_detail)
            )
            .filter(models.UserInventory.user_id == user_id)
            .order_by(models.UserInventory.created_at.desc())
        )
        result = await db.execute(query)
        inventory_models = result.scalars().unique().all()

        response_items = []
        for item in inventory_models:
            if not item.product: continue

            response_items.append(schemas.UserInventoryItemResponse(
                product_id=item.product_id,
                name=item.product.name,
                description=item.product.description,
                display_properties=item.product.shop_item_detail.display_properties if item.product.shop_item_detail else {},
                quantity=item.quantity,
                purchased_at=item.created_at # 최초 생성일을 기준으로 함
            ))
        return response_items

    async def get_purchased_strategies(self, db: AsyncSession, user_id: uuid.UUID) -> List[schemas.UserPurchasedStrategyResponse]:
        """ DB 모델을 조회한 후, API 응답 스키마에 맞게 수동으로 데이터를 조립하여 반환합니다."""
        query = (
            select(models.UserPurchasedStrategy)
            .options(
                # Strategy와 그 author 정보까지 한번에 로드
                joinedload(models.UserPurchasedStrategy.strategy)
                    .joinedload(models.Strategy.author),
                # 구매 시점의 가격 정보를 위해 OrderItem -> Product 관계 로드
                joinedload(models.UserPurchasedStrategy.order_item)
                    .joinedload(models.MarketplaceOrderItem.product)
            )
            .filter(models.UserPurchasedStrategy.user_id == user_id)
            .order_by(models.UserPurchasedStrategy.created_at.desc())
        )
        result = await db.execute(query)
        purchased_models = result.scalars().unique().all()

        response_items = []
        for purchase in purchased_models:
            if not purchase.strategy or not purchase.strategy.author or not purchase.order_item: continue

            response_items.append(schemas.UserPurchasedStrategyResponse(
                purchase_id=purchase.id,
                strategy_id=purchase.strategy_id,
                name=purchase.strategy.name,
                author_username=purchase.strategy.author.username,
                price_paid=purchase.order_item.price_at_purchase,
                purchased_at=purchase.created_at
            ))
        return response_items
    
user_service = UserService()