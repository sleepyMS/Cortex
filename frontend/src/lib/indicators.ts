// file: frontend/src/lib/indicators.ts

// --- 지표 파라미터 및 출력값 타입 정의 ---
export interface ParameterDefinition {
  key: string; // 파라미터 식별자 (예: 'period')
  label: string; // UI 표시 이름 (예: '기간')
  type: "integer" | "float" | "string"; // 파라미터 데이터 타입
  default: number | string; // 기본값
  min?: number; // 최소값 (유효성 검사용)
  max?: number; // 최대값 (유효성 검사용)
  step?: number; // UI 인풋의 step (예: 1, 0.1)
}

export interface OutputDefinition {
  key: string; // 출력값 식별자 (예: 'rsi', 'macd_line')
  label: string; // UI 표시 이름 (예: 'RSI 값')
  min?: number; // 출력값의 최소 범위 (예: RSI 0)
  max?: number; // 출력값의 최대 범위 (예: RSI 100)
}

export interface IndicatorMetadata {
  key: string; // 지표 고유 식별자 (예: 'RSI')
  label: string; // UI 표시 이름 (예: '상대강도지수 (RSI)')
  description: string; // 지표 설명
  category:
    | "Trend"
    | "Momentum"
    | "Volatility"
    | "Volume"
    | "Price"
    | "Channel"
    | "Quant"
    | "Candlestick"; // 지표 카테고리
  parameters: ParameterDefinition[]; // 파라미터 목록
  outputs: OutputDefinition[]; // 출력값 목록
  supportedTimeframes: string[]; // 👈 지원하는 타임프레임 목록
  supported_logics: (
    | "comparison"
    | "crossover"
    | "state"
    | "trend_signal"
    | "channel"
    | "divergence"
    | "pattern"
  )[]; // 지원하는 로직 유형
}

