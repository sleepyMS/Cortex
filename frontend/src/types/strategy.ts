// --- 기본 타입 ---
export type LogicOperator = "AND" | "OR";
export type RuleType = "buy" | "sell";
export type ConditionType = "conditionA" | "conditionB";

// --- 데이터 구조 타입 ---
export interface Condition {
  type: "indicator" | "value";
  name: string;
  value: { indicatorKey: string; values: Record<string, any> } | number;
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
