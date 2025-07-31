// frontend/src/types/strategy.ts

// --- 기본 타입 ---
export type LogicOperator = "AND" | "OR";
export type RuleType = "buy" | "sell";
export type ConditionType = "conditionA" | "conditionB";

// --- 데이터 구조 타입 ---
export interface Condition {
  type: "indicator" | "value";
  name: string; // UI에 표시될 이름 (예: "SMA(20)", "Close", "50")
  // 지표 타입일 경우 { indicatorKey: string; values: Record<string, any>; timeframe: string; }
  // 값 타입일 경우 number
  value:
    | { indicatorKey: string; values: Record<string, any>; timeframe: string }
    | number;
}

export interface SignalBlockData {
  id: string;
  type: "signal";
  conditionA: Condition | null;
  operator: string;
  conditionB: Condition | null;
  children: RuleItem[]; // AND 조건을 위한 자식 노드
  logicOperator: LogicOperator; // 자식들을 연결할 연산자
}

export type RuleItem = SignalBlockData;

// --- 상호작용 관련 타입 ---
export type TargetSlot = {
  ruleType: RuleType;
  blockId: string;
  condition: ConditionType;
} | null;