// --- 모든 지표의 메타데이터 정의 ---
export const INDICATOR_METADATA: IndicatorMetadata[] = [
  // =================================
  // 가격 지표 (Price)
  // =================================
  {
    key: "Close",
    label: "종가 (Close)",
    description: "캔들의 종가.",
    category: "Price",
    parameters: [],
    outputs: [{ key: "close", label: "종가" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison"],
  },
  {
    key: "Open",
    label: "시가 (Open)",
    description: "캔들의 시가.",
    category: "Price",
    parameters: [],
    outputs: [{ key: "open", label: "시가" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison"],
  },
  {
    key: "High",
    label: "고가 (High)",
    description: "캔들의 고가.",
    category: "Price",
    parameters: [],
    outputs: [{ key: "high", label: "고가" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison"],
  },
  {
    key: "Low",
    label: "저가 (Low)",
    description: "캔들의 저가.",
    category: "Price",
    parameters: [],
    outputs: [{ key: "low", label: "저가" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison"],
  },

  // =================================
  // 추세 지표 (Trend)
  // =================================
  {
    key: "SMA",
    label: "단순 이동평균 (SMA)",
    description: "단순 이동평균선.",
    category: "Trend",
    parameters: [
      { key: "period", label: "기간", type: "integer", default: 20, min: 2 },
    ],
    outputs: [{ key: "sma", label: "SMA 값" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "crossover"],
  },
  {
    key: "EMA",
    label: "지수 이동평균 (EMA)",
    description: "최근 가격에 더 큰 비중을 둔 이동평균선.",
    category: "Trend",
    parameters: [
      { key: "period", label: "기간", type: "integer", default: 20, min: 2 },
    ],
    outputs: [{ key: "ema", label: "EMA 값" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "crossover"],
  },
  {
    key: "HMA",
    label: "헐 이동평균 (HMA)",
    description: "지연 현상을 줄인 이동평균선.",
    category: "Trend",
    parameters: [
      { key: "period", label: "기간", type: "integer", default: 16, min: 2 },
    ],
    outputs: [{ key: "hma", label: "HMA 값" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "crossover"],
  },
  {
    key: "MACD",
    label: "이동평균 수렴확산 지수 (MACD)",
    description: "추세의 강도와 방향을 나타내는 지표.",
    category: "Trend",
    parameters: [
      {
        key: "fastPeriod",
        label: "단기 기간",
        type: "integer",
        default: 12,
        min: 2,
      },
      {
        key: "slowPeriod",
        label: "장기 기간",
        type: "integer",
        default: 26,
        min: 2,
      },
      {
        key: "signalPeriod",
        label: "시그널 기간",
        type: "integer",
        default: 9,
        min: 2,
      },
    ],
    outputs: [
      { key: "macd", label: "MACD 라인" },
      { key: "signal", label: "시그널 라인" },
      { key: "histogram", label: "히스토그램" },
    ],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "crossover", "divergence"],
  },
  {
    key: "ParabolicSAR",
    label: "파라볼릭 SAR",
    description: "추세 반전 신호를 제공하는 지표.",
    category: "Trend",
    parameters: [
      {
        key: "acceleration",
        label: "가속 변수",
        type: "float",
        default: 0.02,
        min: 0.01,
        step: 0.01,
      },
      {
        key: "maximum",
        label: "최대 변수",
        type: "float",
        default: 0.2,
        min: 0.01,
        step: 0.01,
      },
    ],
    outputs: [{ key: "sar", label: "SAR 값" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "trend_signal"],
  },
  {
    key: "SuperTrend",
    label: "슈퍼트렌드",
    description: "ATR을 활용해 추세를 명확히 표시하는 지표.",
    category: "Trend",
    parameters: [
      { key: "period", label: "기간", type: "integer", default: 10, min: 1 },
      {
        key: "multiplier",
        label: "배수",
        type: "float",
        default: 3,
        min: 1,
        step: 0.1,
      },
    ],
    outputs: [{ key: "supertrend", label: "슈퍼트렌드 라인" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "trend_signal"],
  },
  {
    key: "Ichimoku",
    label: "일목균형표",
    description: "종합적인 추세 및 지지/저항 지표.",
    category: "Trend",
    parameters: [
      {
        key: "conversion_period",
        label: "전환선 기간",
        type: "integer",
        default: 9,
        min: 1,
      },
      {
        key: "base_period",
        label: "기준선 기간",
        type: "integer",
        default: 26,
        min: 1,
      },
      {
        key: "leading_period",
        label: "선행스팬 기간",
        type: "integer",
        default: 52,
        min: 1,
      },
    ],
    outputs: [
      { key: "conversion", label: "전환선" },
      { key: "base", label: "기준선" },
      { key: "spanA", label: "선행 스팬 A" },
      { key: "spanB", label: "선행 스팬 B" },
      { key: "lagging", label: "후행 스팬" },
    ],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "crossover", "channel"],
  },

  // =================================
  // 모멘텀 지표 (Momentum)
  // =================================
  {
    key: "RSI",
    label: "상대강도지수 (RSI)",
    description: "시장 과매수/과매도 상태를 나타내는 지표.",
    category: "Momentum",
    parameters: [
      { key: "period", label: "기간", type: "integer", default: 14, min: 2 },
    ],
    outputs: [{ key: "rsi", label: "RSI 값", min: 0, max: 100 }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "state", "divergence"],
  },
  {
    key: "Stochastic",
    label: "스토캐스틱 (Stochastics)",
    description:
      "현재 가격이 일정 기간 동안의 가격 범위 내에서 어디에 위치하는지 측정.",
    category: "Momentum",
    parameters: [
      {
        key: "k_period",
        label: "%K 기간",
        type: "integer",
        default: 14,
        min: 2,
      },
      {
        key: "d_period",
        label: "%D 기간",
        type: "integer",
        default: 3,
        min: 2,
      },
      {
        key: "slowing_period",
        label: "Slowing",
        type: "integer",
        default: 3,
        min: 2,
      },
    ],
    outputs: [
      { key: "k_line", label: "%K 라인", min: 0, max: 100 },
      { key: "d_line", label: "%D 라인", min: 0, max: 100 },
    ],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "crossover", "state"],
  },
  {
    key: "CCI",
    label: "상품 채널 지수 (CCI)",
    description: "가격이 평균 가격으로부터 얼마나 떨어져 있는지 측정.",
    category: "Momentum",
    parameters: [
      { key: "period", label: "기간", type: "integer", default: 20, min: 2 },
    ],
    outputs: [{ key: "cci", label: "CCI 값" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "state"],
  },
  {
    key: "RVI",
    label: "상대 활력 지수 (RVI)",
    description: "추세의 강도와 지속성을 측정.",
    category: "Momentum",
    parameters: [
      { key: "period", label: "기간", type: "integer", default: 10, min: 2 },
    ],
    outputs: [
      { key: "rvi", label: "RVI 라인" },
      { key: "signal", label: "시그널 라인" },
    ],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "crossover"],
  },
  {
    key: "ADX",
    label: "평균 방향 지수 (ADX)",
    description: "추세의 강도를 측정.",
    category: "Trend",
    parameters: [
      { key: "period", label: "기간", type: "integer", default: 14, min: 2 },
    ],
    outputs: [
      { key: "adx", label: "ADX 값" },
      { key: "di_plus", label: "+DI" },
      { key: "di_minus", label: "-DI" },
    ],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison"],
  },

  // =================================
  // 변동성 지표 (Volatility)
  // =================================
  {
    key: "BB",
    label: "볼린저 밴드 (Bollinger Bands)",
    description: "주가의 변동성 범위를 나타내는 지표.",
    category: "Channel",
    parameters: [
      { key: "period", label: "기간", type: "integer", default: 20, min: 2 },
      {
        key: "std_dev",
        label: "표준편차",
        type: "float",
        default: 2,
        min: 1,
        step: 0.1,
      },
    ],
    outputs: [
      { key: "upper", label: "상단 밴드" },
      { key: "middle", label: "중간 밴드" },
      { key: "lower", label: "하단 밴드" },
    ],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "crossover", "channel"],
  },
  {
    key: "ATR",
    label: "평균 실제 범위 (ATR)",
    description: "시장의 변동성(범위)을 측정하는 지표.",
    category: "Volatility",
    parameters: [
      { key: "period", label: "기간", type: "integer", default: 14, min: 2 },
    ],
    outputs: [{ key: "atr", label: "ATR 값" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison"],
  },
  {
    key: "KeltnerChannel",
    label: "켈트너 채널",
    description: "EMA와 ATR을 결합하여 가격 채널을 형성.",
    category: "Channel",
    parameters: [
      {
        key: "ema_period",
        label: "EMA 기간",
        type: "integer",
        default: 20,
        min: 2,
      },
      {
        key: "atr_period",
        label: "ATR 기간",
        type: "integer",
        default: 10,
        min: 2,
      },
      {
        key: "multiplier",
        label: "배수",
        type: "float",
        default: 1.5,
        min: 1,
        step: 0.1,
      },
    ],
    outputs: [
      { key: "upper", label: "상단 채널" },
      { key: "middle", label: "중앙 채널" },
      { key: "lower", label: "하단 채널" },
    ],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "crossover", "channel"],
  },

  // =================================
  // 거래량 지표 (Volume)
  // =================================
  {
    key: "Volume",
    label: "거래량 (Volume)",
    description: "캔들의 거래량.",
    category: "Volume",
    parameters: [],
    outputs: [{ key: "volume", label: "거래량" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison"],
  },
  {
    key: "OBV",
    label: "잔고량 지표 (OBV)",
    description: "가격 움직임에 따라 거래량을 누적하여 추세 확인.",
    category: "Volume",
    parameters: [],
    outputs: [{ key: "obv", label: "OBV 값" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison"],
  },
  {
    key: "VWAP",
    label: "거래량 가중 평균 가격 (VWAP)",
    description: "거래량을 가중치로 둔 평균 가격.",
    category: "Price",
    parameters: [],
    outputs: [{ key: "vwap", label: "VWAP 값" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "crossover", "channel"],
  },
  {
    key: "CVD",
    label: "누적 거래량 델타 (CVD)",
    description: "매수/매도 압력을 분석하는 지표.",
    category: "Quant",
    parameters: [],
    outputs: [{ key: "cvd", label: "CVD 값" }],
    supportedTimeframes: [
      "1m",
      "5m",
      "15m",
      "30m",
      "1h",
      "4h",
      "1d",
      "1w",
      "1M",
    ],
    supported_logics: ["comparison", "divergence"],
  },
];
