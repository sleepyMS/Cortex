"""
LSTM Classifier for Trading Signal Prediction
BUY/HOLD/SELL 3클래스 분류 모델입니다.
PyTorch로 구현되고 ONNX로 변환됩니다.
"""
import time
import logging
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix

from .base import BaseAIModel, ModelConfig, TrainingConfig, TrainingResult

logger = logging.getLogger(__name__)


class LSTMNetwork(nn.Module):
    """PyTorch LSTM 네트워크 아키텍처"""
    
    def __init__(self, config: ModelConfig):
        super().__init__()
        self.config = config
        
        # LSTM 레이어
        self.lstm = nn.LSTM(
            input_size=config.input_size,
            hidden_size=config.hidden_size,
            num_layers=config.num_layers,
            batch_first=True,
            dropout=config.dropout if config.num_layers > 1 else 0,
            bidirectional=config.bidirectional
        )
        
        # FC 레이어
        lstm_output_size = config.hidden_size * (2 if config.bidirectional else 1)
        self.dropout = nn.Dropout(config.dropout)
        self.fc = nn.Linear(lstm_output_size, config.num_classes)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass
        Args:
            x: (batch_size, sequence_length, input_size)
        Returns:
            logits: (batch_size, num_classes)
        """
        # LSTM forward
        lstm_out, (h_n, c_n) = self.lstm(x)
        
        # 마지막 타임스텝의 출력 사용
        if self.config.bidirectional:
            # 양방향: 마지막 forward + 첫 번째 backward hidden state 연결
            last_hidden = torch.cat([h_n[-2], h_n[-1]], dim=1)
        else:
            last_hidden = h_n[-1]
        
        # Dropout + FC
        out = self.dropout(last_hidden)
        logits = self.fc(out)
        
        return logits


class LSTMClassifier(BaseAIModel):
    """
    LSTM 기반 트레이딩 신호 분류기.
    3클래스 분류: BUY(0), HOLD(1), SELL(2)
    """
    
    model_type = "lstm"
    
    def __init__(self):
        self.model: Optional[LSTMNetwork] = None
        self.config: Optional[ModelConfig] = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._is_trained = False
        
    def build(self, config: ModelConfig) -> None:
        """모델 아키텍처 구축"""
        self.config = config
        self.model = LSTMNetwork(config).to(self.device)
        logger.info(f"LSTM model built: {config}")
        
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
        config: Optional[TrainingConfig] = None,
        progress_callback: Optional[callable] = None,
        labeling_config: Optional[Dict[str, Any]] = None
    ) -> TrainingResult:
        """
        모델 학습
        
        Args:
            X_train: (n_samples, sequence_length, n_features)
            y_train: (n_samples,) - 클래스 레이블 (0, 1, 2)
            X_val: 검증 데이터
            y_val: 검증 레이블
            config: 학습 설정
            progress_callback: 진행률 콜백 함수 (epoch, total_epochs, metrics)
        
        Returns:
            TrainingResult: 학습 결과
        """
        if self.model is None:
            raise ValueError("Model not built. Call build() first.")
        
        config = config or TrainingConfig()
        start_time = time.time()
        
        # 데이터 준비 및 Loss 설정
        is_regression = self.config.task_type == "regression"
        has_validation = X_val is not None and y_val is not None
        
        if is_regression:
            X_train_t = torch.FloatTensor(X_train).to(self.device)
            y_train_t = torch.FloatTensor(y_train).unsqueeze(1).to(self.device) # (N, 1)
            
            # Regression Loss: Huber Loss (Robust to outliers)
            criterion = nn.HuberLoss(delta=1.0)
            
            if has_validation:
                X_val_t = torch.FloatTensor(X_val).to(self.device)
                y_val_t = torch.FloatTensor(y_val).unsqueeze(1).to(self.device)
        else:
            # Classification
            X_train_t = torch.FloatTensor(X_train).to(self.device)
            y_train_t = torch.LongTensor(y_train).to(self.device)
            
            if has_validation:
                X_val_t = torch.FloatTensor(X_val).to(self.device)
                y_val_t = torch.LongTensor(y_val).to(self.device)

            # 클래스 가중치 계산 (불균형 데이터 처리)
            class_counts = np.bincount(y_train, minlength=3)
            class_weights = 1.0 / (class_counts + 1e-6)
            class_weights = class_weights / class_weights.sum() * 3  # 정규화
            class_weights_t = torch.FloatTensor(class_weights).to(self.device)
            
            criterion = nn.CrossEntropyLoss(weight=class_weights_t)
        
        # DataLoader 생성 (공통)
        train_dataset = TensorDataset(X_train_t, y_train_t)
        train_loader = DataLoader(
            train_dataset,
            batch_size=config.batch_size,
            shuffle=True
        )
        
        optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay
        )
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode='min',
            factor=config.scheduler_factor,
            patience=config.scheduler_patience
        )
        
        # 학습 기록
        train_loss_history = []
        val_loss_history = []
        accuracy_history = []
        best_val_loss = float('inf')
        best_epoch = 0
        patience_counter = 0
        best_model_state = None
        
        logger.info(f"Starting training: {config.epochs} epochs, batch_size={config.batch_size}")
        
        for epoch in range(config.epochs):
            # Training
            self.model.train()
            train_losses = []
            
            for batch_X, batch_y in train_loader:
                optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                
                # Gradient clipping
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
                
                optimizer.step()
                train_losses.append(loss.item())
            
            avg_train_loss = np.mean(train_losses)
            train_loss_history.append(avg_train_loss)
            
            # Validation
            acc = 0.0
            if has_validation:
                self.model.eval()
                with torch.no_grad():
                    val_outputs = self.model(X_val_t)
                    val_loss = criterion(val_outputs, y_val_t).item()
                    val_loss_history.append(val_loss)
                    
                    # 정확도/MSE 계산
                    if is_regression:
                        # Calculate RMSE for reporting
                        mse = F.mse_loss(val_outputs, y_val_t).item()
                        rmse_val = np.sqrt(mse)
                        
                        # Calculate Directional Accuracy
                        preds_np = val_outputs.detach().cpu().numpy()
                        targets_np = y_val_t.detach().cpu().numpy()
                        correct_dir = np.sign(preds_np) == np.sign(targets_np)
                        da = float(np.mean(correct_dir))
                        
                        metrics_epoch = {"rmse": rmse_val, "accuracy": da}
                    else:
                        preds = val_outputs.argmax(dim=1).cpu().numpy()
                        acc = float(accuracy_score(y_val_t.cpu().numpy(), preds))
                        metrics_epoch = {"accuracy": acc}
                        accuracy_history.append(acc)
                    
                    # 스케줄러 업데이트
                    scheduler.step(val_loss)
                    
                    # Early stopping 체크
                    if val_loss < best_val_loss:
                        best_val_loss = val_loss
                        best_epoch = epoch
                        patience_counter = 0
                        best_model_state = self.model.state_dict().copy()
                    else:
                        patience_counter += 1
                        
                    if patience_counter >= config.early_stopping_patience:
                        logger.info(f"Early stopping at epoch {epoch + 1}")
                        break
            else:
                val_loss = avg_train_loss
                val_loss_history.append(val_loss)
                accuracy_history.append(0.0)
            
            # 진행률 콜백
            if progress_callback:
                metrics = {
                    "train_loss": avg_train_loss,
                    "val_loss": val_loss,
                    "best_val_loss": best_val_loss,
                    **metrics_epoch
                }
                progress_callback(epoch + 1, config.epochs, metrics)
            
            # Log every epoch for debugging
            if is_regression:
                metric_str = f"RMSE: {metrics_epoch.get('rmse', 0.0):.4f}"
            else:
                metric_str = f"Accuracy: {acc:.4f}"
                
            logger.info(
                f"Epoch {epoch + 1}/{config.epochs} - "
                f"Train Loss: {avg_train_loss:.4f}, Val Loss: {val_loss:.4f}, "
                f"{metric_str}, "
                f"Best Val Loss: {best_val_loss:.4f}, Patience: {patience_counter}/{config.early_stopping_patience}"
            )
        
        # 최적 모델 복원
        if best_model_state is not None:
            self.model.load_state_dict(best_model_state)
        
        # 최종 메트릭 계산
        final_metrics = self._compute_metrics(X_val_t, y_val_t, labeling_config) if has_validation else {}
        
        training_time = time.time() - start_time
        self._is_trained = True
        
        logger.info(f"Training completed in {training_time:.2f}s. Best epoch: {best_epoch + 1}")
        
        return TrainingResult(
            train_loss_history=train_loss_history,
            val_loss_history=val_loss_history,
            best_epoch=best_epoch,
            best_val_loss=best_val_loss,
            training_time_seconds=training_time,
            final_metrics=final_metrics,
            accuracy_history=accuracy_history
        )
    
    def _compute_metrics(self, X: torch.Tensor, y: torch.Tensor, labeling_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """평가 메트릭 계산 (분류/회귀 분기 처리)"""
        self.model.eval()
        with torch.no_grad():
            outputs = self.model(X)
            
            if self.config.task_type == "regression":
                preds = outputs.cpu().numpy().flatten()
                y_true = y.cpu().numpy().flatten()
                
                # Regression Metrics
                mse = np.mean((y_true - preds) ** 2)
                rmse = np.sqrt(mse)
                mae = np.mean(np.abs(y_true - preds))
                
                # R2 Score
                ss_res = np.sum((y_true - preds) ** 2)
                ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
                r2 = 1 - (ss_res / (ss_tot + 1e-8))
                
                # Directional Accuracy (DA)
                # 실제 방향과 예측 방향이 일치하는 비율
                # 주의: y_true가 수익률(Return)이라고 가정
                correct_direction = np.sign(y_true) == np.sign(preds)
                da = np.mean(correct_direction)
                
                # Information Coefficient (IC) - Spearman Correlation
                if len(preds) > 1:
                    from scipy.stats import spearmanr
                    ic, _ = spearmanr(y_true, preds)
                else:
                    ic = 0.0
                
                return {
                    "rmse": float(rmse),
                    "mae": float(mae),
                    "r2": float(r2),
                    "directional_accuracy": float(da),
                    "ic": float(ic)
                }
                
            else:
                # Classification Metrics
                probs = torch.softmax(outputs, dim=1).cpu().numpy()
                preds = outputs.argmax(dim=1).cpu().numpy()
                y_true = y.cpu().numpy()
            
                # Expected Return 계산
                profit_target = labeling_config.get("profitTarget", 0.02) if labeling_config else 0.02
                stop_loss = labeling_config.get("stopLoss", 0.01) if labeling_config else 0.01
                
                total_return = 0.0
                trade_count = 0
                
                for pred, true_label in zip(preds, y_true):
                    if pred == 0:  # BUY 예측
                        trade_count += 1
                        if true_label == 0:  # 실제 BUY → 맞음
                            total_return += profit_target
                        else:  # 틀림
                            total_return -= stop_loss
                    elif pred == 2:  # SELL 예측
                        trade_count += 1
                        if true_label == 2:  # 실제 SELL → 맞음
                            total_return += profit_target
                        else:  # 틀림
                            total_return -= stop_loss
                    # HOLD(1) 예측은 거래 안함 → 수익도 손실도 0
                
                # 평균 기대 수익률 (트레이드 당)
                expected_return_per_trade = total_return / max(trade_count, 1)
                
                return {
                    "accuracy": float(accuracy_score(y_true, preds)),
                    "f1_macro": float(f1_score(y_true, preds, average='macro', zero_division=0)),
                    "f1_per_class": {
                        "buy": float(f1_score(y_true, preds, labels=[0], average='micro', zero_division=0)),
                        "hold": float(f1_score(y_true, preds, labels=[1], average='micro', zero_division=0)),
                        "sell": float(f1_score(y_true, preds, labels=[2], average='micro', zero_division=0)),
                    },
                    "precision_macro": float(precision_score(y_true, preds, average='macro', zero_division=0)),
                    "recall_macro": float(recall_score(y_true, preds, average='macro', zero_division=0)),
                    "confusion_matrix": confusion_matrix(y_true, preds).tolist(),
                    "expected_return": float(total_return),  # 총 기대 수익률
                    "expected_return_per_trade": float(expected_return_per_trade),  # 트레이드 당 기대 수익률
                    "trade_count": int(trade_count),  # 총 거래 횟수
                }
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        예측 수행 (클래스 확률 반환)
        
        Args:
            X: (n_samples, sequence_length, n_features)
        
        Returns:
            probs: (n_samples, 3) - 각 클래스별 확률
        """
        if not self._is_trained:
            raise ValueError("Model not trained. Call train() first.")
        
        self.model.eval()
        X_t = torch.FloatTensor(X).to(self.device)
        
        with torch.no_grad():
            outputs = self.model(X_t)
        if self.config.task_type == "regression":
            # Regression: Return raw values (or clipped/scaled if needed)
            return outputs.cpu().numpy()
        else:
            # Classification: Softmax
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            return probs
            
    def predict_with_uncertainty(self, X: np.ndarray, n_iter: int = 10) -> Dict[str, np.ndarray]:
        """
        MC Dropout을 이용한 불확실성 추정 (Regression 전용)
        
        Args:
            X: 입력 데이터
            n_iter: 샘플링 횟수
            
        Returns:
            Dict containing:
            - mean: 평균 예측값 (N, 1)
            - std: 표준편차 (불확실성) (N, 1)
            - lower_bound: 95% 신뢰구간 하한 (Mean - 1.96*Std)
            - upper_bound: 95% 신뢰구간 상한 (Mean + 1.96*Std)
        """
        if not self._is_trained:
            raise ValueError("Model not trained")
            
        self.model.train() # Enable Dropout
        # 주의: train() 모드는 BatchNorm도 학습 모드로 바꾸지만, 
        # 여기선 instance_norm이나 layer_norm을 쓰는게 안전함.
        # LSTM엔 보통 BN이 없거나 LayerNorm을 씀.
        # 더 안전한 방법은 eval() 후 dropout 페이즈만 켜는 것이나,
        # 편의상 train() 사용 (배치 사이즈 1 추론 시엔 BN 있으면 문제될 수 있음)
        
        X_t = torch.FloatTensor(X).to(self.device)
        predictions = []
        
        with torch.no_grad():
            for _ in range(n_iter):
                out = self.model(X_t)
                predictions.append(out.cpu().numpy())
        
        # (n_iter, n_samples, output_dim)
        predictions = np.array(predictions)
        
        mean_pred = np.mean(predictions, axis=0)
        std_pred = np.std(predictions, axis=0)
        
        return {
            "mean": mean_pred,
            "std": std_pred,
            "lower_bound": mean_pred - 1.96 * std_pred,
            "upper_bound": mean_pred + 1.96 * std_pred
        }
    
    def predict_classes(self, X: np.ndarray) -> np.ndarray:
        """예측 클래스 반환 (0=BUY, 1=HOLD, 2=SELL)"""
        probs = self.predict(X)
        return probs.argmax(axis=1)
    
    def save(self, path: str) -> None:
        """PyTorch 모델 저장"""
        if self.model is None:
            raise ValueError("No model to save")
        
        save_path = Path(path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'config': self.config,
            'is_trained': self._is_trained,
        }, save_path)
        logger.info(f"Model saved to {save_path}")
    
    def load(self, path: str) -> None:
        """PyTorch 모델 로드"""
        checkpoint = torch.load(path, map_location=self.device)
        self.config = checkpoint['config']
        self.build(self.config)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self._is_trained = checkpoint.get('is_trained', True)
        logger.info(f"Model loaded from {path}")
    
    def to_onnx(self, path: str, sample_input_shape: Optional[Tuple[int, ...]] = None) -> None:
        """
        ONNX 포맷으로 변환 및 저장
        
        Args:
            path: 저장 경로 (.onnx)
            sample_input_shape: (batch_size, sequence_length, input_size)
        """
        if self.model is None:
            raise ValueError("No model to export")
        
        self.model.eval()
        
        # 샘플 입력 생성 - batch_size=1로 고정 (LSTM 호환성)
        if sample_input_shape is None:
            sample_input_shape = (1, 60, self.config.input_size)
        else:
            # batch_size를 항상 1로 강제 (LSTM hidden state 경고 방지)
            sample_input_shape = (1, sample_input_shape[1], sample_input_shape[2])
        
        dummy_input = torch.randn(*sample_input_shape).to(self.device)
        
        save_path = Path(path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        
        # LSTM의 경우 batch_size를 동적으로 하면 hidden state 관련 경고 발생
        # 예측 시 항상 batch_size=1을 사용하므로 동적 axes 제거
        torch.onnx.export(
            self.model,
            dummy_input,
            str(save_path),
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamo=False  # Use legacy export for compatibility
        )
        logger.info(f"Model exported to ONNX: {save_path}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """모델 정보 반환"""
        info = super().get_model_info()
        if self.config:
            info.update({
                "input_size": self.config.input_size,
                "hidden_size": self.config.hidden_size,
                "num_layers": self.config.num_layers,
                "dropout": self.config.dropout,
                "bidirectional": self.config.bidirectional,
                "is_trained": self._is_trained,
            })
        if self.model:
            info["num_parameters"] = sum(p.numel() for p in self.model.parameters())
        return info
