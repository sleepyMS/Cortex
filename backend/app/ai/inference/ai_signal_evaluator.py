# file: backend/app/ai/inference/ai_signal_evaluator.py

"""
AI Signal Evaluator

전략 규칙 평가 시 AI 모델 예측 결과를 Boolean 시리즈로 변환합니다.
SignalService에서 _parse_logic_block_to_series 함수 내에서 호출됩니다.
"""

import logging
from typing import Dict, Any, Optional
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

from .onnx_inference import ONNXInferenceSession, AIModelRegistry

logger = logging.getLogger(__name__)


class AISignalEvaluator:
    """
    AI 신호 블록 평가기.
    
    DataFrame과 AI 블록 설정을 받아 Boolean 시리즈를 반환합니다.
    각 타임스탬프에서 모델의 예측 확률이 임계값 이상인지 확인합니다.
    """
    
    def __init__(self, model_registry: Optional[AIModelRegistry] = None):
        """
        Args:
            model_registry: 모델 캐싱을 위한 레지스트리 (없으면 새로 생성)
        """
        self.registry = model_registry or AIModelRegistry()
    
    def evaluate(
        self,
        df: pd.DataFrame,
        model_id: str,
        signal_type: str,
        min_confidence: float = 0.5,
        model_dir: Optional[str] = None,
    ) -> pd.Series:
        """
        AI 모델 예측을 수행하고 조건을 평가합니다.
        
        Args:
            df: OHLCV 데이터프레임 (time 컬럼 필수)
            model_id: AI 모델 UUID
            signal_type: "buy", "sell", "hold" 중 하나
            min_confidence: 최소 신뢰도 (0.0~1.0)
            model_dir: 모델 디렉토리 경로 (없으면 기본 경로 사용)
            
        Returns:
            Boolean 시리즈: 조건 충족 시 True
        """
        if df.empty:
            return pd.Series(dtype=bool).reindex(df.index, fill_value=False)
        
        # 1. 모델 로드
        session = self._load_model(model_id, model_dir)
        if session is None:
            logger.warning(f"Failed to load AI model {model_id}, returning all False")
            return pd.Series(False, index=df.index)
        
        # 2. 예측 수행
        try:
            result = session.predict_from_ohlcv(df)
        except Exception as e:
            logger.error(f"Prediction failed for model {model_id}: {e}")
            return pd.Series(False, index=df.index)
        
        # 3. 확률값 추출
        probs = result.get("probabilities", np.array([]))
        if len(probs) == 0:
            return pd.Series(False, index=df.index)
        
        # 4. 신호 타입에 따른 확률 컬럼 선택
        prob_map = {"buy": 0, "hold": 1, "sell": 2}
        signal_idx = prob_map.get(signal_type.lower(), 0)
        signal_probs = probs[:, signal_idx]
        
        # 5. DataFrame 인덱스와 정렬
        # predict_from_ohlcv는 sequence_length만큼 앞부분 데이터를 사용하므로
        # 결과 길이가 원본보다 짧을 수 있음
        n_predictions = len(signal_probs)
        n_original = len(df)
        
        if n_predictions < n_original:
            # 앞부분은 False로 패딩
            padding = np.zeros(n_original - n_predictions)
            signal_probs = np.concatenate([padding, signal_probs])
        elif n_predictions > n_original:
            # 뒷부분만 사용
            signal_probs = signal_probs[-n_original:]
        
        # 6. 임계값 비교
        condition_met = signal_probs >= min_confidence
        
        return pd.Series(condition_met, index=df.index)
    
    def _load_model(
        self, model_id: str, model_dir: Optional[str] = None
    ) -> Optional[ONNXInferenceSession]:
        """
        모델 로드 (캐시 활용)
        """
        try:
            # 기본 모델 경로 구성
            if model_dir is None:
                # 기본 경로: backend/ai_models/{user_id}/{model_id}/
                # 이 경우 model_id로부터 경로를 찾아야 하므로 Registry 사용
                return self.registry.get_session(model_id)
            else:
                return ONNXInferenceSession(model_dir)
        except Exception as e:
            logger.error(f"Failed to load model {model_id}: {e}")
            return None
    
    def get_prediction_details(
        self,
        df: pd.DataFrame,
        model_id: str,
        model_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        예측 상세 정보 반환 (디버그/UI용)
        
        Returns:
            {
                "buy_prob": float,
                "hold_prob": float, 
                "sell_prob": float,
                "predicted_label": str,
                "timestamp": str,
            }
        """
        session = self._load_model(model_id, model_dir)
        if session is None:
            return {"error": "Model not found"}
        
        try:
            return session.get_latest_prediction(df)
        except Exception as e:
            return {"error": str(e)}


# 싱글톤 인스턴스 (SignalService에서 사용)
_evaluator_instance: Optional[AISignalEvaluator] = None


def get_ai_signal_evaluator() -> AISignalEvaluator:
    """
    AI 신호 평가기 싱글톤 반환
    """
    global _evaluator_instance
    if _evaluator_instance is None:
        _evaluator_instance = AISignalEvaluator()
    return _evaluator_instance
