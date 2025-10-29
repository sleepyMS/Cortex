# file: backend/app/services/attendance_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import logging # 로깅 추가

from .. import models
from .credit_service import credit_service
from .plan_service import plan_service # Basic 플랜 조회 위해 추가

logger = logging.getLogger(__name__) # 로거 설정

def _get_next_monday_midnight() -> datetime:
    """다음 주 월요일 00:00 KST의 UTC 시간을 계산합니다."""
    KST = timezone(timedelta(hours=9))
    now_kst = datetime.now(KST)

    days_since_monday = now_kst.weekday()
    days_until_next_monday = (7 - days_since_monday)
    if days_until_next_monday == 0:
        days_until_next_monday = 7

    next_monday_date = (now_kst + timedelta(days=days_until_next_monday)).date()

    next_monday_midnight_kst = datetime.combine(next_monday_date, datetime.min.time(), tzinfo=KST)
    return next_monday_midnight_kst.astimezone(timezone.utc)


class AttendanceService:
    """
    사용자의 출석 체크 및 연속 출석 보상 지급을 처리하는 서비스.
    """
    async def record_login(self, db: AsyncSession, user: models.User):
        """
        사용자 로그인 시 호출되어 일일 출석을 기록하고,
        조건에 따라 DB에 정의된 플랜별 일일/연속 보너스 크레딧을 지급합니다.
        """
        now_utc = datetime.now(timezone.utc)
        today_date = now_utc.date()

        # 1. 오늘 이미 출석했는지 확인 
        query_today = select(models.CreditsAttendanceLog).filter_by(user_id=user.id, attendance_date=today_date)
        result_today = await db.execute(query_today)
        if result_today.scalar_one_or_none():
            return

        # 2. 연속 출석일수 계산 
        yesterday_date = today_date - timedelta(days=1)
        query_yesterday = select(models.CreditsAttendanceLog).filter_by(user_id=user.id, attendance_date=yesterday_date)
        result_yesterday = await db.execute(query_yesterday)
        yesterday_log = result_yesterday.scalar_one_or_none()

        consecutive_days = 1
        if yesterday_log:
            consecutive_days = yesterday_log.consecutive_days + 1

        # 3. 오늘 출석 로그 기록 
        new_log = models.CreditsAttendanceLog(
            user_id=user.id,
            attendance_date=today_date,
            consecutive_days=consecutive_days
        )
        db.add(new_log)
        await db.flush()

        # --- 4. DB에서 플랜별 보상 값 가져오기 ---
        plan_features = None
        # get_current_user에서 subscription->plan->features까지 eager loading 했다고 가정
        if user.subscription and user.subscription.plan and user.subscription.plan.features:
            plan_features = user.subscription.plan.features
        else:
            # 혹시 로딩되지 않았거나 구독이 없는 경우 Basic 플랜 조회 (plan_service 활용)
            basic_plan = await plan_service.get_plan_by_name(db, models.PlanType.BASIC)
            if basic_plan and basic_plan.features:
                plan_features = basic_plan.features

        # 만약 plan_features를 여전히 못 찾았다면 심각한 오류
        if not plan_features:
             logger.error(f"Could not determine plan features for user {user.id} during attendance check.")
             # 오류를 발생시키거나 기본값을 사용할 수 있음 (여기서는 오류 발생 가정)
             # 또는 기본값으로 안전하게 처리:
             # plan_features = models.PlanFeature( # 기본값 설정
             #    attendance_daily_reward=20,
             #    attendance_bonus_5_day=30,
             #    attendance_bonus_7_day=50
             # )
             # 우선은 로깅만 하고 넘어감 (크레딧 지급 안됨)
             return

        expiry_date = _get_next_monday_midnight()

        # --- 4-1. 일일 출석 크레딧 지급 (DB 값 사용) ---
        await credit_service.grant_credits(
            db=db,
            user_id=user.id,
            amount=plan_features.attendance_daily_reward, # DB 값 사용
            source_type="ATTENDANCE_DAILY",
            source_id=str(new_log.id),
            expires_at=expiry_date
        )

        # --- 4-2. 연속 출석 보너스 지급 (DB 값 사용) ---
        bonus_amount = 0
        if consecutive_days % 7 == 0:
            bonus_amount = plan_features.attendance_bonus_7_day # DB 값 사용
        elif consecutive_days % 5 == 0:
            bonus_amount = plan_features.attendance_bonus_5_day # DB 값 사용

        if bonus_amount > 0:
            await credit_service.grant_credits(
                db=db,
                user_id=user.id,
                amount=bonus_amount,
                source_type="ATTENDANCE_BONUS",
                source_id=str(new_log.id),
                expires_at=expiry_date
            )

attendance_service = AttendanceService()