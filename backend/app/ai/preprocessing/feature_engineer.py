"""
Feature Engineering for AI Models
OHLCV 데이터에서 기술적 지표를 계산하고 학습용 시퀀스를 생성합니다.
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class FeatureConfig:
    """피처 설정"""
    sequence_length: int = 60  # 시퀀스 길이 (60봉 = 60시간)
    
    # 기본 OHLCV 피처
    use_ohlcv: bool = True
    ohlcv_columns: List[str] = field(default_factory=lambda: ["open", "high", "low", "close", "volume"])
    
    # 기술적 지표
    indicators: List[Dict[str, Any]] = field(default_factory=list)
    
    # 정규화 설정
    normalization: str = "rolling_zscore"  # "zscore", "rolling_zscore", "minmax", "none"
    rolling_window: int = 100  # rolling 정규화 시 윈도우 크기
    
    # 추가 피처
    use_returns: bool = True    # 수익률
    use_log_returns: bool = True  # 로그 수익률
    

class FeatureEngineer:
    """
    OHLCV 데이터에서 피처를 추출하고 학습용 시퀀스를 생성합니다.
    
    Feature Store 개념:
    - 학습 시 생성된 피처 순서와 정규화 파라미터를 저장
    - 추론 시 동일한 순서로 피처를 재현
    """
    
    def __init__(self, config: Optional[FeatureConfig] = None):
        self.config = config or FeatureConfig()
        
        # Feature Store - 학습 시 저장되는 메타데이터
        self._feature_order: List[str] = []
        self._normalization_params: Dict[str, Dict[str, float]] = {}
        self._is_fitted = False
        
    def fit_transform(
        self, 
        df: pd.DataFrame,
        labels: Optional[pd.Series] = None
    ) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        학습 데이터에 대해 피처를 추출하고 시퀀스를 생성합니다.
        
        Args:
            df: OHLCV 데이터프레임
            labels: 레이블 시리즈 (TripleBarrier 결과)
            
        Returns:
            X: (n_samples, sequence_length, n_features) 형태의 입력 데이터
            y: (n_samples,) 형태의 레이블
            feature_config: Feature Store에 저장할 설정
        """
        # 1. 피처 생성
        feature_df = self._create_features(df)
        
        # 2. 피처 순서 저장 (Feature Store)
        self._feature_order = feature_df.columns.tolist()
        
        # 3. 정규화
        normalized_df = self._normalize(feature_df, fit=True)
        
        # 4. NaN 처리 (롤링 계산으로 인한 초기 NaN)
        valid_start_idx = self.config.rolling_window + self.config.sequence_length
        normalized_df = normalized_df.iloc[valid_start_idx:].reset_index(drop=True)
        
        if labels is not None:
            labels = labels.iloc[valid_start_idx:].reset_index(drop=True)
        
        # 5. 시퀀스 생성
        X = self._create_sequences(normalized_df.values)
        
        # 6. 레이블 정렬 (시퀀스 생성으로 인해 앞부분 제거)
        if labels is not None:
            y = labels.values[self.config.sequence_length - 1:]
            # X와 y 길이 맞추기
            min_len = min(len(X), len(y))
            X = X[:min_len]
            y = y[:min_len]
        else:
            y = np.array([])
        
        self._is_fitted = True
        
        logger.info(f"Feature engineering completed: X shape={X.shape}, y shape={y.shape}")
        logger.info(f"Features: {self._feature_order}")
        
        # Feature Store 설정 반환
        feature_store_config = self.get_feature_store_config()
        
        return X, y, feature_store_config
    
    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """
        추론용 데이터를 변환합니다 (학습된 설정 사용).
        
        Args:
            df: OHLCV 데이터프레임
            
        Returns:
            X: (n_samples, sequence_length, n_features)
        """
        if not self._is_fitted:
            raise ValueError("FeatureEngineer not fitted. Call fit_transform() first.")
        
        # 1. 피처 생성
        feature_df = self._create_features(df)
        
        # 2. 저장된 순서로 피처 정렬
        feature_df = feature_df[self._feature_order]
        
        # 3. 정규화 (저장된 파라미터 사용)
        normalized_df = self._normalize(feature_df, fit=False)
        
        # 4. NaN 처리
        normalized_df = normalized_df.dropna()
        
        # 5. 시퀀스 생성
        X = self._create_sequences(normalized_df.values)
        
        return X
    
    def _create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """피처 생성"""
        features = pd.DataFrame(index=df.index)
        
        # 1. OHLCV 피처
        if self.config.use_ohlcv:
            for col in self.config.ohlcv_columns:
                if col in df.columns:
                    features[col] = df[col]
        
        # 2. 수익률 피처
        if self.config.use_returns:
            features['returns'] = df['close'].pct_change()
        
        if self.config.use_log_returns:
            features['log_returns'] = np.log(df['close'] / df['close'].shift(1))
        
        # 3. 기술적 지표
        for indicator in self.config.indicators:
            indicator_type = indicator.get('type', '').upper()
            params = indicator.get('params', {})
            
            if indicator_type == 'RSI':
                period = params.get('period', 14)
                features[f'RSI_{period}'] = self._calculate_rsi(df['close'], period)
                
            elif indicator_type == 'EMA':
                period = params.get('period', 20)
                features[f'EMA_{period}'] = df['close'].ewm(span=period, adjust=False).mean()
                
            elif indicator_type == 'SMA':
                period = params.get('period', 20)
                features[f'SMA_{period}'] = df['close'].rolling(window=period).mean()
                
            elif indicator_type == 'MACD':
                fast = params.get('fast', 12)
                slow = params.get('slow', 26)
                signal = params.get('signal', 9)
                macd_line, signal_line, histogram = self._calculate_macd(df['close'], fast, slow, signal)
                features['MACD'] = macd_line
                features['MACD_signal'] = signal_line
                features['MACD_hist'] = histogram
                
            elif indicator_type == 'BB':  # Bollinger Bands
                period = params.get('period', 20)
                std = params.get('std', 2)
                upper, middle, lower = self._calculate_bollinger(df['close'], period, std)
                features['BB_upper'] = upper
                features['BB_middle'] = middle
                features['BB_lower'] = lower
                features['BB_width'] = (upper - lower) / middle
                
            elif indicator_type == 'ATR':
                period = params.get('period', 14)
                features[f'ATR_{period}'] = self._calculate_atr(df, period)
                
            elif indicator_type == 'VOLUME_SMA':
                period = params.get('period', 20)
                features[f'volume_sma_{period}'] = df['volume'].rolling(window=period).mean()
                features['volume_ratio'] = df['volume'] / features[f'volume_sma_{period}']
        
        return features
    
    def _normalize(self, df: pd.DataFrame, fit: bool = True) -> pd.DataFrame:
        """데이터 정규화"""
        df = df.copy()
        
        if self.config.normalization == "none":
            return df
        
        elif self.config.normalization == "rolling_zscore":
            # 롤링 Z-score 정규화 (온라인 학습 친화적)
            window = self.config.rolling_window
            for col in df.columns:
                rolling_mean = df[col].rolling(window=window).mean()
                rolling_std = df[col].rolling(window=window).std()
                df[col] = (df[col] - rolling_mean) / (rolling_std + 1e-8)
            return df
        
        elif self.config.normalization == "zscore":
            # 전체 Z-score 정규화
            if fit:
                self._normalization_params = {}
                for col in df.columns:
                    mean = df[col].mean()
                    std = df[col].std()
                    self._normalization_params[col] = {'mean': mean, 'std': std}
                    df[col] = (df[col] - mean) / (std + 1e-8)
            else:
                for col in df.columns:
                    params = self._normalization_params.get(col, {'mean': 0, 'std': 1})
                    df[col] = (df[col] - params['mean']) / (params['std'] + 1e-8)
            return df
        
        elif self.config.normalization == "minmax":
            if fit:
                self._normalization_params = {}
                for col in df.columns:
                    min_val = df[col].min()
                    max_val = df[col].max()
                    self._normalization_params[col] = {'min': min_val, 'max': max_val}
                    df[col] = (df[col] - min_val) / (max_val - min_val + 1e-8)
            else:
                for col in df.columns:
                    params = self._normalization_params.get(col, {'min': 0, 'max': 1})
                    df[col] = (df[col] - params['min']) / (params['max'] - params['min'] + 1e-8)
            return df
        
        return df
    
    def _create_sequences(self, data: np.ndarray) -> np.ndarray:
        """시계열 시퀀스 생성"""
        seq_len = self.config.sequence_length
        n_samples = len(data) - seq_len + 1
        n_features = data.shape[1]
        
        X = np.zeros((n_samples, seq_len, n_features))
        
        for i in range(n_samples):
            X[i] = data[i:i + seq_len]
        
        return X
    
    # 기술적 지표 계산 함수들
    def _calculate_rsi(self, prices: pd.Series, period: int) -> pd.Series:
        """RSI 계산"""
        delta = prices.diff()
        gain = delta.where(delta > 0, 0).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / (loss + 1e-8)
        return 100 - (100 / (1 + rs))
    
    def _calculate_macd(
        self, prices: pd.Series, fast: int, slow: int, signal: int
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """MACD 계산"""
        ema_fast = prices.ewm(span=fast, adjust=False).mean()
        ema_slow = prices.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram
    
    def _calculate_bollinger(
        self, prices: pd.Series, period: int, std_dev: float
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Bollinger Bands 계산"""
        middle = prices.rolling(window=period).mean()
        std = prices.rolling(window=period).std()
        upper = middle + (std * std_dev)
        lower = middle - (std * std_dev)
        return upper, middle, lower
    
    def _calculate_atr(self, df: pd.DataFrame, period: int) -> pd.Series:
        """ATR 계산"""
        high = df['high']
        low = df['low']
        close = df['close'].shift(1)
        
        tr1 = high - low
        tr2 = abs(high - close)
        tr3 = abs(low - close)
        tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        return tr.rolling(window=period).mean()
    
    def get_feature_store_config(self) -> Dict[str, Any]:
        """Feature Store에 저장할 설정 반환"""
        return {
            "sequence_length": self.config.sequence_length,
            "feature_order": self._feature_order,
            "normalization": {
                "method": self.config.normalization,
                "rolling_window": self.config.rolling_window,
                "params": self._normalization_params,
            },
            "indicators": self.config.indicators,
            "use_ohlcv": self.config.use_ohlcv,
            "ohlcv_columns": self.config.ohlcv_columns,
            "use_returns": self.config.use_returns,
            "use_log_returns": self.config.use_log_returns,
        }
    
    def load_feature_store_config(self, config: Dict[str, Any]) -> None:
        """Feature Store에서 설정 로드"""
        self._feature_order = config.get("feature_order", [])
        self._normalization_params = config.get("normalization", {}).get("params", {})
        
        self.config.sequence_length = config.get("sequence_length", 60)
        self.config.normalization = config.get("normalization", {}).get("method", "rolling_zscore")
        self.config.rolling_window = config.get("normalization", {}).get("rolling_window", 100)
        self.config.indicators = config.get("indicators", [])
        self.config.use_ohlcv = config.get("use_ohlcv", True)
        self.config.ohlcv_columns = config.get("ohlcv_columns", ["open", "high", "low", "close", "volume"])
        self.config.use_returns = config.get("use_returns", True)
        self.config.use_log_returns = config.get("use_log_returns", True)
        
        self._is_fitted = True
        logger.info(f"Feature store config loaded: {len(self._feature_order)} features")
