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
};

// 3. 모든 지표의 정의를 담은 레지스트리 (여기에만 추가하면 됨)
export const INDICATOR_REGISTRY: Record<string, IndicatorDefinition> = {
  // =================================
  // 가격 지표 (Price)
  // =================================
  Close: {
    key: "Close",
    name: "종가",
    category: "Price",
    parameters: [],
  },
  Open: {
    key: "Open",
    name: "시가",
    category: "Price",
    parameters: [],
  },
  High: {
    key: "High",
    name: "고가",
    category: "Price",
    parameters: [],
  },
  Low: {
    key: "Low",
    name: "저가",
    category: "Price",
    parameters: [],
  },

  // =================================
  // 추세 지표 (Trend)
  // =================================
  SMA: {
    key: "SMA",
    name: "단순 이동평균",
    category: "Trend",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 20 },
    ],
  },
  EMA: {
    key: "EMA",
    name: "지수 이동평균",
    category: "Trend",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 20 },
    ],
  },
  MACD: {
    key: "MACD",
    name: "MACD",
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
  },
  ParabolicSAR: {
    key: "ParabolicSAR",
    name: "파라볼릭 SAR",
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
  },
  Stoch: {
    key: "Stoch",
    name: "스토캐스틱",
    category: "Momentum",
    parameters: [
      { key: "k_period", name: "%K 기간", type: "number", defaultValue: 14 },
      { key: "d_period", name: "%D 기간", type: "number", defaultValue: 3 },
      { key: "slowing", name: "Slowing", type: "number", defaultValue: 3 },
    ],
  },
  CCI: {
    key: "CCI",
    name: "상품 채널 지수 (CCI)",
    category: "Momentum",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 20 },
    ],
  },

  // =================================
  // 변동성 지표 (Volatility)
  // =================================
  BB: {
    key: "BB",
    name: "볼린저 밴드",
    category: "Volatility",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 20 },
      { key: "stdDev", name: "표준편차", type: "number", defaultValue: 2 },
    ],
  },
  ATR: {
    key: "ATR",
    name: "평균 실제 범위 (ATR)",
    category: "Volatility",
    parameters: [
      { key: "period", name: "기간", type: "number", defaultValue: 14 },
    ],
  },

  // =================================
  // 거래량 지표 (Volume)
  // =================================
  Volume: {
    key: "Volume",
    name: "거래량",
    category: "Volume",
    parameters: [],
  },
  OBV: {
    key: "OBV",
    name: "On-Balance Volume",
    category: "Volume",
    parameters: [],
  },

  // =================================
  // 기타 (예시)
  // =================================
  Timeframe: {
    key: "Timeframe",
    name: "타임프레임",
    category: "Price", // 가격과 관련이 깊으므로 Price 카테고리에 포함
    parameters: [
      {
        key: "resolution",
        name: "해상도",
        type: "select",
        defaultValue: "1h",
        options: [
          { value: "1m", label: "1분" },
          { value: "5m", label: "5분" },
          { value: "15m", label: "15분" },
          { value: "1h", label: "1시간" },
          { value: "4h", label: "4시간" },
          { value: "1d", label: "1일" },
        ],
      },
    ],
  },
};
