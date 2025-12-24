"""
Base AI Model Interface
모든 AI 모델이 구현해야 하는 공통 인터페이스를 정의합니다.
향후 GRU, TFT 등 다양한 모델로 확장 가능하도록 설계되었습니다.
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
import numpy as np


@dataclass
class ModelConfig:
    """모델 아키텍처 설정"""
    input_size: int          # 입력 피처 수
    hidden_size: int = 64    # 은닉층 크기
    num_layers: int = 2      # LSTM/GRU 레이어 수
    num_classes: int = 3     # 출력 클래스 수 (BUY=0, HOLD=1, SELL=2)
    dropout: float = 0.2     # 드롭아웃 비율
    bidirectional: bool = False  # 양방향 여부


@dataclass
class TrainingConfig:
    """학습 하이퍼파라미터 설정"""
    epochs: int = 100
    batch_size: int = 64
    learning_rate: float = 0.001
    early_stopping_patience: int = 10
    validation_split: float = 0.2
    weight_decay: float = 1e-5  # L2 정규화
    scheduler_factor: float = 0.5
    scheduler_patience: int = 5


@dataclass 
class TrainingResult:
    """학습 결과"""
    train_loss_history: list
    val_loss_history: list
    best_epoch: int
    best_val_loss: float
    training_time_seconds: float
    final_metrics: Dict[str, Any]
    accuracy_history: list = None


class BaseAIModel(ABC):
    """
    모든 AI 모델의 추상 베이스 클래스.
    LSTM, GRU, TFT 등 다양한 모델이 이 인터페이스를 구현합니다.
    """
    
    model_type: str = "base"
    
    @abstractmethod
    def build(self, config: ModelConfig) -> None:
        """모델 아키텍처 구축"""
        pass
    
    @abstractmethod
    def train(
        self, 
        X_train: np.ndarray, 
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
        config: Optional[TrainingConfig] = None,
        labeling_config: Optional[Dict[str, Any]] = None
    ) -> TrainingResult:
        """모델 학습"""
        pass
    
    @abstractmethod
    def predict(self, X: np.ndarray) -> np.ndarray:
        """예측 수행 (클래스 확률 반환)"""
        pass
    
    @abstractmethod
    def predict_classes(self, X: np.ndarray) -> np.ndarray:
        """예측 클래스 반환 (0=BUY, 1=HOLD, 2=SELL)"""
        pass
    
    @abstractmethod
    def save(self, path: str) -> None:
        """모델 저장 (ONNX 포맷)"""
        pass
    
    @abstractmethod
    def load(self, path: str) -> None:
        """모델 로드"""
        pass
    
    @abstractmethod
    def to_onnx(self, path: str, sample_input_shape: Tuple[int, ...]) -> None:
        """ONNX 포맷으로 변환 및 저장"""
        pass
    
    def get_model_info(self) -> Dict[str, Any]:
        """모델 정보 반환"""
        return {
            "model_type": self.model_type,
        }
