"""
ONNX Inference Service
학습된 ONNX 모델을 로드하여 추론을 수행합니다.
백테스팅 및 실시간 봇에서 사용됩니다.
"""
import logging
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from functools import lru_cache

import numpy as np
import onnxruntime as ort

from ..preprocessing.feature_engineer import FeatureEngineer, FeatureConfig

logger = logging.getLogger(__name__)


class ONNXInferenceSession:
    """
    ONNX 모델 추론 세션.
    모델과 Feature Store 설정을 로드하여 일관된 추론을 수행합니다.
    """
    
    def __init__(self, model_dir: str):
        """
        Args:
            model_dir: 모델 디렉토리 경로 (model.onnx, config.json 포함)
        """
        self.model_dir = Path(model_dir)
        self.session: Optional[ort.InferenceSession] = None
        self.feature_engineer: Optional[FeatureEngineer] = None
        self.metadata: Dict[str, Any] = {}
        
        self._load()
    
    def _load(self) -> None:
        """모델 및 설정 로드"""
        # 1. ONNX 모델 로드
        onnx_path = self.model_dir / "model.onnx"
        if not onnx_path.exists():
            raise FileNotFoundError(f"ONNX model not found: {onnx_path}")
        
        # ONNX Runtime 세션 생성 (CPU 사용)
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        self.session = ort.InferenceSession(
            str(onnx_path),
            sess_options,
            providers=['CPUExecutionProvider']
        )
        
        logger.info(f"ONNX model loaded from {onnx_path}")
        
        # 2. Feature Store 설정 로드
        config_path = self.model_dir / "config.json"
        if config_path.exists():
            with open(config_path, 'r') as f:
                feature_config = json.load(f)
            
            self.feature_engineer = FeatureEngineer()
            self.feature_engineer.load_feature_store_config(feature_config)
            logger.info(f"Feature config loaded: {len(feature_config.get('feature_order', []))} features")
        
        # 3. 메타데이터 로드
        metadata_path = self.model_dir / "metadata.json"
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                self.metadata = json.load(f)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        원시 시퀀스 입력에 대한 예측 수행
        
        Args:
            X: (n_samples, sequence_length, n_features) - 이미 전처리된 데이터
            
        Returns:
            probs: (n_samples, 3) - 각 클래스 확률 [BUY, HOLD, SELL]
        """
        if self.session is None:
            raise RuntimeError("ONNX session not initialized")
        
        # 입력 형태 확인
        input_name = self.session.get_inputs()[0].name
        
        # Float32로 변환
        X = X.astype(np.float32)
        
        # 추론 실행
        outputs = self.session.run(None, {input_name: X})
        logits = outputs[0]
        
        # Softmax 적용하여 확률로 변환
        probs = self._softmax(logits)
        
        return probs
    
    def predict_from_ohlcv(self, df, batch_size: int = 100) -> Dict[str, np.ndarray]:
        """
        OHLCV 데이터프레임에서 직접 예측 수행
        Feature engineering을 자동으로 적용합니다.
        
        Args:
            df: OHLCV 데이터프레임
            batch_size: 배치 크기
            
        Returns:
            {
                "probabilities": (n, 3) - 클래스 확률,
                "predictions": (n,) - 예측 클래스,
                "buy_prob": (n,) - 매수 확률,
                "sell_prob": (n,) - 매도 확률,
            }
        """
        if self.feature_engineer is None:
            raise RuntimeError("Feature engineer not initialized")
        
        # 피처 추출 및 시퀀스 생성
        X = self.feature_engineer.transform(df)
        
        if len(X) == 0:
            return {
                "probabilities": np.array([]),
                "predictions": np.array([]),
                "buy_prob": np.array([]),
                "sell_prob": np.array([]),
            }
        
        # 배치 처리
        all_probs = []
        for i in range(0, len(X), batch_size):
            batch = X[i:i + batch_size]
            probs = self.predict(batch)
            all_probs.append(probs)
        
        probs = np.vstack(all_probs)
        
        return {
            "probabilities": probs,
            "predictions": probs.argmax(axis=1),
            "buy_prob": probs[:, 0],   # BUY = class 0
            "hold_prob": probs[:, 1],  # HOLD = class 1
            "sell_prob": probs[:, 2],  # SELL = class 2
        }
    
    def get_latest_prediction(self, df) -> Dict[str, Any]:
        """
        가장 최신 시점의 예측 결과 반환 (실시간 봇용)
        
        Args:
            df: 최근 OHLCV 데이터프레임 (sequence_length + rolling_window 이상)
            
        Returns:
            {
                "buy_probability": float,
                "sell_probability": float,
                "hold_probability": float,
                "predicted_class": int,
                "predicted_label": str,
            }
        """
        result = self.predict_from_ohlcv(df)
        
        if len(result["probabilities"]) == 0:
            return {
                "buy_probability": 0.0,
                "sell_probability": 0.0,
                "hold_probability": 1.0,
                "predicted_class": 1,
                "predicted_label": "HOLD",
                "error": "Insufficient data",
            }
        
        # 가장 마지막 예측
        probs = result["probabilities"][-1]
        pred_class = int(result["predictions"][-1])
        
        labels = ["BUY", "HOLD", "SELL"]
        
        return {
            "buy_probability": float(probs[0]),
            "hold_probability": float(probs[1]),
            "sell_probability": float(probs[2]),
            "predicted_class": pred_class,
            "predicted_label": labels[pred_class],
        }
    
    @staticmethod
    def _softmax(x: np.ndarray) -> np.ndarray:
        """Softmax 함수"""
        exp_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
        return exp_x / np.sum(exp_x, axis=-1, keepdims=True)
    
    def get_model_info(self) -> Dict[str, Any]:
        """모델 정보 반환"""
        return {
            "model_dir": str(self.model_dir),
            "has_session": self.session is not None,
            "has_feature_engineer": self.feature_engineer is not None,
            "metadata": self.metadata,
        }


class AIModelRegistry:
    """
    AI 모델 레지스트리 - 모델 캐싱 및 관리.
    동일한 모델에 대한 반복 로드를 방지합니다.
    """
    
    _cache: Dict[str, ONNXInferenceSession] = {}
    
    @classmethod
    def get_session(cls, model_id: str, model_dir: str) -> ONNXInferenceSession:
        """
        캐시된 세션 반환 또는 새로 생성
        
        Args:
            model_id: 모델 ID (캐시 키)
            model_dir: 모델 디렉토리 경로
            
        Returns:
            ONNXInferenceSession
        """
        if model_id not in cls._cache:
            logger.info(f"Loading model {model_id} from {model_dir}")
            cls._cache[model_id] = ONNXInferenceSession(model_dir)
        else:
            logger.debug(f"Using cached model {model_id}")
        
        return cls._cache[model_id]
    
    @classmethod
    def clear_cache(cls, model_id: Optional[str] = None) -> None:
        """캐시 클리어"""
        if model_id:
            cls._cache.pop(model_id, None)
            logger.info(f"Cache cleared for model {model_id}")
        else:
            cls._cache.clear()
            logger.info("All model cache cleared")
    
    @classmethod
    def get_cached_models(cls) -> List[str]:
        """캐시된 모델 ID 목록"""
        return list(cls._cache.keys())
