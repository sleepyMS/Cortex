"""
GRU Classifier for Trading Signal Prediction
BUY/HOLD/SELL 3클래스 분류 모델입니다.
LSTM보다 빠르고 가벼우며, 유사한 성능을 제공합니다.
PyTorch로 구현되고 ONNX로 변환됩니다.
"""
import time
import logging
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, confusion_matrix

from .base import BaseAIModel, ModelConfig, TrainingConfig, TrainingResult

logger = logging.getLogger(__name__)


class GRUNetwork(nn.Module):
    """PyTorch GRU 네트워크 아키텍처"""
    
    def __init__(self, config: ModelConfig):
        super().__init__()
        self.config = config
        
        # GRU 레이어 (LSTM보다 파라미터가 적음)
        self.gru = nn.GRU(
            input_size=config.input_size,
            hidden_size=config.hidden_size,
            num_layers=config.num_layers,
            batch_first=True,
            dropout=config.dropout if config.num_layers > 1 else 0,
            bidirectional=config.bidirectional
        )
        
        # FC 레이어
        gru_output_size = config.hidden_size * (2 if config.bidirectional else 1)
        self.dropout = nn.Dropout(config.dropout)
        self.fc = nn.Linear(gru_output_size, config.num_classes)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass
        Args:
            x: (batch_size, sequence_length, input_size)
        Returns:
            logits: (batch_size, num_classes)
        """
        # GRU forward (LSTM과 달리 cell state가 없음)
        gru_out, h_n = self.gru(x)
        
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


class GRUClassifier(BaseAIModel):
    """
    GRU 기반 트레이딩 신호 분류기.
    LSTM보다 파라미터가 적어 학습이 빠르고, 유사한 성능을 제공합니다.
    3클래스 분류: BUY(0), HOLD(1), SELL(2)
    """
    
    model_type = "gru"
    
    def __init__(self):
        self.model: Optional[GRUNetwork] = None
        self.config: Optional[ModelConfig] = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._is_trained = False
        
    def build(self, config: ModelConfig) -> None:
        """모델 아키텍처 구축"""
        self.config = config
        self.model = GRUNetwork(config).to(self.device)
        logger.info(f"GRU model built: {config}")
        
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
        config: Optional[TrainingConfig] = None,
        progress_callback: Optional[callable] = None
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
        
        # 데이터를 Tensor로 변환
        X_train_t = torch.FloatTensor(X_train).to(self.device)
        y_train_t = torch.LongTensor(y_train).to(self.device)
        
        train_dataset = TensorDataset(X_train_t, y_train_t)
        train_loader = DataLoader(
            train_dataset, 
            batch_size=config.batch_size, 
            shuffle=True,
            drop_last=True
        )
        
        # 검증 데이터 준비
        has_validation = X_val is not None and y_val is not None
        if has_validation:
            X_val_t = torch.FloatTensor(X_val).to(self.device)
            y_val_t = torch.LongTensor(y_val).to(self.device)
        
        # 클래스 가중치 계산 (불균형 데이터 처리)
        class_counts = np.bincount(y_train, minlength=3)
        class_weights = 1.0 / (class_counts + 1e-6)
        class_weights = class_weights / class_weights.sum() * 3  # 정규화
        class_weights_t = torch.FloatTensor(class_weights).to(self.device)
        
        # 손실 함수 및 옵티마이저
        criterion = nn.CrossEntropyLoss(weight=class_weights_t)
        optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay
        )
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer,
            mode='min',
            factor=config.scheduler_factor,
            patience=config.scheduler_patience,
            verbose=True
        )
        
        # 학습 기록
        train_loss_history = []
        val_loss_history = []
        best_val_loss = float('inf')
        best_epoch = 0
        patience_counter = 0
        best_model_state = None
        
        logger.info(f"Starting GRU training: {config.epochs} epochs, batch_size={config.batch_size}")
        
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
            if has_validation:
                self.model.eval()
                with torch.no_grad():
                    val_outputs = self.model(X_val_t)
                    val_loss = criterion(val_outputs, y_val_t).item()
                    val_loss_history.append(val_loss)
                    
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
            
            # 진행률 콜백
            if progress_callback:
                metrics = {
                    "train_loss": avg_train_loss,
                    "val_loss": val_loss,
                    "best_val_loss": best_val_loss
                }
                progress_callback(epoch + 1, config.epochs, metrics)
            
            if (epoch + 1) % 10 == 0:
                logger.info(
                    f"Epoch {epoch + 1}/{config.epochs} - "
                    f"Train Loss: {avg_train_loss:.4f}, Val Loss: {val_loss:.4f}"
                )
        
        # 최적 모델 복원
        if best_model_state is not None:
            self.model.load_state_dict(best_model_state)
        
        # 최종 메트릭 계산
        final_metrics = self._compute_metrics(X_val_t, y_val_t) if has_validation else {}
        
        training_time = time.time() - start_time
        self._is_trained = True
        
        logger.info(f"GRU Training completed in {training_time:.2f}s. Best epoch: {best_epoch + 1}")
        
        return TrainingResult(
            train_loss_history=train_loss_history,
            val_loss_history=val_loss_history,
            best_epoch=best_epoch,
            best_val_loss=best_val_loss,
            training_time_seconds=training_time,
            final_metrics=final_metrics
        )
    
    def _compute_metrics(self, X: torch.Tensor, y: torch.Tensor) -> Dict[str, Any]:
        """평가 메트릭 계산"""
        self.model.eval()
        with torch.no_grad():
            outputs = self.model(X)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            preds = outputs.argmax(dim=1).cpu().numpy()
            y_true = y.cpu().numpy()
        
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
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
        
        return probs
    
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
        logger.info(f"GRU Model saved to {save_path}")
    
    def load(self, path: str) -> None:
        """PyTorch 모델 로드"""
        checkpoint = torch.load(path, map_location=self.device)
        self.config = checkpoint['config']
        self.build(self.config)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self._is_trained = checkpoint.get('is_trained', True)
        logger.info(f"GRU Model loaded from {path}")
    
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
        
        # 샘플 입력 생성
        if sample_input_shape is None:
            sample_input_shape = (1, 60, self.config.input_size)  # 기본값
        
        dummy_input = torch.randn(*sample_input_shape).to(self.device)
        
        save_path = Path(path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        
        torch.onnx.export(
            self.model,
            dummy_input,
            str(save_path),
            export_params=True,
            opset_version=14,
            do_constant_folding=True,
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={
                'input': {0: 'batch_size', 1: 'sequence_length'},
                'output': {0: 'batch_size'}
            }
        )
        logger.info(f"GRU Model exported to ONNX: {save_path}")
    
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
