# file: backend/app/core/indicator_definitions.py
"""
Cortex 프로젝트에서 지원하는 모든 기술적 지표의 메타데이터를 정의하는
'단일 진실 공급원(Single Source of Truth)' 파일입니다.
"""

INDICATOR_DEFINITIONS = {
    "Close": {
        "kind": "close", "label": "종가 (Close)", "description": "캔들의 종가.", "category": "Price", "paneType": "overlay",
        "parameters": {}, "outputs": [{"key": "close", "label": "종가"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison"],
    },
    "Open": {
        "kind": "open", "label": "시가 (Open)", "description": "캔들의 시가.", "category": "Price", "paneType": "overlay",
        "parameters": {}, "outputs": [{"key": "open", "label": "시가"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison"],
    },
    "High": {
        "kind": "high", "label": "고가 (High)", "description": "캔들의 고가.", "category": "Price", "paneType": "overlay",
        "parameters": {}, "outputs": [{"key": "high", "label": "고가"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison"],
    },
    "Low": {
        "kind": "low", "label": "저가 (Low)", "description": "캔들의 저가.", "category": "Price", "paneType": "overlay",
        "parameters": {}, "outputs": [{"key": "low", "label": "저가"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison"],
    },
    "Volume": {
        "kind": "volume", "label": "거래량 (Volume)", "description": "캔들의 거래량.", "category": "Volume", "paneType": "pane",
        "parameters": {}, "outputs": [{"key": "volume", "label": "거래량"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison"],
    },
    "SMA": {
        "kind": "sma", "label": "단순 이동평균 (SMA)", "description": "단순 이동평균선.", "category": "Trend", "paneType": "overlay",
        "parameters": {
            "length": {"label": "기간", "type": "int", "default": 20, "step": 1, "validation_range": [2, 1000], "optimization_range": [10, 200]},
        },
        "outputs": [{"key": "sma", "label": "SMA 값"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "crossover"],
    },
    "EMA": {
        "kind": "ema", "label": "지수 이동평균 (EMA)", "description": "최근 가격에 더 큰 비중을 둔 이동평균선.", "category": "Trend", "paneType": "overlay",
        "parameters": {
            "length": {"label": "기간", "type": "int", "default": 20, "step": 1, "validation_range": [2, 1000], "optimization_range": [10, 200]},
        },
        "outputs": [{"key": "ema", "label": "EMA 값"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "crossover"],
    },
    "HMA": {
        "kind": "hma", "label": "헐 이동평균 (HMA)", "description": "지연 현상을 줄인 이동평균선.", "category": "Trend", "paneType": "overlay",
        "parameters": {
            "length": {"label": "기간", "type": "int", "default": 16, "step": 1, "validation_range": [2, 1000], "optimization_range": [9, 100]},
        },
        "outputs": [{"key": "hma", "label": "HMA 값"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "crossover"],
    },
    "MACD": {
        "kind": "macd", "label": "이동평균 수렴확산 지수 (MACD)", "description": "추세의 강도와 방향을 나타내는 지표.", "category": "Trend", "paneType": "pane",
        "parameters": {
            "fast": {"label": "단기 기간", "type": "int", "default": 12, "step": 1, "validation_range": [2, 100], "optimization_range": [5, 50]},
            "slow": {"label": "장기 기간", "type": "int", "default": 26, "step": 1, "validation_range": [3, 200], "optimization_range": [20, 100]},
            "signal": {"label": "시그널 기간", "type": "int", "default": 9, "step": 1, "validation_range": [2, 100], "optimization_range": [5, 50]},
        },
        "outputs": [{"key": "macd", "label": "MACD 라인"}, {"key": "signal", "label": "시그널 라인"}, {"key": "histogram", "label": "히스토그램"}],
        "constraints": ["fast < slow"],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "crossover", "divergence"],
    },
    "ParabolicSAR": {
        "kind": "psar", "label": "파라볼릭 SAR", "description": "추세 반전 신호를 제공하는 지표.", "category": "Trend", "paneType": "overlay",
        "parameters": {
            "af0": {"label": "초기 가속", "type": "float", "default": 0.02, "step": 0.01, "validation_range": [0.01, 1.0], "optimization_range": [0.01, 0.1]},
            "afmax": {"label": "최대 가속", "type": "float", "default": 0.2, "step": 0.01, "validation_range": [0.02, 1.0], "optimization_range": [0.1, 0.5]},
        },
        "outputs": [{"key": "long", "label": "상승 SAR"}, {"key": "short", "label": "하락 SAR"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "trend_signal"],
    },
    "SuperTrend": {
        "kind": "supert", "label": "슈퍼트렌드", "description": "ATR을 활용해 추세를 명확히 표시하는 지표.", "category": "Trend", "paneType": "overlay",
        "parameters": {
            "length": {"label": "기간", "type": "int", "default": 10, "step": 1, "validation_range": [1, 100], "optimization_range": [7, 21]},
            "multiplier": {"label": "배수", "type": "float", "default": 3.0, "step": 0.1, "validation_range": [0.1, 10.0], "optimization_range": [1.0, 5.0]},
        },
        "outputs": [{"key": "trend", "label": "추세선"}, {"key": "direction", "label": "추세 방향"}, {"key": "long", "label": "상승 추세"}, {"key": "short", "label": "하락 추세"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "trend_signal"],
    },
    "Ichimoku": {
        "kind": "ichimoku", "label": "일목균형표", "description": "종합적인 추세 및 지지/저항 지표.", "category": "Trend", "paneType": "overlay",
        "parameters": {
            "tenkan": {"label": "전환선 기간", "type": "int", "default": 9, "step": 1, "validation_range": [1, 100], "optimization_range": [5, 20]},
            "kijun": {"label": "기준선 기간", "type": "int", "default": 26, "step": 1, "validation_range": [2, 200], "optimization_range": [20, 60]},
            "senkou": {"label": "선행스팬 기간", "type": "int", "default": 52, "step": 1, "validation_range": [3, 300], "optimization_range": [40, 120]},
        },
        "outputs": [{"key": "tenkan_sen", "label": "전환선"}, {"key": "kijun_sen", "label": "기준선"}, {"key": "span_a", "label": "선행 스팬 A"}, {"key": "span_b", "label": "선행 스팬 B"}, {"key": "lagging", "label": "후행 스팬"}],
        "constraints": ["tenkan < kijun", "kijun < senkou"],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "crossover", "channel"],
    },
    "ADX": {
        "kind": "adx", "label": "평균 방향 지수 (ADX)", "description": "추세의 강도를 측정.", "category": "Trend", "paneType": "pane",
        "parameters": {
            "length": {"label": "기간", "type": "int", "default": 14, "step": 1, "validation_range": [2, 100], "optimization_range": [7, 30]},
        },
        "outputs": [{"key": "adx", "label": "ADX 값"}, {"key": "di_plus", "label": "+DI"}, {"key": "di_minus", "label": "-DI"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison"],
    },
    "RSI": {
        "kind": "rsi", "label": "상대강도지수 (RSI)", "description": "시장 과매수/과매도 상태를 나타내는 지표.", "category": "Momentum", "paneType": "pane",
        "parameters": {
            "length": {"label": "기간", "type": "int", "default": 14, "step": 1, "validation_range": [2, 100], "optimization_range": [7, 30]},
        },
        "outputs": [{"key": "rsi", "label": "RSI 값", "min": 0, "max": 100}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "state", "divergence"],
    },
    "Stochastic": {
        "kind": "stoch", "label": "스토캐스틱 (Stochastics)", "description": "현재 가격이 일정 기간 동안의 가격 범위 내에서 어디에 위치하는지 측정.", "category": "Momentum", "paneType": "pane",
        "parameters": {
            "k": {"label": "%K 기간", "type": "int", "default": 14, "step": 1, "validation_range": [2, 100], "optimization_range": [5, 30]},
            "d": {"label": "%D 기간", "type": "int", "default": 3, "step": 1, "validation_range": [2, 50], "optimization_range": [3, 20]},
            "smooth_k": {"label": "Slowing", "type": "int", "default": 3, "step": 1, "validation_range": [1, 50], "optimization_range": [1, 20]},
        },
        "outputs": [{"key": "k_line", "label": "%K 라인", "min": 0, "max": 100}, {"key": "d_line", "label": "%D 라인", "min": 0, "max": 100}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "crossover", "state"],
    },
    "CCI": {
        "kind": "cci", "label": "상품 채널 지수 (CCI)", "description": "가격이 평균 가격으로부터 얼마나 떨어져 있는지 측정.", "category": "Momentum", "paneType": "pane",
        "parameters": {
            "length": {"label": "기간", "type": "int", "default": 20, "step": 1, "validation_range": [2, 200], "optimization_range": [10, 50]},
        },
        "outputs": [{"key": "cci", "label": "CCI 값"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "state"],
    },
    "RVI": {
        "kind": "rvi", "label": "상대 활력 지수 (RVI)", "description": "추세의 강도와 지속성을 측정.", "category": "Momentum", "paneType": "pane",
        "parameters": {
            "length": {"label": "기간", "type": "int", "default": 10, "step": 1, "validation_range": [2, 100], "optimization_range": [7, 30]},
        },
        "outputs": [{"key": "rvi", "label": "RVI 라인"}, {"key": "signal", "label": "시그널 라인"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "crossover"],
    },
    "BBands": {
        "kind": "bbands", "label": "볼린저 밴드 (Bollinger Bands)", "description": "주가의 변동성 범위를 나타내는 지표.", "category": "Channel", "paneType": "overlay",
        "parameters": {
            "length": {"label": "기간", "type": "int", "default": 20, "step": 1, "validation_range": [2, 200], "optimization_range": [10, 50]},
            "std": {"label": "표준편차", "type": "float", "default": 2.0, "step": 0.1, "validation_range": [0.1, 5.0], "optimization_range": [1.0, 3.0]},
        },
        "outputs": [{"key": "upper", "label": "상단 밴드"}, {"key": "middle", "label": "중간 밴드"}, {"key": "lower", "label": "하단 밴드"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "crossover", "channel"],
    },
    "ATR": {
        "kind": "atr", "label": "평균 실제 범위 (ATR)", "description": "시장의 변동성(범위)을 측정하는 지표.", "category": "Volatility", "paneType": "pane",
        "parameters": {
            "length": {"label": "기간", "type": "int", "default": 14, "step": 1, "validation_range": [2, 100], "optimization_range": [7, 30]},
        },
        "outputs": [{"key": "atr", "label": "ATR 값"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison"],
    },
    "KeltnerChannel": {
        "kind": "kc", "label": "켈트너 채널", "description": "EMA와 ATR을 결합하여 가격 채널을 형성.", "category": "Channel", "paneType": "overlay",
        "parameters": {
            "length": {"label": "EMA 기간", "type": "int", "default": 20, "step": 1, "validation_range": [2, 200], "optimization_range": [10, 50]},
            "atr_length": {"label": "ATR 기간", "type": "int", "default": 10, "step": 1, "validation_range": [2, 100], "optimization_range": [5, 30]},
            "scalar": {"label": "배수", "type": "float", "default": 1.5, "step": 0.1, "validation_range": [0.1, 10.0], "optimization_range": [1.0, 3.0]},
        },
        "outputs": [{"key": "upper", "label": "상단 채널"}, {"key": "middle", "label": "중앙 채널"}, {"key": "lower", "label": "하단 채널"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "crossover", "channel"],
    },
    "OBV": {
        "kind": "obv", "label": "잔고량 지표 (OBV)", "description": "가격 움직임에 따라 거래량을 누적하여 추세 확인.", "category": "Volume", "paneType": "pane",
        "parameters": {}, "outputs": [{"key": "obv", "label": "OBV 값"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison"],
    },
    "VWAP": {
        "kind": "vwap", "label": "거래량 가중 평균 가격 (VWAP)", "description": "거래량을 가중치로 둔 평균 가격.", "category": "Price", "paneType": "overlay",
        "parameters": {}, "outputs": [{"key": "vwap", "label": "VWAP 값"}],
        "supportedTimeframes": ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
        "supportedLogics": ["comparison", "crossover"],
    },
}