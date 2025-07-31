// frontend/src/lib/indicators.ts

// 1. 지표 파라미터의 타입을 정의합니다.
export type IndicatorParameter = {
  key: string; // 데이터 객체에서 사용할 키 (e.g., 'period')
  name: string; // UI에 보여줄 이름 (e.g., '기간')
  type: "number" | "select";
  defaultValue: any;
  options?: { value: any; label: string }[]; // 'select' 타입일 경우의 옵션
};

// 2. 개별 지표의 전체 정의
export type IndicatorDefinition = {
  key: string; // 고유 식별자 (e.g., 'SMA')
  name: string; // UI 표시 이름 (e.g., '단순 이동평균')
  category: "Trend" | "Momentum" | "Volatility" | "Volume" | "Price"; // 카테고리 추가
  parameters: IndicatorParameter[];
  defaultTimeframe: string; // 지표의 기본 타임프레임
  supportedTimeframes: string[]; // 지표가 지원하는 타임프레임 목록
};

// 3. 모든 지표의 정의를 담은 레지스트리 (여기에만 추가하면 됨)
export const INDICATOR_REGISTRY: Record<string, IndicatorDefinition> = {
  // =================================
  // 가격 지표 (Price)
  // =================================
  Close: {
    key: "Close",
    name: "종가 (Close)",
    category: "Price",
    parameters: [],
    defaultTimeframe: "1h",
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
  },
  Open: {
    key: "Open",
    name: "시가 (Open)",
    category: "Price",
    parameters: [],
    defaultTimeframe: "1h",
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
  },
  High: {
    key: "High",
    name: "고가 (High)",
    category: "Price",
    parameters: [],
    defaultTimeframe: "1h",
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
  },
  Low: {
    key: "Low",
    name: "저가 (Low)",
    category: "Price",
    parameters: [],
    defaultTimeframe: "1h",
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
  },

  // =================================
  // 추세 지표 (Trend)
  // =================================
  SMA: {
    key: "SMA",
    name: "단순 이동평균 (SMA)",
    category: "Trend",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 20 },
    ],
    defaultTimeframe: "1h",
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
  },
  EMA: {
    key: "EMA",
    name: "지수 이동평균 (EMA)",
    category: "Trend",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 20 },
    ],
    defaultTimeframe: "1h",
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
  },
  MACD: {
    key: "MACD",
    name: "이동평균 수렴확산 지수 (MACD)",
    category: "Trend",
    parameters: [
      {
        key: "fast_period",
        name: "단기 기간",
        type: "number",
        defaultValue: 12,
      },
      {
        key: "slow_period",
        name: "장기 기간",
        type: "number",
        defaultValue: 26,
      },
      {
        key: "signal_period",
        name: "시그널 기간",
        type: "number",
        defaultValue: 9,
      },
    ],
    defaultTimeframe: "1h",
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
  },
  ParabolicSAR: {
    key: "ParabolicSAR",
    name: "파라볼릭 SAR (Parabolic SAR)",
    category: "Trend",
    parameters: [
      {
        key: "acceleration",
        name: "가속 변수",
        type: "number",
        defaultValue: 0.02,
      },
      { key: "maximum", name: "최대 변수", type: "number", defaultValue: 0.2 },
    ],
    defaultTimeframe: "1h",
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
  },

  // =================================
  // 모멘텀 지표 (Momentum)
  // =================================
  RSI: {
    key: "RSI",
    name: "상대강도지수 (RSI)",
    category: "Momentum",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 14 },
    ],
    defaultTimeframe: "1h",
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
  },
  Stoch: {
    key: "Stoch",
    name: "스토캐스틱 (Stochastics)",
    category: "Momentum",
    parameters: [
      { key: "k_period", name: "%K 기간", type: "number", defaultValue: 14 },
      { key: "d_period", name: "%D 기간", type: "number", defaultValue: 3 },
      { key: "slowing", name: "Slowing", type: "number", defaultValue: 3 },
    ],
    defaultTimeframe: "1h",
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
  },
  CCI: {
    key: "CCI",
    name: "상품 채널 지수 (CCI)",
    category: "Momentum",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 20 },
    ],
    defaultTimeframe: "1h",
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
  },

  // =================================
  // 변동성 지표 (Volatility)
  // =================================
  BB: {
    key: "BB",
    name: "볼린저 밴드 (Bollinger Bands)",
    category: "Volatility",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 20 },
      { key: "stdDev", name: "표준편차", type: "number", defaultValue: 2 },
    ],
    defaultTimeframe: "1h",
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
  },
  ATR: {
    key: "ATR",
    name: "평균 실제 범위 (ATR)",
    category: "Volatility",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 14 },
    ],
    defaultTimeframe: "1h",
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
  },

  // =================================
  // 거래량 지표 (Volume)
  // =================================
  Volume: {
    key: "Volume",
    name: "거래량 (Volume)",
    category: "Volume",
    parameters: [],
    defaultTimeframe: "1h",
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
  },
  OBV: {
    key: "OBV",
    name: "잔고량 지표 (OBV)",
    category: "Volume",
    parameters: [],
    defaultTimeframe: "1h",
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
  },
};
