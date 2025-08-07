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
  operand_a: IndicatorValue | number | null;
  operator: ">" | "<" | "==" | "!=";
  operand_b: IndicatorValue | number | null;
  children?: LogicBlock[];
  logic_operator?: LogicOperator;
}

export interface CrossoverLogic {
  id: string;
  type: "crossover";
  main_line: IndicatorValue | number | null;
  signal_line: IndicatorValue | number | null;
  cross_direction: "above" | "below";
  children?: LogicBlock[];
  logic_operator?: LogicOperator;
}

export interface StateLogic {
  id: string;
  type: "state";
  indicator: IndicatorValue | null;
  lower_bound: number | null;
  upper_bound: number | null;
  state_action: "enter" | "exit" | "within";
  children?: LogicBlock[];
  logic_operator?: LogicOperator;
}

export interface TrendSignalLogic {
  id: string;
  type: "trend_signal";
  indicator: IndicatorValue | null;
  signal: "buy" | "sell" | "none";
  children?: LogicBlock[];
  logic_operator?: LogicOperator;
}

export interface ChannelLogic {
  id: string;
  type: "channel";
  indicator: IndicatorValue | null;
  channel_zone: "upper" | "middle" | "lower" | "kumo";
  action: "enter" | "exit" | "within";
  children?: LogicBlock[];
  logic_operator?: LogicOperator;
}

export interface DivergenceLogic {
  id: string;
  type: "divergence";
  indicator: IndicatorValue | null;
  divergence_type: "bullish" | "bearish" | "hidden_bullish" | "hidden_bearish";
  children?: LogicBlock[];
  logic_operator?: LogicOperator;
}

export interface PatternLogic {
  id: string;
  type: "pattern";
  pattern_key: string;
  direction: "bullish" | "bearish" | "any";
  children?: LogicBlock[];
  logic_operator?: LogicOperator;
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
  logic_operator: LogicOperator;
  blocks: LogicBlock[];
}

// Take Profit / Stop Loss 로직
export interface TpslLogic {
  take_profit_pct?: number | null;
  stop_loss_pct?: number | null;
  atr_stop_loss_multiplier?: number | null;
  atr_take_profit_multiplier?: number | null;
  atr_period?: number | null;
}

// 타겟 코인 및 자산 배분율
export interface TargetCoin {
  ticker: string;
  allocation_pct: number;
}

// --- 전체 전략 객체 타입 (API 응답과 일치) ---
export interface Strategy {
  id: number;
  author_id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  long_entry_rules: PositionRules | null;
  long_exit_rules: PositionRules | null;
  short_entry_rules: PositionRules | null;
  short_exit_rules: PositionRules | null;
  tpsl_logic: TpslLogic | null;
  target_coins: TargetCoin[];
  paid_feature_level: "basic" | "trader" | "pro";
  created_at: string;
  updated_at: string | null;
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
