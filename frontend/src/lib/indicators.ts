// file: frontend/src/lib/indicators.ts (최종 수정 버전)

// --- 지표 파라미터 및 출력값 타입 정의 ---
export interface ParameterDefinition {
  key: string;
  label: string;
  type: "integer" | "float" | "string";
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
}

export interface OutputDefinition {
  key: string;
  label: string;
  min?: number;
  max?: number;
}

export interface IndicatorMetadata {
  key: string;
  label: string;
  description: string;
  category:
    | "Trend"
    | "Momentum"
    | "Volatility"
    | "Volume"
    | "Price"
    | "Channel"
    | "Quant"
    | "Candlestick";
  paneType: "overlay" | "pane";
  parameters: ParameterDefinition[];
  outputs: OutputDefinition[];
  supportedTimeframes: string[];
  supported_logics: (
    | "comparison"
    | "crossover"
    | "state"
    | "trend_signal"
    | "channel"
    | "divergence"
    | "pattern"
  )[];
}

// --- 모든 지표의 메타데이터 정의 (pandas-ta 파라미터 이름에 맞춰 수정 완료) ---
export const INDICATOR_METADATA: IndicatorMetadata[] = [
  // =================================
  // 가격 지표 (Price)
  // =================================
  {
    key: "Close",
    label: "종가 (Close)",
    description: "캔들의 종가.",
    category: "Price",
    paneType: "overlay",
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
    paneType: "overlay",
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
    paneType: "overlay",
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
    paneType: "overlay",
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
    paneType: "overlay",
    parameters: [
      { key: "length", label: "기간", type: "integer", default: 20, min: 2 },
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
    paneType: "overlay",
    parameters: [
      { key: "length", label: "기간", type: "integer", default: 20, min: 2 },
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
    paneType: "overlay",
    parameters: [
      { key: "length", label: "기간", type: "integer", default: 16, min: 2 },
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
    paneType: "pane",
    parameters: [
      { key: "fast", label: "단기 기간", type: "integer", default: 12, min: 2 },
      { key: "slow", label: "장기 기간", type: "integer", default: 26, min: 2 },
      {
        key: "signal",
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
    paneType: "overlay",
    parameters: [
      {
        key: "af0",
        label: "초기 가속",
        type: "float",
        default: 0.02,
        min: 0.01,
        step: 0.01,
      },
      {
        key: "afmax",
        label: "최대 가속",
        type: "float",
        default: 0.2,
        min: 0.01,
        step: 0.01,
      },
    ],
    outputs: [
      { key: "long", label: "상승 SAR" },
      { key: "short", label: "하락 SAR" },
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
    supported_logics: ["comparison", "trend_signal"],
  },
  {
    key: "SuperTrend",
    label: "슈퍼트렌드",
    description: "ATR을 활용해 추세를 명확히 표시하는 지표.",
    category: "Trend",
    paneType: "overlay",
    parameters: [
      { key: "length", label: "기간", type: "integer", default: 10, min: 1 },
      {
        key: "multiplier",
        label: "배수",
        type: "float",
        default: 3,
        min: 1,
        step: 0.1,
      },
    ],
    outputs: [
      { key: "trend", label: "추세선" },
      { key: "direction", label: "추세 방향" },
      { key: "long", label: "상승 추세" },
      { key: "short", label: "하락 추세" },
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
    supported_logics: ["comparison", "trend_signal"],
  },
  {
    key: "Ichimoku",
    label: "일목균형표",
    description: "종합적인 추세 및 지지/저항 지표.",
    category: "Trend",
    paneType: "overlay",
    parameters: [
      {
        key: "tenkan",
        label: "전환선 기간",
        type: "integer",
        default: 9,
        min: 1,
      },
      {
        key: "kijun",
        label: "기준선 기간",
        type: "integer",
        default: 26,
        min: 1,
      },
      {
        key: "senkou",
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
    paneType: "pane",
    parameters: [
      { key: "length", label: "기간", type: "integer", default: 14, min: 2 },
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
    paneType: "pane",
    parameters: [
      { key: "k", label: "%K 기간", type: "integer", default: 14, min: 2 },
      { key: "d", label: "%D 기간", type: "integer", default: 3, min: 2 },
      {
        key: "smooth_k",
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
    paneType: "pane",
    parameters: [
      { key: "length", label: "기간", type: "integer", default: 20, min: 2 },
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
    paneType: "pane",
    parameters: [
      { key: "length", label: "기간", type: "integer", default: 10, min: 2 },
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
    paneType: "pane",
    parameters: [
      { key: "length", label: "기간", type: "integer", default: 14, min: 2 },
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
  // 변동성 & 채널 지표 (Volatility & Channel)
  // =================================
  {
    key: "BBands",
    label: "볼린저 밴드 (Bollinger Bands)",
    description: "주가의 변동성 범위를 나타내는 지표.",
    category: "Channel",
    paneType: "overlay",
    parameters: [
      { key: "length", label: "기간", type: "integer", default: 20, min: 2 },
      {
        key: "std",
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
    paneType: "pane",
    parameters: [
      { key: "length", label: "기간", type: "integer", default: 14, min: 2 },
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
    paneType: "overlay",
    parameters: [
      {
        key: "length",
        label: "EMA 기간",
        type: "integer",
        default: 20,
        min: 2,
      },
      {
        key: "atr_length",
        label: "ATR 기간",
        type: "integer",
        default: 10,
        min: 2,
      },
      {
        key: "scalar",
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
    paneType: "pane",
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
    paneType: "pane",
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
    paneType: "overlay",
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
];
