# file: backend/app/services/cost_calculator.py

import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .. import models, schemas

class CostCalculationService:
    """
    백테스팅, 최적화 등 기능 사용에 필요한 크레딧 비용을 계산하는 중앙 서비스.
    모든 비용 정책은 이 서비스 내에서만 관리됩니다.
    """
    async def calculate_credit_cost(
        self,
        db: AsyncSession,
        user: models.User,
        params: schemas.CostEstimationRequest
    ) -> schemas.CostEstimationResponse:
        """
        사용자의 플랜과 요청 파라미터를 기반으로 최종 소모 크레딧을 계산하고,
        사용자에게 보여줄 할인율 정보와 잔액 정보를 포함하여 반환합니다.
        """
        if not user.subscription or not user.subscription.plan:
            # 기본 플랜(Basic) 사용자로 간주
            # 실제 운영 시에는 DB에 Basic 플랜 정보를 필수로 생성해두어야 합니다.
            query = select(models.Plan).filter(models.Plan.name == models.PlanType.BASIC)
            result = await db.execute(query)
            plan = result.scalar_one_or_none()
            if not plan:
                # 이 경우는 시스템 설정 오류이므로 서버 에러를 발생시키는 것이 맞습니다.
                raise Exception("Basic plan not found in database.")
        else:
            plan = user.subscription.plan

        # 1. 타임프레임 정밀도 가중치 계산
        # 1시간(60분)을 기준으로 얼마나 더 정밀한지를 계산합니다.
        timeframe_multiplier = 60 / params.min_timeframe_minutes

        # 2. Pro 플랜 기준 원가 계산 (할증 미적용)
        # Pro 플랜의 할증 배율(P_surcharge)은 1.0 입니다.
        base_cost = 1  # 1년, 1H, 1Trial 기준 1CC
        pro_cost = (
            base_cost *
            params.backtest_duration_years *
            timeframe_multiplier *
            params.trials
        )

        # 3. 사용자 플랜의 할증 배율 적용하여 최종 비용 계산
        surcharge_multiplier = plan.credit_surcharge_multiplier
        final_cost = math.ceil(pro_cost * surcharge_multiplier)
        
        # 4. 사용자에게 보여줄 '정가' 및 '할인율' 계산
        # '정가'는 Basic 플랜 기준(할증 2.0배)으로 설정합니다.
        full_price = math.ceil(pro_cost * 2.0)
        
        # 할인율(discount_pct)은 실제로는 Plan 모델에 저장된 값을 사용합니다.
        # 여기서는 설명을 위해 직접 계산합니다.
        # final_cost = full_price * (1 - discount_pct)
        # discount_pct = 1 - (final_cost / full_price)
        # 예: Pro -> 1 - (120000 / 240000) = 0.5 (50%)
        discount_pct = 1 - (surcharge_multiplier / 2.0)

        # 5. 사용자 잔액 정보 조회 (CreditService를 통해 조회해야 하나, 우선 0으로 설정)
        # TODO: 2.3 단계에서 CreditService.get_balance_summary 연동 필요
        user_balance = 0 # 임시값
        is_sufficient = user_balance >= final_cost

        return schemas.CostEstimationResponse(
            original_cost=full_price,
            discount_pct=round(discount_pct, 4), # 소수점 4자리까지
            final_cost=final_cost,
            user_balance=user_balance,
            is_sufficient=is_sufficient
        )

cost_calculator_service = CostCalculationService()