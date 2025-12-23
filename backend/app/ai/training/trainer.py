"""
AI Model Trainer
전체 학습 파이프라인을 조율하는 트레이너 클래스입니다.
데이터 로딩, 피처 추출, 라벨링, 모델 학습, 저장까지의 전체 과정을 처리합니다.
"""
import logging
import json
import time
from pathlib import Path
from typing import Dict, Any, Optional, Callable, List
from dataclasses import dataclass, asdict
from datetime import datetime

import numpy as np
import pandas as pd

from ..models.base import ModelConfig, TrainingConfig, TrainingResult
from ..models.lstm import LSTMClassifier
from ..models.gru import GRUClassifier
from ..labeling.triple_barrier import TripleBarrierLabeler, TripleBarrierConfig
from ..preprocessing.feature_engineer import FeatureEngineer, FeatureConfig

logger = logging.getLogger(__name__)


@dataclass
class TrainingPipelineConfig:
    """전체 학습 파이프라인 설정"""
    # 모델 설정
    model_type: str = "lstm"
    architecture_config: Dict[str, Any] = None
    
    # 피처 설정
    feature_config: Dict[str, Any] = None
    
    # 라벨링 설정
    labeling_config: Dict[str, Any] = None
    
    # 학습 설정
    training_config: Dict[str, Any] = None
    
    # 데이터 설정
    training_symbol: str = "BTCUSDT"
    training_timeframe: str = "1h"
    training_start_date: str = None  # ISO format
    training_end_date: str = None    # ISO format
    
    def __post_init__(self):
        self.architecture_config = self.architecture_config or {}
        self.feature_config = self.feature_config or {}
        self.labeling_config = self.labeling_config or {}
        self.training_config = self.training_config or {}


