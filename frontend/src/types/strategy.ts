// file: frontend/src/types/strategy.ts

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

// --- 지표 및 값 관련 타입 ---
export interface IndicatorValue {
  indicatorKey: string;
  outputs: string[];
  values: Record<string, any>;
  timeframe: string;
  offset?: number;
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

export interface AISignalLogic {
  id: string;
  type: "ai_signal";
  modelId: string;
  modelName?: string; // 표시용
  signalType: "buy" | "sell" | "hold";
  evaluationMode: "threshold" | "highest";
  minConfidence?: number; // threshold 모드용 (0.0~1.0)
  trainingEndDate?: string; // 미래 참조 경고용
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
  | PatternLogic
  | AISignalLogic;

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
  trailingStopEnabled?: boolean;
  trailingStopActivationPct?: number | null;
  trailingStopCallbackPct?: number | null;
}

// 타겟 코인 및 자산 배분율
export interface TargetCoin {
  ticker: string;
  allocationPct: number;
}

export interface BacktestResultSummaryForCard {
  totalReturnPct: number | null;
  winRatePct: number | null;
  mddPct: number | null;
  backtestScore: number | null;
  // 필요에 따라 백엔드 스키마와 맞춰 필드 추가 가능
}

export interface MarketplaceListing {
  productId: string;
  price: number;
  category: string;
  positionType: "LongOnly" | "ShortOnly" | "LongShort";
  representativeBacktestId?: string | null;
}

export interface BacktestHistoryItem {
  id: string;
  createdAt: string;
  result: BacktestResultSummaryForCard | null;
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

type ReplaceBlockTarget = {
  type: "replace-block";
  ruleType: StrategyType;
  blockId: string;
};

export type TargetSlot =
  | TopLevelAddTarget
  | NestedAddTarget
  | OperandTarget
  | ReplaceBlockTarget
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
  onTriggerReplaceBlock: (blockId: string) => void;
}

/**
 * 목록 조회를 위한 가벼운 전략 정보 타입.
 * 백엔드의 `StrategyInList` 스키마와 일치합니다.
 */
export interface StrategyInList {
  id: string;
  authorId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string | null;
  latestBacktestSummary: BacktestResultSummaryForCard | null;
  marketplaceListing: MarketplaceListing | null;
  targetCoins: TargetCoin[];
  backtests: BacktestHistoryItem[];
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  tpslLogic: TpslLogic | null;
}

/**
 * 상세 조회를 위한 완전한 전략 정보 타입.
 * 백엔드의 `Strategy` 스키마와 일치합니다.
 */
export interface Strategy {
  id: string;
  authorId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  tpslLogic: TpslLogic | null;
  targetCoins: TargetCoin[];
  createdAt: string;
  updatedAt: string | null;
  paidFeatureLevel: "Basic" | "Trader" | "Pro";
  latestBacktestSummary: BacktestResultSummaryForCard | null;
  marketplaceListing: MarketplaceListing | null;
  backtests: BacktestHistoryItem[];
}
