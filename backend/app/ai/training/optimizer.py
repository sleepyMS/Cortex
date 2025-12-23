"""
AI Model Hyperparameter Optimizer (Optuna)
Optuna를 사용하여 AI 모델의 하이퍼파라미터를 자동으로 최적화합니다.
"""
import logging
import optuna
import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, Callable
from dataclasses import asdict

from .trainer import AIModelTrainer, TrainingPipelineConfig
from ..models.base import ModelConfig, TrainingConfig

logger = logging.getLogger(__name__)

class AIOptimizer:
    """
    AI 모델 하이퍼파라미터 최적화 도구.
    """
    
    def __init__(
        self,
        config: TrainingPipelineConfig,
        optimization_config: Dict[str, Any],
        progress_callback: Optional[Callable[[int, int, Dict], None]] = None
    ):
        self.config = config
        self.opt_config = optimization_config
        self.progress_callback = progress_callback
        self.n_trials = optimization_config.get("n_trials") or optimization_config.get("nTrials") or 20
        self.maximize_metric = optimization_config.get("maximize_metric") or optimization_config.get("maximizeMetric") or "accuracy"
        self.search_space = optimization_config.get("search_space") or optimization_config.get("searchSpace") or {}

    def optimize(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        하이퍼파라미터 최적화 수행
        """
        logger.info(f"Starting hyperparameter optimization: {self.n_trials} trials, target={self.maximize_metric}")
        
        # 1. 공통 전처리 (라벨링 및 피처 추출은 한 번만 수행)
        # 임시 트레이너를 사용하여 데이터 준비
        temp_trainer = AIModelTrainer(self.config, save_dir="/tmp/cortex_optuna")
        
        # Step 1: 라벨링
        labeling_params = self.config.labeling_config.copy()
        if 'method' in labeling_params: del labeling_params['method']
        from ..labeling.triple_barrier import TripleBarrierLabeler, TripleBarrierConfig
        labeler = TripleBarrierLabeler(TripleBarrierConfig(**labeling_params))
        labels = labeler.generate_labels(df)
        
        # Step 2: 피처 추출
        from ..preprocessing.feature_engineer import FeatureEngineer, FeatureConfig
        valid_feature_config_fields = {
            'sequence_length', 'use_ohlcv', 'ohlcv_columns', 'indicators',
            'normalization', 'rolling_window', 'use_returns', 'use_log_returns'
        }
        filtered_feature_config = {
            k: v for k, v in self.config.feature_config.items() 
            if k in valid_feature_config_fields
        }
        feature_engineer = FeatureEngineer(FeatureConfig(**filtered_feature_config))
        X, y, feature_store_config = feature_engineer.fit_transform(df, labels)
        
        # Step 3: 데이터 분할
        val_split = self.config.training_config.get("validationSplit", 0.2)
        split_idx = int(len(X) * (1 - val_split))
        X_train, X_val = X[:split_idx], X[split_idx:]
        y_train, y_val = y[:split_idx], y[split_idx:]
        
        input_size = X.shape[2]
        
        # 2. Optuna Objective 함수 정의
        def objective(trial):
            # 탐색 범위에서 파라미터 샘플링
            # searchSpace가 없으면 기본값 사용
            ss = self.search_space
            
            hidden_size = trial.suggest_int("hidden_size", 
                ss.get("hidden_size", {}).get("min", 32), 
                ss.get("hidden_size", {}).get("max", 256), step=16)
            
            num_layers = trial.suggest_int("num_layers", 
                ss.get("num_layers", {}).get("min", 1), 
                ss.get("num_layers", {}).get("max", 4))
            
            dropout = trial.suggest_float("dropout", 
                ss.get("dropout", {}).get("min", 0.1), 
                ss.get("dropout", {}).get("max", 0.5), step=0.05)
            
            lr = trial.suggest_float("learning_rate", 
                ss.get("learning_rate", {}).get("min", 1e-4), 
                ss.get("learning_rate", {}).get("max", 1e-2), log=True)
            
            batch_size = trial.suggest_int("batch_size", 
                ss.get("batch_size", {}).get("min", 32), 
                ss.get("batch_size", {}).get("max", 128), step=16)

            # 모델 및 학습 설정 생성
            model_config = ModelConfig(
                input_size=input_size,
                hidden_size=hidden_size,
                num_layers=num_layers,
                dropout=dropout
            )
            
            # 최적화 시에는 에폭 수를 제한하여 속도 향상 (기본 30에폭 또는 설정값의 30%)
            max_epochs = self.config.training_config.get("epochs", 100)
            trial_epochs = min(max_epochs, 30) 
            
            train_config = TrainingConfig(
                epochs=trial_epochs,
                batch_size=batch_size,
                learning_rate=lr,
                early_stopping_patience=5, # 최적화 시에는 더 민감하게 중단
                validation_split=val_split
            )

            # 모델 생성 및 학습
            model = temp_trainer._create_model(self.config.model_type)
            model.build(model_config)
            
            logger.info(f"Trial {trial.number} started: hidden={hidden_size}, layers={num_layers}, lr={lr:.6f}, batch={batch_size}")
            
            # Trial 진행률 보고 (선택 사항)
            def trial_callback(epoch, total_epochs, metrics):
                # Optuna pruning을 위한 중간 결과 보고
                # Step은 epoch 사용
                val_loss = metrics.get("val_loss", float('inf'))
                trial.report(val_loss, epoch)
                
                # Pruning 여부 체크
                if trial.should_prune():
                    logger.info(f"Trial {trial.number} pruned at epoch {epoch}")
                    raise optuna.exceptions.TrialPruned()

            result = model.train(
                X_train, y_train,
                X_val, y_val,
                train_config,
                progress_callback=trial_callback
            )
            
            # 목표 지표 선택
            if self.maximize_metric == "accuracy":
                score = result.final_metrics.get("accuracy", 0)
            elif self.maximize_metric == "f1":
                score = result.final_metrics.get("f1_macro", 0)
            elif self.maximize_metric == "return":
                # 기대 수익률 계산 로직이 필요할 수 있으나 일단 accuracy로 대체 또는 metric에서 추출
                score = result.final_metrics.get("accuracy", 0) 
            else:
                score = result.final_metrics.get("accuracy", 0)
                
            return score

        # 3. Study 생성 및 최적화 실행
        direction = "maximize"
        study = optuna.create_study(direction=direction)
        
        # 진행률 보고를 위한 래퍼
        for i in range(self.n_trials):
            study.optimize(objective, n_trials=1)
            if self.progress_callback:
                # 전체 Trial 중 몇 번째인지 보고
                self.progress_callback(i + 1, self.n_trials, {
                    "phase": "optimization",
                    "trial": i + 1,
                    "best_value": study.best_value,
                    "best_params": study.best_params
                })

        logger.info(f"Optimization completed. Best value: {study.best_value}, Best params: {study.best_params}")
        
        return {
            "best_params": study.best_params,
            "best_value": study.best_value,
            "all_trials": [
                {
                    "number": t.number,
                    "value": t.value,
                    "params": t.params,
                    "state": t.state.name
                } for t in study.trials
            ]
        }
