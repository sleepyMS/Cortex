"""
Triple Barrier Labeling Method
Marcos López de Prado의 Triple Barrier Method를 구현합니다.
트레이딩에 적합한 레이블을 자동 생성합니다.
"""
import logging
from typing import Tuple, Optional
from dataclasses import dataclass
from enum import IntEnum

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class Label(IntEnum):
    """트레이딩 레이블"""
    BUY = 0   # 매수 신호 (가격 상승 예상)
    HOLD = 1  # 관망 신호
    SELL = 2  # 매도 신호 (가격 하락 예상)


@dataclass
class TripleBarrierConfig:
    """Triple Barrier 설정"""
    horizon: int = 24              # 최대 대기 시간 (봉 개수, 1h 기준 24 = 24시간)
    profit_target: float = 0.02   # Take Profit 비율 (2%)
    stop_loss: float = 0.01       # Stop Loss 비율 (1%)
    
    # HOLD 영역 설정 (TP/SL 사이 작은 움직임은 HOLD)
    hold_threshold: float = 0.005  # ±0.5% 이내 움직임은 HOLD
    
    # 시간 만료 시 처리 방법
    # "return" - 누적 수익률로 판단, "hold" - 무조건 HOLD
    expiry_method: str = "return"


class TripleBarrierLabeler:
    """
    Triple Barrier Method로 레이블 생성.
    
    Triple Barrier 개념:
    1. 상단 장벽 (Take Profit): 수익 목표 도달 → BUY (0)
    2. 하단 장벽 (Stop Loss): 손실 한계 도달 → SELL (2)
    3. 시간 장벽 (Horizon): 시간 만료 시 누적 수익률로 판단
    
    예시 (1시간봉, horizon=24):
    - 현재 시점에서 24시간 내에 +2% 먼저 도달 → BUY
    - 현재 시점에서 24시간 내에 -1% 먼저 도달 → SELL
    - 24시간 동안 둘 다 미도달 시 최종 수익률로 판단
    """
    
    def __init__(self, config: Optional[TripleBarrierConfig] = None):
        self.config = config or TripleBarrierConfig()
        
    def generate_labels(self, df: pd.DataFrame, price_col: str = "close") -> pd.Series:
        """
        전체 데이터프레임에 대해 레이블 생성
        
        Args:
            df: OHLCV 데이터프레임
            price_col: 가격 컬럼명
            
        Returns:
            labels: 레이블 시리즈 (0=BUY, 1=HOLD, 2=SELL)
        """
        prices = df[price_col].values
        n = len(prices)
        labels = np.full(n, Label.HOLD, dtype=np.int64)
        
        logger.info(f"Generating labels for {n} samples with config: {self.config}")
        
        for i in range(n - self.config.horizon):
            labels[i] = self._get_label_at_index(prices, i)
        
        # 마지막 horizon개 샘플은 미래 데이터 부족으로 레이블링 불가 → HOLD
        labels[-(self.config.horizon):] = Label.HOLD
        
        # 레이블 분포 로깅
        unique, counts = np.unique(labels, return_counts=True)
        dist = dict(zip([Label(u).name for u in unique], counts))
        logger.info(f"Label distribution: {dist}")
        
        return pd.Series(labels, index=df.index, name="label")
    
    def _get_label_at_index(self, prices: np.ndarray, idx: int) -> int:
        """
        특정 인덱스에서의 레이블 계산
        
        Args:
            prices: 전체 가격 배열
            idx: 현재 인덱스
            
        Returns:
            label: 0(BUY), 1(HOLD), 2(SELL)
        """
        entry_price = prices[idx]
        horizon = self.config.horizon
        
        # 미래 가격들
        future_prices = prices[idx + 1 : idx + 1 + horizon]
        
        if len(future_prices) == 0:
            return Label.HOLD
        
        # 수익률 계산
        returns = (future_prices - entry_price) / entry_price
        
        # 상단 장벽 (Take Profit) 도달 시점 찾기
        tp_hits = np.where(returns >= self.config.profit_target)[0]
        tp_time = tp_hits[0] if len(tp_hits) > 0 else np.inf
        
        # 하단 장벽 (Stop Loss) 도달 시점 찾기
        sl_hits = np.where(returns <= -self.config.stop_loss)[0]
        sl_time = sl_hits[0] if len(sl_hits) > 0 else np.inf
        
        # 어느 장벽이 먼저 도달했는지 확인
        if tp_time < sl_time and tp_time != np.inf:
            # Take Profit 먼저 도달 → BUY
            return Label.BUY
        elif sl_time < tp_time and sl_time != np.inf:
            # Stop Loss 먼저 도달 → SELL
            return Label.SELL
        else:
            # 시간 만료 - 최종 수익률로 판단
            if self.config.expiry_method == "return":
                final_return = returns[-1] if len(returns) > 0 else 0
                
                if final_return >= self.config.hold_threshold:
                    return Label.BUY
                elif final_return <= -self.config.hold_threshold:
                    return Label.SELL
                else:
                    return Label.HOLD
            else:
                return Label.HOLD
    
    def get_label_stats(self, labels: pd.Series) -> dict:
        """레이블 통계 반환"""
        counts = labels.value_counts().to_dict()
        total = len(labels)
        
        return {
            "total_samples": total,
            "buy_count": counts.get(Label.BUY, 0),
            "hold_count": counts.get(Label.HOLD, 0),
            "sell_count": counts.get(Label.SELL, 0),
            "buy_ratio": counts.get(Label.BUY, 0) / total if total > 0 else 0,
            "hold_ratio": counts.get(Label.HOLD, 0) / total if total > 0 else 0,
            "sell_ratio": counts.get(Label.SELL, 0) / total if total > 0 else 0,
        }


def apply_triple_barrier(
    df: pd.DataFrame,
    horizon: int = 24,
    profit_target: float = 0.02,
    stop_loss: float = 0.01,
    price_col: str = "close"
) -> pd.DataFrame:
    """
    Triple Barrier 레이블을 데이터프레임에 추가하는 헬퍼 함수
    
    Args:
        df: OHLCV 데이터프레임
        horizon: 최대 대기 시간
        profit_target: TP 비율
        stop_loss: SL 비율
        price_col: 가격 컬럼
        
    Returns:
        df: 'label' 컬럼이 추가된 데이터프레임
    """
    config = TripleBarrierConfig(
        horizon=horizon,
        profit_target=profit_target,
        stop_loss=stop_loss
    )
    labeler = TripleBarrierLabeler(config)
    df = df.copy()
    df["label"] = labeler.generate_labels(df, price_col)
    return df
