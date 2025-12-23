# file: backend/app/services/cost_calculator.py

import math
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from .. import models, schemas
from .credit_service import credit_service

class CostCalculationService:
    """
    백테스팅, 최적화 등 기능 사용에 필요한 크레딧 비용을 계산하는 중앙 서비스.
    모든 비용 정책은 이 서비스 내에서만 관리됩니다.
    """

    async def calculate_cost_from_api_request(
        self,
        db: AsyncSession,
        user: models.User,
        request: schemas.BacktestCreate | schemas.BacktestCostEstimationRequest
    ) -> schemas.CostEstimationResponse:
        """
        라우터나 다른 서비스에서 받은 요청 스키마로부터 직접 비용 계산을 수행합니다.
        비용 계산 파라미터를 생성하는 로직을 이 함수가 전담합니다.
        """
        duration_days = (request.end_date - request.start_date).days
        duration_years = duration_days / 365.25 if duration_days > 0 else 0

        # [개선] 전략 ID가 있는 경우, 실제 전략의 최소 타임프레임을 추출하여 비용 계산에 반영합니다.
        min_tf_minutes = 60 # 기본값 1h
        
        # request가 strategy_id를 가지고 있는지 확인 (OptimizationCostEstimationRequest 등)
        if hasattr(request, 'strategy_id') and request.strategy_id:
            try:
                # Circular Import 방지를 위해 함수 내부에서 임포트
                from ..services.strategy_service import strategy_service
                from ..utils.strategy_utils import get_min_timeframe_minutes
                
                # 전략 조회
                strategy = await strategy_service.get_strategy_by_id(db, request.strategy_id)
                if strategy:
                    min_tf_minutes = get_min_timeframe_minutes(strategy, default_timeframe='1h')
            except Exception as e:
                # 전략 조회 실패 시 기본값 사용 (로깅 생략 가능 또는 warning)
                print(f"[CostCalculator] Failed to extract timeframe from strategy: {e}")
                pass

        # 비용 계산에 필요한 저수준 파라미터 객체를 내부적으로 생성합니다.
        cost_params = schemas.CostEstimationRequest(
            backtest_duration_years=duration_years,
            min_timeframe_minutes=min_tf_minutes,
            trials=1
        )
        
        # 기존의 저수준 계산 함수를 호출하여 결과를 반환합니다.
        return await self.calculate_credit_cost(db, user, cost_params)

    
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
        credit_summary = await credit_service.get_balance_summary(db, user.id)
        user_balance = credit_summary.total_balance
        is_sufficient = user_balance >= final_cost

        return schemas.CostEstimationResponse(
            original_cost=full_price,
            discount_pct=round(discount_pct, 4),
            final_cost=final_cost,
            user_balance=user_balance,
            is_sufficient=is_sufficient
        )
    async def calculate_ai_training_cost(
        self,
        db: AsyncSession,
        user: models.User,
        training_type: str = "new", # "new" or "retrain"
        # Dynamic Parameters
        start_date: datetime = None,
        end_date: datetime = None,
        timeframe: str = "1h",
        epochs: int = 100,
        model_id: str = None,
        hidden_size: int = 64,
        num_layers: int = 2
    ) -> schemas.CostEstimationResponse:
        """
        AI 모델 학습/재학습 비용 계산 (Dynamic)
        """
        # 0. Model Lookup & Parameter Params Override (for retrain)
        if model_id:
            query = select(models.AIModel).filter(models.AIModel.id == model_id)
            result = await db.execute(query)
            target_model = result.scalar_one_or_none()
            
            if target_model and training_type == "retrain":
                # 재학습 시에는 모델의 원본 설정(Timeframe, Epochs)을 따르는 것이 기본
                if target_model.training_timeframe:
                    timeframe = target_model.training_timeframe
                if target_model.training_config:
                    epochs = target_model.training_config.get("epochs", 100)
                if target_model.architecture_config:
                    hidden_size = target_model.architecture_config.get("hidden_size", 64)
                    num_layers = target_model.architecture_config.get("num_layers", 2)
                
                # 날짜가 명시되지 않았으면 모델의 마지막 학습 날짜 등을 참조 (옵션)
                # 하지만 보통 재학습은 날짜를 명시함.
                if not start_date: start_date = target_model.training_start_date
                if not end_date: end_date = target_model.training_end_date

        # 1. Row Count 추정
        if not start_date or not end_date:
            # 기본값 (최근 1년)
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=365)
            
        duration = (end_date - start_date).total_seconds()
        
        # Timeframe in seconds
        tf_minutes = 60 # 1h default
        if timeframe.endswith('m'):
            tf_minutes = int(timeframe[:-1])
        elif timeframe.endswith('h'):
            tf_minutes = int(timeframe[:-1]) * 60
        elif timeframe.endswith('d'):
            tf_minutes = int(timeframe[:-1]) * 60 * 24
            
        tf_seconds = tf_minutes * 60
        estimated_rows = duration / tf_seconds
        
        # 2. Workload Estimation
        # Heuristic: Total processed items = Rows * Epochs
        base_items = estimated_rows * epochs
        
        # [Complexity Factor]
        # LSTM 복잡도는 은닉층 크기와 레이어 수에 크게 영향을 받음.
        # 기준: Hidden=64, Layers=2 => Factor 1.0
        # Hidden 128 (2배) -> 약 2.8배 연산량 (1.5승 적용)
        hidden_factor = math.pow(hidden_size / 64.0, 1.5)
        layer_factor = num_layers / 2.0
        complexity_factor = hidden_factor * layer_factor
        
        total_workload = base_items * complexity_factor
        
        # 3. Estimated CPU Time (Seconds)
        # 벤치마크: CPU 1코어 기준 초당 처리 가능한 (Row*Epoch*Complexity) 수
        PERFORMANCE_CONSTANT = 15000 
        estimated_seconds = total_workload / PERFORMANCE_CONSTANT
        
        # 최소 비용 보장 (10초)
        estimated_seconds = max(estimated_seconds, 10.0)
        
        # 4. Base Cost (Pro 기준, 1 Credit per Second)
        # User defined: "Basic 기준 1초에 2크레딧"
        # Basic Multiplier is usually 2.0. So Base Rate is 1.0.
        base_rate_per_sec = 1.0
        base_cost = math.ceil(estimated_seconds * base_rate_per_sec)

        # 5. Plan Calculation
        if not user.subscription or not user.subscription.plan:
            query = select(models.Plan).filter(models.Plan.name == models.PlanType.BASIC)
            result = await db.execute(query)
            plan = result.scalar_one_or_none()
            if not plan: raise Exception("Basic plan not found")
            surcharge_multiplier = plan.credit_surcharge_multiplier
        else:
            surcharge_multiplier = user.subscription.plan.credit_surcharge_multiplier
            
        final_cost = math.ceil(base_cost * surcharge_multiplier)
        
        # 정가 (Basic 기준)
        full_price = math.ceil(base_cost * 2.0)
        discount_pct = 1 - (surcharge_multiplier / 2.0)
        
        credit_summary = await credit_service.get_balance_summary(db, user.id)
        user_balance = credit_summary.total_balance
        is_sufficient = user_balance >= final_cost
        
        return schemas.CostEstimationResponse(
            original_cost=full_price,
            discount_pct=round(discount_pct, 4),
            final_cost=final_cost,
            user_balance=user_balance,
            is_sufficient=is_sufficient
        )

cost_calculator_service = CostCalculationService()