class AIModelTrainer:
    """
    AI 모델 학습 파이프라인 트레이너.
    
    주요 역할:
    1. 데이터 로딩 및 전처리
    2. Triple Barrier 라벨링
    3. 피처 추출 및 시퀀스 생성
    4. 모델 학습
    5. ONNX 변환 및 저장
    6. Feature Store 설정 저장
    """
    
    def __init__(
        self, 
        config: TrainingPipelineConfig,
        save_dir: str,
        progress_callback: Optional[Callable[[int, int, Dict], None]] = None
    ):
        """
        Args:
            config: 파이프라인 설정
            save_dir: 모델 저장 디렉토리
            progress_callback: 진행률 콜백 (current_step, total_steps, metrics)
        """
        self.config = config
        self.save_dir = Path(save_dir)
        self.progress_callback = progress_callback
        
        self.save_dir.mkdir(parents=True, exist_ok=True)
        
        # 컴포넌트 초기화
        self.labeler: Optional[TripleBarrierLabeler] = None
        self.feature_engineer: Optional[FeatureEngineer] = None
        self.model: Optional[LSTMClassifier] = None
        
    def train(self, df: pd.DataFrame, version_number: Optional[int] = None) -> Dict[str, Any]:
        """
        전체 학습 파이프라인 실행
        
        Args:
            df: OHLCV 데이터프레임 (time, open, high, low, close, volume)
            version_number: (Optional) 모델 버전 번호. 지정 시 하위 디렉토리에 저장.
            
        Returns:
            결과 메트릭 및 모델 정보
        """
        start_time = time.time()
        
        # 버전별 저장 경로 설정
        if version_number is not None:
             self.save_dir = self.save_dir / f"v{version_number}"
             self.save_dir.mkdir(parents=True, exist_ok=True)
             logger.info(f"Versioned training enabled. Output dir: {self.save_dir}")

        total_steps = 5
        current_step = 0
        
        logger.info(f"Starting training pipeline for {self.config.training_symbol}")
        logger.info(f"Data shape: {df.shape}")
        
        # Step 1: 라벨링
        current_step += 1
        self._report_progress(current_step, total_steps, {"phase": "labeling"})
        
        labeling_params = self.config.labeling_config.copy()
        if 'method' in labeling_params:
            del labeling_params['method']
        labeling_config = TripleBarrierConfig(**labeling_params)
        self.labeler = TripleBarrierLabeler(labeling_config)
        labels = self.labeler.generate_labels(df)
        label_stats = self.labeler.get_label_stats(labels)
        
        logger.info(f"Labeling completed: {label_stats}")
        
        # Step 2: 피처 추출
        current_step += 1
        self._report_progress(current_step, total_steps, {"phase": "feature_extraction"})
        
        # Filter feature_config to only include valid FeatureConfig fields
        # (exclude feature_store fields like 'feature_order', 'normalization_params')
        valid_feature_config_fields = {
            'sequence_length', 'use_ohlcv', 'ohlcv_columns', 'indicators',
            'normalization', 'rolling_window', 'use_returns', 'use_log_returns'
        }
        filtered_feature_config = {
            k: v for k, v in self.config.feature_config.items() 
            if k in valid_feature_config_fields
        }
        
        feature_config = FeatureConfig(**filtered_feature_config)
        self.feature_engineer = FeatureEngineer(feature_config)
        X, y, feature_store_config = self.feature_engineer.fit_transform(df, labels)
        
        logger.info(f"Feature extraction completed: X={X.shape}, y={y.shape}")
        
        # Step 3: Train/Val 분할
        current_step += 1
        self._report_progress(current_step, total_steps, {"phase": "data_split"})
        
        train_config = TrainingConfig(**self.config.training_config)
        val_split = train_config.validation_split
        split_idx = int(len(X) * (1 - val_split))
        
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        
        logger.info(f"Data split: train={X_train.shape}, val={X_val.shape}")
        
        # Step 4: 모델 학습
        current_step += 1
        self._report_progress(current_step, total_steps, {"phase": "training"})
        
        # 모델 설정
        input_size = X.shape[2]  # 피처 수
        model_config = ModelConfig(
            input_size=input_size,
            **self.config.architecture_config
        )
        
        # 모델 생성 및 학습
        self.model = self._create_model(self.config.model_type)
        self.model.build(model_config)
        
        # 학습 콜백
        def training_progress(epoch, total_epochs, metrics):
            self._report_progress(
                current_step, 
                total_steps, 
                {
                    "phase": "training",
                    "epoch": epoch,
                    "total_epochs": total_epochs,
                    **metrics
                }
            )
        
        training_result = self.model.train(
            X_train, y_train,
            X_val, y_val,
            train_config,
            progress_callback=training_progress
        )
        
        logger.info(f"Training completed: best_epoch={training_result.best_epoch}")
        
        # Step 4.5: Feature Importance 계산
        feature_names = feature_store_config.get("feature_order", [])
        if not feature_names:
            feature_names = [f"feat_{i}" for i in range(input_size)]
        
        feature_importance = self._calculate_feature_importance(X_val, feature_names)
        
        # Step 5: 모델 저장
        current_step += 1
        self._report_progress(current_step, total_steps, {"phase": "saving"})
        
        self._save_all(feature_store_config, training_result, label_stats, X.shape)
        
        # 최종 결과 반환
        total_time = time.time() - start_time
        
        result = {
            "status": "completed",
            "training_time_seconds": total_time,
            "version_number": version_number,
            "model_path": str(self.save_dir / "model.onnx"),
            "label_stats": label_stats,
            "training_metrics": asdict(training_result),
            "feature_config": feature_store_config,
            "feature_importance": feature_importance,
            "model_info": self.model.get_model_info(),
        }
        
        logger.info(f"Pipeline completed in {total_time:.2f}s")
        
        return result
    
    def _create_model(self, model_type: str):
        """모델 타입에 따른 모델 생성"""
        if model_type == "lstm":
            return LSTMClassifier()
        elif model_type == "gru":
            return GRUClassifier()
        # 향후 TFT 등 추가
        else:
            raise ValueError(f"Unknown model type: {model_type}")
    
    def _save_all(
        self,
        feature_config: Dict[str, Any],
        training_result: TrainingResult,
        label_stats: Dict[str, Any],
        input_shape: tuple
    ) -> None:
        """모델 및 설정 저장"""
        
        # 1. ONNX 모델 저장
        onnx_path = self.save_dir / "model.onnx"
        sample_shape = (1, input_shape[1], input_shape[2])  # (1, seq_len, features)
        self.model.to_onnx(str(onnx_path), sample_shape)
        
        # 2. PyTorch 체크포인트 저장 (백업)
        pt_path = self.save_dir / "model.pt"
        self.model.save(str(pt_path))
        
        # 3. Feature Store 설정 저장
        config_path = self.save_dir / "config.json"
        with open(config_path, 'w') as f:
            json.dump(feature_config, f, indent=2, default=str)
        
        # 4. 메타데이터 저장
        metadata = {
            "created_at": datetime.utcnow().isoformat(),
            "model_type": self.config.model_type,
            "training_symbol": self.config.training_symbol,
            "training_timeframe": self.config.training_timeframe,
            "training_start_date": self.config.training_start_date,
            "training_end_date": self.config.training_end_date,
            "label_stats": label_stats,
            "training_result": {
                "best_epoch": training_result.best_epoch,
                "best_val_loss": training_result.best_val_loss,
                "training_time_seconds": training_result.training_time_seconds,
                "final_metrics": training_result.final_metrics,
            },
            "model_info": self.model.get_model_info(),
        }
        
        metadata_path = self.save_dir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2, default=str)
        
        logger.info(f"All files saved to {self.save_dir}")
    
    def _report_progress(self, step: int, total: int, metrics: Dict[str, Any]) -> None:
        """진행률 보고"""
        if self.progress_callback:
            self.progress_callback(step, total, metrics)

    def _calculate_feature_importance(self, X_val: np.ndarray, feature_names: List[str]) -> Dict[str, float]:
        """Integrated Gradients를 사용한 피처 중요도 계산"""
        try:
            import torch
            from captum.attr import IntegratedGradients
            
            # 모델 평가 모드
            self.model.model.eval()
            
            # 1. 샘플링 (Validation Data 중 최대 100개)
            n_samples = min(100, len(X_val))
            if n_samples == 0:
                return {}
                
            # 랜덤 샘플링
            indices = np.random.choice(len(X_val), n_samples, replace=False)
            X_sample = torch.tensor(X_val[indices], dtype=torch.float32).to(self.model.device)
            
            # 2. Baseline (Zero tensor)
            baseline = torch.zeros_like(X_sample)
            
            # 3. Integrated Gradients 인스턴스
            ig = IntegratedGradients(self.model.model)
            
            # 4. 중요도 계산 (Target: Buy class = index 2 가정)
            # Triple Barrier Labeler: -1(Sell), 0(Hold), 1(Buy) -> 0, 1, 2
            target_class = 2 
            
            attributions, delta = ig.attribute(
                inputs=X_sample,
                baselines=baseline,
                target=target_class,
                return_convergence_delta=True
            )
            
            # 5. 집계 (Absolute values -> Batch Mean -> Sequence Mean)
            # attributions: (batch, seq, features)
            importances = torch.mean(torch.abs(attributions), dim=0) # (seq, feat)
            importances = torch.mean(importances, dim=0) # (feat,)
            
            # 6. 결과 매핑
            importance_dict = {}
            importances_np = importances.detach().cpu().numpy()
            
            for i, name in enumerate(feature_names):
                if i < len(importances_np):
                     importance_dict[name] = float(importances_np[i])
            
            # 중요도 순 정렬 (내림차순)
            sorted_importances = dict(sorted(importance_dict.items(), key=lambda item: item[1], reverse=True))
            
            logger.info(f"Top 5 important features: {list(sorted_importances.keys())[:5]}")
            return sorted_importances
            
        except ImportError:
            logger.warning("Captum library not found. Skipping feature importance calculation.")
            return {}
        except Exception as e:
            logger.error(f"Error calculating feature importance: {e}")
            return {}

