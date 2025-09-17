# file: backend/app/services/attendance_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone

from .. import models
from .credit_service import credit_service

# 출석 보상 크레딧 정책을 중앙에서 관리하기 위한 설정 객체
# 향후 DB나 설정 파일로 분리할 수 있습니다.
ATTENDANCE_REWARDS = {
    models.PlanType.BASIC: {"daily": 20, "bonus_5_day": 30, "bonus_7_day": 50},
    models.PlanType.TRADER: {"daily": 500, "bonus_5_day": 700, "bonus_7_day": 1000},
    models.PlanType.PRO: {"daily": 2000, "bonus_5_day": 2500, "bonus_7_day": 3000},
}

def _get_next_monday_midnight() -> datetime:
    """다음 주 월요일 00:00 KST의 UTC 시간을 계산합니다."""
    KST = timezone(timedelta(hours=9))
    now_kst = datetime.now(KST)
    
    # 오늘이 월요일이면 다음 주 월요일, 아니면 이번 주 월요일
    days_since_monday = now_kst.weekday()
    # 다음 월요일까지 남은 날짜 계산
    days_until_next_monday = (7 - days_since_monday)
    if days_until_next_monday == 0: # 오늘이 월요일인 경우 다음주로
        days_until_next_monday = 7

    next_monday_date = (now_kst + timedelta(days=days_until_next_monday)).date()
    
    # 월요일 00:00 KST를 datetime 객체로 만들고 UTC로 변환
    next_monday_midnight_kst = datetime.combine(next_monday_date, datetime.min.time(), tzinfo=KST)
    return next_monday_midnight_kst.astimezone(timezone.utc)


class AttendanceService:
    """
    사용자의 출석 체크 및 연속 출석 보상 지급을 처리하는 서비스.
    """
    async def record_login(self, db: AsyncSession, user: models.User):
        """
        사용자 로그인 시 호출되어 일일 출석을 기록하고,
        조건에 따라 일일/연속 보너스 크레딧을 지급합니다.
        """
        now_utc = datetime.now(timezone.utc)
        today_date = now_utc.date()

        # 1. 오늘 이미 출석했는지 확인하여 중복 지급 방지
        query_today = select(models.CreditsAttendanceLog).filter_by(user_id=user.id, attendance_date=today_date)
        result_today = await db.execute(query_today)
        if result_today.scalar_one_or_none():
            return # 이미 출석했으므로 함수 종료

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
        await db.flush() # 로그 ID를 얻기 위함

        # 4. 크레딧 지급 처리
        user_plan_type = user.subscription.plan.name if user.subscription else models.PlanType.BASIC
        rewards = ATTENDANCE_REWARDS.get(user_plan_type, ATTENDANCE_REWARDS[models.PlanType.BASIC])
        
        expiry_date = _get_next_monday_midnight()

        # 4-1. 일일 출석 크레딧 지급
        await credit_service.grant_credits(
            db=db,
            user_id=user.id,
            amount=rewards["daily"],
            source_type="ATTENDANCE_DAILY",
            source_id=new_log.id,
            expires_at=expiry_date
        )

        # 4-2. 연속 출석 보너스 지급
        bonus_amount = 0
        if consecutive_days % 7 == 0: # 7일 연속 출석 (가장 높은 보상)
            bonus_amount = rewards["bonus_7_day"]
        elif consecutive_days % 5 == 0: # 5일 연속 출석
            bonus_amount = rewards["bonus_5_day"]
        
        if bonus_amount > 0:
            await credit_service.grant_credits(
                db=db,
                user_id=user.id,
                amount=bonus_amount,
                source_type="ATTENDANCE_BONUS",
                source_id=new_log.id,
                expires_at=expiry_date
            )

attendance_service = AttendanceService()