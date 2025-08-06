// file: frontend/src/types/strategy.ts

// --- 기본 타입 ---
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

// --- 추상화된 로직 유형별 타입 정의 ---
export interface ComparisonLogic {
  id: string;
  type: "comparison";
  operand_a: IndicatorValue | number;
  operator: string;
  operand_b: IndicatorValue | number;
  children?: LogicBlock[]; // 👈 children 필드 선택적으로 추가
}

export interface CrossoverLogic {
  id: string;
  type: "crossover";
  main_line: IndicatorValue;
  signal_line: IndicatorValue | number;
  cross_direction: "above" | "below";
  children?: LogicBlock[];
}

export interface StateLogic {
  id: string;
  type: "state";
  indicator: IndicatorValue;
  lower_bound: number | null;
  upper_bound: number | null;
  state_action: "enter" | "exit" | "within";
  children?: LogicBlock[];
}

export interface TrendSignalLogic {
  id: string;
  type: "trend_signal";
  indicator: IndicatorValue;
  signal: "buy" | "sell" | "none";
  children?: LogicBlock[];
}

export interface ChannelLogic {
  id: string;
  type: "channel";
  indicator: IndicatorValue;
  channel_zone: "upper" | "middle" | "lower" | "kumo";
  action: "enter" | "exit" | "within";
  children?: LogicBlock[];
}

export interface DivergenceLogic {
  id: string;
  type: "divergence";
  indicator: IndicatorValue;
  divergence_type: "bullish" | "bearish" | "hidden_bullish" | "hidden_bearish";
  children?: LogicBlock[];
}

export interface PatternLogic {
  id: string;
  type: "pattern";
  pattern_key: string;
  direction: "bullish" | "bearish" | "any";
  children?: LogicBlock[];
}

// 모든 로직 유형을 담는 유니온 타입
export type LogicBlock =
  | ComparisonLogic
  | CrossoverLogic
  | StateLogic
  | TrendSignalLogic
  | ChannelLogic
  | DivergenceLogic
  | PatternLogic;

// --- 전략 규칙 구조 타입 ---
export interface PositionRules {
  logic_operator: LogicOperator;
  blocks: LogicBlock[];
}

// --- 청산 로직 타입 ---
export interface TpslLogic {
  take_profit_pct: number | null;
  stop_loss_pct: number | null;
  atr_stop_loss_multiplier: number | null;
  atr_take_profit_multiplier: number | null;
  atr_period: number | null;
}

// --- 타겟 코인 타입 ---
export interface TargetCoin {
  ticker: string;
  allocation_pct: float;
}

// --- 전체 전략 데이터 타입 (백엔드 `schemas.py`와 일치) ---
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

// --- UI 상호작용 관련 타입 ---
export type TargetSlot = {
  ruleType: StrategyType;
  blockId: string;
  logicType: LogicBlock["type"];
  slotKey: string;
} | null;
