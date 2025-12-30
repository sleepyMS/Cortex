"""
Regression Labeling Method
회귀(Regression) 모델을 위한 레이블링 로직을 구현합니다.
"""
import logging
from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class RegressionLabelingConfig:
    """회귀 레이블링 설정"""
    target_type: str = "return_pct"  # "return_pct", "price_change", "volatility"
    horizon: int = 24                # 예측 대상 시간 (예: 24시간 후)
    use_log_returns: bool = True     # 수익률 계산 시 로그 수익률 사용 여부


class RegressionLabeler:
    """
    회귀 작업을 위한 연속형 레이블 생성.
    
    지원하는 Target Types:
    1. return_pct: horizon 이후의 수익률 (로그 수익률 권장)
    2. price_change: horizon 이후의 가격 변동폭 (절대값)
    3. volatility: 향후 horizon 기간 동안의 변동성 (표준편차)
    """
    
    def __init__(self, config: Optional[RegressionLabelingConfig] = None):
        self.config = config or RegressionLabelingConfig()

    def generate_labels(self, df: pd.DataFrame, price_col: str = "close") -> pd.Series:
        """
        Args:
            df: OHLCV 데이터프레임
            price_col: 가격 컬럼명
            
        Returns:
            labels: 연속형 값 시리즈
        """
        prices = df[price_col]
        
        if self.config.target_type == "return_pct":
            labels = self._calculate_returns(prices)
        elif self.config.target_type == "price_change":
            labels = self._calculate_price_change(prices)
        elif self.config.target_type == "volatility":
            labels = self._calculate_volatility(prices)
        else:
            raise ValueError(f"Unknown target_type: {self.config.target_type}")
            
        return labels.rename("label")

    def _calculate_returns(self, prices: pd.Series) -> pd.Series:
        """
        Horizon 기간 이후의 수익률 계산
        """
        if self.config.use_log_returns:
            # 로그 수익률: ln(P_t+h / P_t) = ln(P_t+h) - ln(P_t)
            # shift(-h)는 미래 데이터를 현재로 가져옴
            future_prices = prices.shift(-self.config.horizon)
            # 로그 수익률은 가산성이 있어 통계적으로 더 안정적임
            labels = np.log(future_prices / prices)
        else:
            # 단순 수익률: (P_t+h - P_t) / P_t
            labels = prices.pct_change(periods=self.config.horizon).shift(-self.config.horizon)
            
        return labels

    def _calculate_price_change(self, prices: pd.Series) -> pd.Series:
        """
        Horizon 기간 이후의 단순 가격 변동폭
        주의: 가격 수준에 따라 스케일이 달라지므로 정규화 필수
        """
        future_prices = prices.shift(-self.config.horizon)
        return future_prices - prices

    def _calculate_volatility(self, prices: pd.Series) -> pd.Series:
        """
        향후 Horizon 기간 동안의 수익률 변동성 (Rolling Std Dev)
        """
        # 1. 1기간 로그 수익률 계산
        log_rets = np.log(prices / prices.shift(1))
        
        # 2. 미래 Horizon 기간의 변동성 계산
        # rolling은 과거 데이터를 보므로, 미래를 보려면 shift가 필요
        # 현재 시점 t에서, t+1 ~ t+h의 변동성을 알고 싶음
        # shift(-horizon)을 하면 t 시점에 t+1 ~ t+h의 데이터가 윈도우에 들어오게 조정
        
        indexer = pd.api.indexers.FixedForwardWindowIndexer(window_size=self.config.horizon)
        volatility = log_rets.rolling(window=indexer).std()
        
        return volatility


def apply_regression_labels(
    df: pd.DataFrame,
    target_type: str = "return_pct",
    horizon: int = 24,
    use_log_returns: bool = True,
    price_col: str = "close"
) -> pd.DataFrame:
    """Helper function to apply regression labels"""
    config = RegressionLabelingConfig(
        target_type=target_type,
        horizon=horizon,
        use_log_returns=use_log_returns
    )
    labeler = RegressionLabeler(config)
    df = df.copy()
    df["label"] = labeler.generate_labels(df, price_col)
    return df
