// --- 기본 타입 정의 ---
export type LogicOperator = "AND" | "OR";
export type StrategyType =
  | "longEntry"
  | "longExit"
  | "shortEntry"
  | "shortExit";

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
  id: number;
  authorId: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  tpslLogic: TpslLogic | null;
  targetCoins: TargetCoin[];
  paidFeatureLevel: "basic" | "trader" | "pro";
  createdAt: string;
  updatedAt: string | null;
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
