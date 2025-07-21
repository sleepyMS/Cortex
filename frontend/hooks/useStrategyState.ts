import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import {
  SignalBlockData,
  Condition,
} from "@/components/domain/strategy/SignalBlock";
import { IndicatorDefinition } from "@/lib/indicators";

// --- 타입 정의 ---
export type RuleItem = SignalBlockData | GroupBlockData;

export interface GroupBlockData {
  id: string;
  type: "group";
  rules: SignalBlockData[];
  operator: "AND" | "OR";
}

export type RuleType = "buy" | "sell";
export type ConditionType = "conditionA" | "conditionB";

export type TargetSlot = {
  ruleType: RuleType;
  blockId: string;
  condition: ConditionType;
} | null;

// --- 훅 구현 ---
export function useStrategyState() {
  const [buyRules, setBuyRules] = useState<RuleItem[]>([]);
  const [sellRules, setSellRules] = useState<RuleItem[]>([]);

  const getSetter = useCallback((ruleType: RuleType) => {
    return ruleType === "buy" ? setBuyRules : setSellRules;
  }, []);

  const addBlock = useCallback(
    (ruleType: RuleType) => {
      const newBlock: SignalBlockData = {
        type: "signal",
        id: nanoid(),
        conditionA: null,
        operator: ">",
        conditionB: null,
      };
      getSetter(ruleType)((prev) => [...prev, newBlock]);
    },
    [getSetter]
  );

  const deleteItem = useCallback(
    (ruleType: RuleType, itemId: string) => {
      getSetter(ruleType)((prev) => prev.filter((item) => item.id !== itemId));
    },
    [getSetter]
  );

  const updateBlock = useCallback(
    (ruleType: RuleType, blockId: string, updatedBlock: SignalBlockData) => {
      const updater = (items: RuleItem[]) =>
        items.map((item) =>
          item.id === blockId && item.type === "signal" ? updatedBlock : item
        );
      getSetter(ruleType)(updater);
    },
    [getSetter]
  );

  const cloneSymmetrical = useCallback((blockToClone: SignalBlockData) => {
    const getSymmetricalOperator = (op: string) =>
      ({
        ">": "<",
        "<": ">",
        "Crosses Above": "Crosses Below",
        "Crosses Below": "Crosses Above",
      }[op] || op);
    const newBlock: SignalBlockData = {
      ...blockToClone,
      id: nanoid(),
      operator: getSymmetricalOperator(blockToClone.operator),
    };
    setSellRules((prev) => [...prev, newBlock]);
  }, []);

  const updateBlockCondition = useCallback(
    (target: TargetSlot, indicator: IndicatorDefinition) => {
      if (!target) return;
      const { ruleType, blockId, condition } = target;

      const newConditionData: Condition = {
        type: "indicator",
        name: `${indicator.name}(${indicator.parameters
          .map((p) => p.defaultValue)
          .join(",")})`,
        value: {
          indicatorKey: indicator.key,
          values: indicator.parameters.reduce((acc, param) => {
            acc[param.key] = param.defaultValue;
            return acc;
          }, {} as Record<string, any>),
        },
      };

      const updater = (items: RuleItem[]) =>
        items.map((item) => {
          if (item.id === blockId && item.type === "signal") {
            return { ...item, [condition]: newConditionData };
          }
          return item;
        });
      getSetter(ruleType)(updater);
    },
    [getSetter]
  );

  return {
    buyRules,
    sellRules,
    addBlock,
    deleteItem,
    updateBlock,
    cloneSymmetrical,
    updateBlockCondition,
  };
}
