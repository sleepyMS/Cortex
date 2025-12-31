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
        signal_type: Optional[str] = None, # Optional for regression
        evaluation_mode: str = "highest",
        min_confidence: float = 0.5,
        model_dir: Optional[str] = None,
        task_type: str = "classification", # Default to classification
        direction_signal: Optional[str] = None, # For regression (positive/negative)
        use_uncertainty: bool = False,
        mc_dropout_samples: int = 10,
        uncertainty_threshold: Optional[float] = None,
    ) -> pd.Series:
        """
        AI 모델 예측을 수행하고 조건을 평가합니다.
        
        Args:
            df: OHLCV 데이터프레임 (time 컬럼 필수)
            model_id: AI 모델 UUID
            signal_type: "buy", "sell", "hold" (classification용)
            evaluation_mode: 평가 모드
                - threshold: signal_type 확률이 min_confidence 이상일 때 True
                - highest: signal_type이 가장 높은 확률(argmax)일 때 True
                - direction: 회귀 모델용 - 예측값 부호로 판단
                - confidence: 회귀 모델용 - 95% 신뢰구간 기반
            min_confidence: threshold 모드용 최소 신뢰도 (0.0~1.0)
            model_dir: 모델 디렉토리 경로
            task_type: "classification" or "regression"
            direction_signal: "positive" or "negative" (regression용)
            use_uncertainty: MC Dropout 불확실성 사용 여부
            mc_dropout_samples: MC Dropout 샘플 수
            uncertainty_threshold: 최대 허용 불확실성
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
        
        # 3. 회귀 vs 분류 분기 처리
        is_regression_pred = "predicted_value" in result and len(result["predicted_value"]) > 0
        
        # 명시적 task_type이 있다면 그것을 따르고, 없으면 예측 결과 구조로 추론
        is_regression_task = (task_type == "regression") or is_regression_pred
        
        if is_regression_task:
            if not is_regression_pred:
                logger.warning(f"Model {model_id} is set as regression but returned no predicted_value")
                return pd.Series(False, index=df.index)

            pred_values = result["predicted_value"]
            n_predictions = len(pred_values)
            n_original = len(df)
            
            # Align length
            if n_predictions < n_original:
                padding = np.zeros(n_original - n_predictions)
                # 앞부분을 0으로 채움 (정보 부족)
                pred_values = np.concatenate([padding, pred_values])
            elif n_predictions > n_original:
                pred_values = pred_values[-n_original:]
            
            # 방향 신호 결정 (positive: > 0, negative: < 0)
            target_direction = direction_signal.lower() if direction_signal else None
            
            # Fallback for old configs: try to infer from signal_type if direction_signal is missing
            if not target_direction and signal_type:
                if signal_type.lower() == "buy": target_direction = "positive"
                elif signal_type.lower() == "sell": target_direction = "negative"
            
            if not target_direction:
                # 방향을 알 수 없으면 False
                return pd.Series(False, index=df.index)

            if evaluation_mode == "direction":
                if target_direction == "positive":
                    condition_met = pred_values > 0
                elif target_direction == "negative":
                    condition_met = pred_values < 0
                else:
                    condition_met = np.zeros_like(pred_values, dtype=bool) # Should not happen
                    
            elif evaluation_mode == "confidence":
                # MC Dropout 기반 95% 신뢰구간 평가
                try:
                    uncertainty_result = session.predict_with_uncertainty(
                        df, n_samples=mc_dropout_samples
                    )
                    mean_pred = uncertainty_result["mean"]
                    std_pred = uncertainty_result["std"]
                    lower_bound = uncertainty_result["lower_bound"]
                    upper_bound = uncertainty_result["upper_bound"]
                    
                    # Length alignment
                    n_pred = len(mean_pred)
                    if n_pred < n_original:
                        padding_len = n_original - n_pred
                        # 앞부분 패딩
                        mean_pred = np.concatenate([np.zeros(padding_len), mean_pred])
                        std_pred = np.concatenate([np.zeros(padding_len), std_pred])
                        lower_bound = np.concatenate([np.zeros(padding_len), lower_bound])
                        upper_bound = np.concatenate([np.zeros(padding_len), upper_bound])
                    elif n_pred > n_original:
                        mean_pred = mean_pred[-n_original:]
                        std_pred = std_pred[-n_original:]
                        lower_bound = lower_bound[-n_original:]
                        upper_bound = upper_bound[-n_original:]
                    
                    # Confidence-based signal generation
                    if target_direction == "positive":
                        # BUY (Positive): 95% CI 하한이 0보다 커야 함 (확실한 양수)
                        # 즉, 0이 신뢰구간 아래에 있어야 함
                        condition_met = lower_bound > 0
                    elif target_direction == "negative":
                        # SELL (Negative): 95% CI 상한이 0보다 작아야 함 (확실한 음수)
                        # 즉, 0이 신뢰구간 위에 있어야 함
                        condition_met = upper_bound < 0
                    else:
                        condition_met = np.zeros(n_original, dtype=bool)
                    
                    # Uncertainty threshold filtering
                    if uncertainty_threshold is not None and uncertainty_threshold > 0:
                        high_uncertainty = std_pred > uncertainty_threshold
                        condition_met = condition_met & ~high_uncertainty
                        # logger.debug(f"Filtered {np.sum(high_uncertainty)} signals due to high uncertainty")
                        
                except Exception as e:
                    logger.error(f"MC Dropout confidence evaluation failed: {e}")
                    condition_met = np.zeros(n_original, dtype=bool)
            else:
                # Unknown regression mode
                condition_met = np.zeros(n_original, dtype=bool)
                
            return pd.Series(condition_met, index=df.index)

        # --- Classification Logic ---
        
        if not signal_type:
             # 분류 모델인데 signal_type이 없으면 평가 불가
             return pd.Series(False, index=df.index)

        probs = result.get("probabilities", np.array([]))
        if len(probs) == 0:
            return pd.Series(False, index=df.index)
        
        # 4. 신호 타입에 따른 확률 컬럼 선택 (메타데이터에서 class_order 읽기, 없으면 기본값)
        default_prob_map = {"buy": 0, "hold": 1, "sell": 2}
        prob_map = session.metadata.get("class_order", default_prob_map) if session else default_prob_map
        signal_idx = prob_map.get(signal_type.lower(), 0)
        signal_probs = probs[:, signal_idx]
        
        # 5. DataFrame 인덱스와 정렬
        n_predictions = len(signal_probs)
        n_original = len(df)
        
        if n_predictions < n_original:
            padding_len = n_original - n_predictions
            signal_probs = np.concatenate([np.zeros(padding_len), signal_probs])
            if evaluation_mode == "highest":
                probs = np.vstack([np.zeros((padding_len, probs.shape[1])), probs])
        elif n_predictions > n_original:
            signal_probs = signal_probs[-n_original:]
            if evaluation_mode == "highest":
                probs = probs[-n_original:]
        
        # 6. 평가 모드에 따른 조건 평가
        if evaluation_mode == "highest":
            # argmax: signal_type이 가장 높은 확률일 때 True
            argmax_indices = np.argmax(probs, axis=1)
            condition_met = argmax_indices == signal_idx
        else:
            # threshold: signal_type 확률이 min_confidence 이상일 때 True
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
