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
        
        # 배치 크기가 1인 모델에 대해 다중 샘플이 들어온 경우 반복 처리
        if len(X) > 1:
            probs_list = []
            for i in range(len(X)):
                # (1, seq_len, features) 형태로 슬라이싱
                sample = X[i:i+1]
                outputs = self.session.run(None, {input_name: sample})
                logits = outputs[0]
                logits = outputs[0]
                
                # Check for regression (dim=1)
                if logits.shape[-1] == 1:
                    prob = logits
                else:
                    prob = self._softmax(logits)
                    
                probs_list.append(prob)
            
            # (n_samples, 3) 형태로 결합
            return np.vstack(probs_list)
        else:
            # 단일 샘플 (또는 모델이 배치를 지원하는 경우)
            outputs = self.session.run(None, {input_name: X})
            logits = outputs[0]
        
        # 출력 차원에 따라 처리 (1: Regression, 3: Classification)
        if logits.shape[-1] == 1:
            return logits # Raw value
        else:
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
            Dict containing predictions. Keys vary by task type.
            Classification: probabilities, predictions, buy_prob, sell_prob
            Regression: predicted_value, probabilities (raw)
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
                "predicted_value": np.array([]),
            }
        
        # 배치 처리
        all_probs = []
        for i in range(0, len(X), batch_size):
            batch = X[i:i + batch_size]
            probs = self.predict(batch)
            all_probs.append(probs)
        
        probs = np.vstack(all_probs)
        
        # Regression check
        if probs.shape[1] == 1:
            return {
                "probabilities": probs, # Raw values (N, 1)
                "predicted_value": probs.flatten(), # (N,)
                "predictions": np.zeros(len(probs)), # Dummy
                "buy_prob": np.zeros(len(probs)), # Dummy
                "sell_prob": np.zeros(len(probs)), # Dummy
            }
        else:
            # Classification - use class order from metadata (with fallback defaults)
            class_order = self.metadata.get("class_order", {"buy": 0, "hold": 1, "sell": 2})
            buy_idx = class_order.get("buy", 0)
            hold_idx = class_order.get("hold", 1)
            sell_idx = class_order.get("sell", 2)
            
            return {
                "probabilities": probs,
                "predictions": probs.argmax(axis=1),
                "buy_prob": probs[:, buy_idx],
                "hold_prob": probs[:, hold_idx],
                "sell_prob": probs[:, sell_idx],
            }
    
    def get_latest_prediction(self, df) -> Dict[str, Any]:
        """
        가장 최신 시점의 예측 결과 반환 (실시간 봇용)
        """
        result = self.predict_from_ohlcv(df)
        
        if (isinstance(result["probabilities"], np.ndarray) and len(result["probabilities"]) == 0) or len(result["probabilities"]) == 0:
             return {"error": "Insufficient data"}
        
        # Regression check
        is_regression = result.get("predicted_value") is not None and len(result["predicted_value"]) > 0
        
        if is_regression:
            pred_value = float(result["predicted_value"][-1])
            return {
                "predicted_value": pred_value,
                "predicted_class": -1, # Not applicable
                "predicted_label": f"Value: {pred_value:.4f}",
                "task_type": "regression"
            }
        else:
            # 가장 마지막 예측
            probs = result["probabilities"][-1]
            pred_class = int(result["predictions"][-1])
            
            # Use class labels from metadata (with fallback defaults)
            class_labels = self.metadata.get("class_labels", ["buy", "hold", "sell"])
            class_order = self.metadata.get("class_order", {"buy": 0, "hold": 1, "sell": 2})
            labels = [label.upper() for label in class_labels]
            
            buy_idx = class_order.get("buy", 0)
            hold_idx = class_order.get("hold", 1)
            sell_idx = class_order.get("sell", 2)
            
            return {
                "buy_probability": float(probs[buy_idx]),
                "hold_probability": float(probs[hold_idx]),
                "sell_probability": float(probs[sell_idx]),
                "predicted_class": pred_class,
                "predicted_label": labels[pred_class] if pred_class < len(labels) else "UNKNOWN",
                "task_type": "classification"
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
    
    def predict_with_uncertainty(
        self, 
        df, 
        n_samples: int = 10,
        batch_size: int = 100
    ) -> Dict[str, np.ndarray]:
        """
        MC Dropout을 사용한 불확실성 추정 (회귀 모델 전용)
        
        PyTorch 모델(.pt)을 로드하여 dropout을 활성화한 상태로
        N번의 forward pass를 수행하여 예측 분포를 추정합니다.
        
        Args:
            df: OHLCV 데이터프레임
            n_samples: MC Dropout 샘플 수 (기본값: 10)
            batch_size: 배치 크기
            
        Returns:
            Dict containing:
            - mean: 평균 예측값 (N,)
            - std: 표준편차/불확실성 (N,)
            - lower_bound: 95% CI 하한 (mean - 1.96*std)
            - upper_bound: 95% CI 상한 (mean + 1.96*std)
        """
        if self.feature_engineer is None:
            raise RuntimeError("Feature engineer not initialized")
        
        # PyTorch 모델 경로 확인
        pt_path = self.model_dir / "model.pt"
        if not pt_path.exists():
            logger.warning(
                f"MC Dropout unavailable: PyTorch model not found at {pt_path}. "
                f"Falling back to ONNX with deterministic predictions. "
                f"'confidence' evaluation mode will have NO uncertainty filtering - "
                f"consider using 'direction' mode instead for more reliable signals."
            )
            # Fallback: ONNX 결과만 반환 (불확실성 없음)
            result = self.predict_from_ohlcv(df, batch_size)
            pred_values = result.get("predicted_value", np.array([]))
            return {
                "mean": pred_values,
                "std": np.zeros_like(pred_values),
                "lower_bound": pred_values,
                "upper_bound": pred_values,
                "_fallback_used": True,  # 폴백 사용 플래그
            }
        
        try:
            import torch
            
            # 1. 피처 추출
            X = self.feature_engineer.transform(df)
            if len(X) == 0:
                return {
                    "mean": np.array([]),
                    "std": np.array([]),
                    "lower_bound": np.array([]),
                    "upper_bound": np.array([]),
                }
            
            # 2. PyTorch 모델 로드
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            checkpoint = torch.load(pt_path, map_location=device, weights_only=False)
            config = checkpoint['config']
            
            # 모델 타입에 따른 모델 클래스 선택
            model_type = self.metadata.get("model_type", "lstm")
            if model_type == "gru":
                from ..models.gru import GRUNetwork
                model = GRUNetwork(config).to(device)
            else:
                from ..models.lstm import LSTMNetwork
                model = LSTMNetwork(config).to(device)
            
            model.load_state_dict(checkpoint['model_state_dict'])
            
            # 3. MC Dropout 추론 (Dropout 활성화)
            model.train()  # Dropout 활성화
            X_tensor = torch.FloatTensor(X).to(device)
            
            all_predictions = []
            with torch.no_grad():
                for _ in range(n_samples):
                    outputs = model(X_tensor)
                    all_predictions.append(outputs.cpu().numpy())
            
            # 4. 통계 계산
            predictions = np.array(all_predictions)  # (n_samples, n_data, output_dim)
            
            # Squeeze if output is single value (regression)
            if predictions.shape[-1] == 1:
                predictions = predictions.squeeze(-1)  # (n_samples, n_data)
            
            mean_pred = np.mean(predictions, axis=0)
            std_pred = np.std(predictions, axis=0)
            
            # 5. 신뢰구간 계산 (95% CI)
            lower_bound = mean_pred - 1.96 * std_pred
            upper_bound = mean_pred + 1.96 * std_pred
            
            logger.info(f"MC Dropout inference completed: {n_samples} samples, data points: {len(mean_pred)}")
            
            return {
                "mean": mean_pred,
                "std": std_pred,
                "lower_bound": lower_bound,
                "upper_bound": upper_bound,
            }
            
        except ImportError:
            logger.error("PyTorch not available for MC Dropout inference")
            raise RuntimeError("PyTorch required for MC Dropout uncertainty estimation")
        except Exception as e:
            logger.error(f"MC Dropout inference failed: {e}")
            raise



class AIModelRegistry:
    """
    AI 모델 레지스트리 - 모델 캐싱 및 관리.
    동일한 모델에 대한 반복 로드를 방지합니다.
    """
    
    _cache: Dict[str, ONNXInferenceSession] = {}
    
    # 기본 모델 저장 경로 (backend/ai_models/{user_id}/{model_id}/)
    DEFAULT_BASE_PATH = Path(__file__).parent.parent.parent.parent / "ai_models"
    
    @classmethod
    def get_session(cls, model_id: str, model_dir: str = None) -> ONNXInferenceSession:
        """
        캐시된 세션 반환 또는 새로 생성
        
        Args:
            model_id: 모델 ID (캐시 키)
            model_dir: 모델 디렉토리 경로 (없으면 DB에서 조회)
            
        Returns:
            ONNXInferenceSession
        """
        if model_id in cls._cache:
            logger.debug(f"Using cached model {model_id}")
            return cls._cache[model_id]
        
        # model_dir이 없으면 DB에서 조회
        if model_dir is None:
            model_dir = cls._get_model_dir_from_db(model_id)
        
        if model_dir is None:
            raise FileNotFoundError(f"Model directory not found for model_id: {model_id}")
        
        logger.info(f"Loading model {model_id} from {model_dir}")
        cls._cache[model_id] = ONNXInferenceSession(model_dir)
        
        return cls._cache[model_id]
    
    @classmethod
    def _get_model_dir_from_db(cls, model_id: str) -> Optional[str]:
        """
        DB에서 모델 정보를 조회하여 모델 디렉토리 경로 반환
        """
        try:
            from ...database import SyncSessionLocal
            from ...models import AIModel
            
            with SyncSessionLocal() as session:
                ai_model = session.query(AIModel).filter(AIModel.id == model_id).first()
                
                if ai_model is None:
                    logger.warning(f"AI model not found in DB: {model_id}")
                    return None
                
                # model_weights_path가 있으면 해당 경로 사용
                if ai_model.model_weights_path:
                    model_path = Path(ai_model.model_weights_path)
                    if model_path.exists():
                        return str(model_path.parent)
                
                # 기본 경로 구성: ai_models/{user_id}/{model_id}/
                default_path = cls.DEFAULT_BASE_PATH / str(ai_model.user_id) / str(ai_model.id)
                if default_path.exists():
                    return str(default_path)
                
                logger.warning(f"Model directory not found: {default_path}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting model dir from DB: {e}")
            return None
    
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

