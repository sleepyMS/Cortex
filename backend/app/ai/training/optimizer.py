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
        progress_callback: Optional[Callable[[int, int, Dict], None]] = None,
        best_model_dir: Optional[str] = None
    ):
        self.config = config
        self.opt_config = optimization_config
        self.progress_callback = progress_callback
        self.best_model_dir = best_model_dir
        self.best_value = -float('inf')
        
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
        if self.config.task_type == "regression":
            from ..labeling.regression_labeling import RegressionLabeler, RegressionLabelingConfig
            labeling_params = self.config.labeling_config.copy()
            # Filter params for RegressionLabelingConfig
            accepted_keys = {'target_type', 'horizon', 'use_log_returns'}
            filtered_params = {k: v for k, v in labeling_params.items() if k in accepted_keys}
            labeler = RegressionLabeler(RegressionLabelingConfig(**filtered_params))
        else:
            from ..labeling.triple_barrier import TripleBarrierLabeler, TripleBarrierConfig
            labeling_params = self.config.labeling_config.copy()
            if 'method' in labeling_params: del labeling_params['method']
            labeler = TripleBarrierLabeler(TripleBarrierConfig(**labeling_params))
        
        labels = labeler.generate_labels(df)
        
        # Step 1.5: Regression 모델을 위한 RobustScaler 자동 적용
        if self.config.task_type == "regression":
            original_norm = self.config.feature_config.get("normalization", "rolling_zscore")
            if original_norm != "robust":
                self.config.feature_config["normalization"] = "robust"
                logger.info(f"Regression mode: Auto-applying RobustScaler (was: {original_norm})")
        
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
                dropout=dropout,
                task_type=self.config.task_type
            )
            
            # 자동 최적화 모드에서는 optimizationConfig의 maxEpochsPerTrial만 사용
            # (trainingConfig.epochs는 수동 모드 전용이므로 여기서 참조하지 않음)
            trial_epochs = self.opt_config.get("max_epochs_per_trial") or self.opt_config.get("maxEpochsPerTrial") or 30 
            
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
                progress_callback=trial_callback,
                labeling_config=self.config.labeling_config
            )
            
            # 목표 지표 선택
            if self.maximize_metric == "accuracy":
                score = result.final_metrics.get("accuracy", 0)
            elif self.maximize_metric == "f1":
                score = result.final_metrics.get("f1_macro", 0)
            elif self.maximize_metric == "return":
                score = result.final_metrics.get("expected_return", 0)
            elif self.maximize_metric == "rmse":
                 # RMSE는 Minimize 대상이므로 음수로 변환하여 Maximize 문제로 취급하거나
                 # Optuna direction을 minimize로 설정해야 함.
                 score = -result.final_metrics.get("rmse", float('inf'))
            elif self.maximize_metric == "r2":
                 score = result.final_metrics.get("r2", -float('inf'))
            else:
                score = result.final_metrics.get("accuracy", 0)
            
            # Best Score 갱신 시 모델 저장
            if score > self.best_value:
                self.best_value = score
                if self.best_model_dir:
                    import json
                    from pathlib import Path
                    
                    try:
                        save_path = Path(self.best_model_dir)
                        save_path.mkdir(parents=True, exist_ok=True)
                        
                        # 1. PyTorch 모델 저장
                        model.save(str(save_path / "model.pt"))
                        
                        # 2. ONNX export (sample input shape 필요)
                        # FeatureConfig에서 sequence_length 가져오기
                        seq_len = self.config.feature_config.get("sequence_length", 60)
                        # Batch size 1로 설정하여 export
                        model.to_onnx(str(save_path / "model.onnx"), (1, seq_len, input_size))
                        
                        # 3. Metrics 저장
                        with open(save_path / "training_result.json", "w") as f:
                            # datetime 객체 등을 문자열로 변환처리 필요할 수 있음
                            json.dump(asdict(result), f, default=str)
                            
                        # 4. Feature Config 저장 (Predictor 초기화용)
                        # feature_store_config는 optimize() 시작 시 fit_transform에서 생성됨
                        with open(save_path / "config.json", "w") as f:
                            json.dump(feature_store_config, f, indent=2, default=str)
                        
                        # 5. Feature Importance 계산 및 저장
                        feature_names = feature_store_config.get("feature_order", [])
                        feature_importance = self._calculate_feature_importance(model, X_val, feature_names)
                        with open(save_path / "feature_importance.json", "w") as f:
                            json.dump(feature_importance, f, indent=2)
                            
                        logger.info(f"New best model saved at trial {trial.number} (score: {score:.4f})")
                    except Exception as e:
                        logger.error(f"Failed to save best model artifacts: {e}")
                
            return score

        # 3. Study 생성 및 최적화 실행
        direction = "maximize"
        study = optuna.create_study(direction=direction)
        
        # 진행률 보고를 위한 래퍼
        for i in range(self.n_trials):
            # 트라이얼 시작 전 진행 상황 보고 (현재 진행 중인 트라이얼 번호)
            if self.progress_callback:
                self.progress_callback(i, self.n_trials, {
                    "phase": "optimization",
                    "trial": i + 1,  # 1-indexed (진행 중인 트라이얼)
                    "best_value": study.best_value if study.trials else 0.0,
                    "best_params": study.best_params if study.trials else {}
                })
            
            study.optimize(objective, n_trials=1)

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

    def _calculate_feature_importance(self, model, X_val: np.ndarray, feature_names: list) -> Dict[str, float]:
        """Integrated Gradients를 사용한 피처 중요도 계산"""
        try:
            import torch
            from captum.attr import IntegratedGradients
            
            # 모델 평가 모드
            model.model.eval()
            
            # 1. 샘플링 (Validation Data 중 최대 20개 - 메모리 절약)
            n_samples = min(20, len(X_val))
            if n_samples == 0 or len(feature_names) == 0:
                logger.warning(f"Skipping feature importance: samples={n_samples}, features={len(feature_names)}")
                return {}
                
            # 랜덤 샘플링
            indices = np.random.choice(len(X_val), n_samples, replace=False)
            X_sample = torch.tensor(X_val[indices], dtype=torch.float32).to(model.device)
            
            # 2. Baseline (Zero tensor)
            baseline = torch.zeros_like(X_sample)
            
            # 3. Integrated Gradients 인스턴스
            ig = IntegratedGradients(model.model)
            
            # 4. 중요도 계산
            # Target 설정:
            # - 분류(Classification): target class index (e.g., 2=Buy)
            # - 회귀(Regression): 0 (output is scalar)
            
            if self.config.task_type == "regression":
                target_idx = 0
            else:
                # Triple Barrier Labeler: 2 = Buy (Assume)
                target_idx = 2 
            
            attributions, delta = ig.attribute(
                inputs=X_sample,
                baselines=baseline,
                target=target_idx,
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
