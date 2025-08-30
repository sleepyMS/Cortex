# file: backend/app/services/indicator_service.py

from fastapi import HTTPException, status
from typing import List, Dict, Any, Union

from ..core.indicator_definitions import INDICATOR_DEFINITIONS
from .. import schemas

class IndicatorService:
    """
    indicator_definitions.py를 기반으로 지표 메타데이터를 제공하고,
    전략 규칙의 유효성을 검증하는 서비스.
    """
    def __init__(self):
        self.definitions = INDICATOR_DEFINITIONS

    def get_all_metadata(self) -> List[Dict[str, Any]]:
        """프론트엔드에 전달할 모든 지표의 메타데이터 목록을 반환합니다."""
        # key를 각 객체 내부에 포함시켜 리스트 형태로 변환
        return [{"key": key, **value} for key, value in self.definitions.items()]

    def validate_strategy_indicators(self, strategy_data: Union[schemas.StrategyCreate, schemas.StrategyUpdate]):
        """전략에 포함된 모든 지표의 파라미터와 제약 조건을 검증합니다."""
        all_indicator_values = self._get_all_indicator_values(strategy_data)
        
        for indicator in all_indicator_values:
            definition = self.definitions.get(indicator.indicator_key)
            if not definition:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"지원되지 않는 지표입니다: {indicator.indicator_key}")

            # 1. 파라미터 유효성 검사 (타입, 범위)
            for param_key, param_value in indicator.values.items():
                param_def = definition["parameters"].get(param_key)
                if not param_def:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"'{indicator.indicator_key}' 지표에 '{param_key}' 파라미터가 존재하지 않습니다.")
                
                min_val, max_val = param_def["validation_range"]
                if not (min_val <= param_value <= max_val):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"'{indicator.indicator_key}'의 '{param_key}' 파라미터 값이 유효 범위({min_val}~{max_val})를 벗어났습니다.")

        # 2. 파라미터 간 제약 조건 검사 (예: fast < slow)
        if "constraints" in definition:
            for constraint in definition["constraints"]:
                # 예: "fast < slow" -> "indicator.values['fast'] < indicator.values['slow']"
                safe_constraint = constraint.replace(" ", "").replace("<", " < ").replace(">", " > ")
                for param in definition["parameters"]:
                    safe_constraint = safe_constraint.replace(param, f"indicator.values.get('{param}')")
                
                if not eval(safe_constraint):
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"'{indicator.indicator_key}' 지표의 파라미터 제약 조건 위반: {constraint}")

    def _get_all_indicator_values(self, request: Union[schemas.StrategyCreate, schemas.StrategyUpdate]) -> List[schemas.IndicatorValue]:
        # (이전 답변에서 제공한 _get_all_indicator_values 함수를 여기에 붙여넣습니다)
        found_indicators: List[schemas.IndicatorValue] = []
        # ... 재귀 탐색 로직 ...
        return found_indicators

indicator_service = IndicatorService()