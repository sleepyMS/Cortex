// --- 기본 타입 정의 ---
export type LogicOperator = "AND" | "OR";
export type StrategyType =
  | "longEntry"
  | "longExit"
  | "shortEntry"
  | "shortExit";

// 지표의 파라미터(예: 기간, 승수) 정의
export interface IndicatorParameter {
  key: string; // "length"
  label: string; // "기간"
  default: number; // 14
}

// 지표의 출력값(예: MACD 라인, 신호선) 정의
export interface IndicatorOutput {
  key: string; // "macd"
  label: string; // "MACD"
}

// // 지표의 기본 정보를 정의하는 '설계도' 타입
// export interface IndicatorMetadata {
//   key: string; // "RSI", "MACD"
//   label: string; // "상대강도지수", "MACD"
//   description: string; // "가격의 상승 압력과 하락 압력 간의 상대적인 강도를 나타냅니다."
//   category: string; // "Momentum", "Trend"
//   parameters: IndicatorParameter[];
//   outputs: IndicatorOutput[];
//   supportedLogics: LogicBlock["type"][]; // 지원하는 로직 타입 배열 (e.g., ["comparison", "state"])
//   supportedTimeframes: string[]; // 지원하는 타임프레임 배열 (e.g., ["1m", "5m", "1h"])
// }

// --- 지표 및 값 관련 타입 ---
export interface IndicatorValue {
  indicatorKey: string;
  outputs: string[];
  values: Record<string, any>;
  timeframe: string;
}

// --- 규칙 블록(LogicBlock)을 구성하는 개별 로직 타입 정의 ---
export interface ComparisonLogic {
  id: string;
  type: "comparison";
  operandA: IndicatorValue | number | null;
  operator: ">" | "<" | "==" | "!=";
  operandB: IndicatorValue | number | null;
  children?: LogicBlock[];
  logicOperator?: LogicOperator;
}

export interface CrossoverLogic {
  id: string;
  type: "crossover";
  mainLine: IndicatorValue | number | null;
  signalLine: IndicatorValue | number | null;
  crossDirection: "above" | "below";
  children?: LogicBlock[];
  logicOperator?: LogicOperator;
}

export interface StateLogic {
  id: string;
  type: "state";
  indicator: IndicatorValue | null;
  lowerBound: number | null;
  upperBound: number | null;
  stateAction: "enter" | "exit" | "within";
  children?: LogicBlock[];
  logicOperator?: LogicOperator;
}

export interface TrendSignalLogic {
  id: string;
  type: "trend_signal";
  indicator: IndicatorValue | null;
  signal: "buy" | "sell" | "none";
  children?: LogicBlock[];
  logicOperator?: LogicOperator;
}

export interface ChannelLogic {
  id: string;
  type: "channel";
  indicator: IndicatorValue | null;
  channelZone: "upper" | "middle" | "lower" | "kumo";
  action: "enter" | "exit" | "within";
  children?: LogicBlock[];
  logicOperator?: LogicOperator;
}

export interface DivergenceLogic {
  id: string;
  type: "divergence";
  indicator: IndicatorValue | null;
  divergenceType: "bullish" | "bearish" | "hidden_bullish" | "hidden_bearish";
  children?: LogicBlock[];
  logicOperator?: LogicOperator;
}

export interface PatternLogic {
  id: string;
  type: "pattern";
  patternKey: string;
  direction: "bullish" | "bearish" | "any";
  children?: LogicBlock[];
  logicOperator?: LogicOperator;
}

// 모든 개별 로직 타입을 통합하는 유니온 타입
export type LogicBlock =
  | ComparisonLogic
  | CrossoverLogic
  | StateLogic
  | TrendSignalLogic
  | ChannelLogic
  | DivergenceLogic
  | PatternLogic;

// --- 전략의 주요 구성 요소 타입 정의 ---

// 포지션 진입/청산 규칙의 컨테이너
export interface PositionRules {
  logicOperator: LogicOperator;
  blocks: LogicBlock[];
}

// Take Profit / Stop Loss 로직
export interface TpslLogic {
  takeProfitPct?: number | null;
  stopLossPct?: number | null;
  atrStopLossMultiplier?: number | null;
  atrTakeProfitMultiplier?: number | null;
  atrPeriod?: number | null;
}

// 타겟 코인 및 자산 배분율
export interface TargetCoin {
  ticker: string;
  allocationPct: number;
}

// --- 전체 전략 객체 타입 (API 응답과 일치) ---
export interface Strategy {
  id: string; // UUID 형식이므로 string
  authorId: string;
  name: string;
  description: string;
  isPublic: boolean;
  longEntryRules: PositionRules;
  longExitRules: PositionRules;
  shortEntryRules: PositionRules;
  shortExitRules: PositionRules;
  tpslLogic: any;
  targetCoins: any[];
  createdAt: string;
  updatedAt: string;
  paidFeatureLevel: "Basic" | "Trader" | "Pro";

  /** [추가] 가장 최근 백테스트 요약 정보 (성과 뱃지 표시용) */
  latestBacktestSummary?: {
    totalReturnPct: number | null;
    winRatePct: number | null;
  } | null;

  /** [추가] 마켓플레이스 등록 정보 (등록된 경우에만 존재) */
  marketplaceListing?: MarketplaceListing | null;
}

// --- UI 상호작용을 위한 컨텍스트 타입 ---

// IndicatorHub를 열 때의 사용자 의도를 구분하기 위한 타입
type TopLevelAddTarget = {
  type: "top-level";
  ruleType: StrategyType;
};
type NestedAddTarget = {
  type: "nested-add";
  ruleType: StrategyType;
  parentId: string;
  as: LogicOperator;
};
type OperandTarget = {
  type: "operand";
  ruleType: StrategyType;
  blockId: string;
  operandKey: string;
};

export type TargetSlot =
  | TopLevelAddTarget
  | NestedAddTarget
  | OperandTarget
  | null;

// LogicBlock Union의 모든 가능한 키를 추출하는 유틸리티 타입
export type AllLogicBlockKeys = LogicBlock extends infer T
  ? T extends LogicBlock
    ? keyof T
    : never
  : never;

export interface RuleBlockProps {
  item: LogicBlock;
  onUpdate: (id: string, newBlock: LogicBlock) => void;
  onDelete: (id: string) => void;
  onTriggerAddRule: (parentId: string, as: LogicOperator) => void;
  onTriggerOperandHub: (blockId: string, operandKey: string) => void;
}

/**
 * [신규] 마켓플레이스 등록 정보 타입
 */
export interface MarketplaceListing {
  /** 마켓 등록 ID */
  listingId: string;
  /** 판매 가격 */
  price: number;
  /**
   * 전략 카테고리 (백엔드와 협의된 Enum 값)
   * 예: 'Scalping', 'Swing', 'TrendFollowing', 'Grid' 등
   */
  category: string;
  /**
   * 포지션 타입
   * - 'LongOnly': 롱 포지션만 진입
   * - 'ShortOnly': 숏 포지션만 진입
   * - 'LongShort': 양방향 포지션 진입
   */
  positionType: "LongOnly" | "ShortOnly" | "LongShort";
  /** 마켓에 등록된 시각 */
  listedAt: string;
}
