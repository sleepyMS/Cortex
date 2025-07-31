// file: frontend/src/hooks/useStrategyState.ts

"use client";

import { useState, useCallback } from "react";
import { nanoid } from "nanoid";

import {
  RuleItem,
  SignalBlockData,
  Condition,
  RuleType,
  TargetSlot,
  LogicOperator,
} from "@/types/strategy";
import { INDICATOR_REGISTRY, IndicatorDefinition } from "@/lib/indicators"; // INDICATOR_REGISTRY import 추가

// --- 헬퍼 함수 ---

// 재귀적으로 아이템을 업데이트하는 함수
const updateItemRecursive = (
  items: RuleItem[],
  id: string,
  updater: (item: RuleItem) => RuleItem
): RuleItem[] => {
  return items.map((item) => {
    if (item.id === id) {
      return updater(item);
    }
    // SignalBlockData의 children 속성을 확인하여 재귀적으로 업데이트
    if (item.type === "signal" && item.children && item.children.length > 0) {
      const newChildren = updateItemRecursive(item.children, id, updater);
      if (newChildren !== item.children) {
        return { ...item, children: newChildren } as SignalBlockData;
      }
    }
    return item;
  });
};

// 재귀적으로 아이템을 제거하는 함수
const removeItemRecursive = (items: RuleItem[], id: string): RuleItem[] => {
  return items
    .filter((item) => item.id !== id)
    .map((item) => {
      // SignalBlockData의 children 속성을 확인하여 재귀적으로 제거
      if (item.type === "signal" && item.children && item.children.length > 0) {
        return {
          ...item,
          children: removeItemRecursive(item.children, id),
        } as SignalBlockData;
      }
      return item;
    });
};

// --- 메인 훅 ---
export function useStrategyState() {
  const [buyRules, setBuyRules] = useState<RuleItem[]>([]);
  const [sellRules, setSellRules] = useState<RuleItem[]>([]);

  const getSetter = useCallback(
    (ruleType: RuleType) => (ruleType === "buy" ? setBuyRules : setSellRules),
    []
  );

  const addRule = useCallback(
    (
      ruleType: RuleType,
      parentId: string | null = null,
      as: LogicOperator = "OR"
    ) => {
      const newSignal: SignalBlockData = {
        type: "signal",
        id: nanoid(),
        conditionA: null,
        operator: ">",
        conditionB: null,
        children: [],
        logicOperator: "AND",
      };
      const newRule: RuleItem = newSignal;

      const setter = getSetter(ruleType);

      setter((prev) => {
        if (parentId === null) {
          return [...prev, newRule];
        }

        const addRecursive = (items: RuleItem[]): RuleItem[] => {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.id === parentId) {
              const newItems = [...items];
              if (item.type === "signal") {
                if (as === "AND") {
                  newItems[i] = {
                    ...item,
                    children: [...item.children, newRule],
                  } as SignalBlockData;
                } else {
                  newItems.splice(i + 1, 0, newRule);
                }
              }
              return newItems;
            }
            if (
              item.type === "signal" &&
              item.children &&
              item.children.length > 0
            ) {
              const newChildren = addRecursive(item.children);
              if (newChildren !== item.children) {
                const newItems = [...items];
                newItems[i] = {
                  ...item,
                  children: newChildren,
                } as SignalBlockData;
                return newItems;
              }
            }
          }
          return items;
        };

        return addRecursive(prev);
      });
    },
    [getSetter]
  );

  const deleteRule = useCallback(
    (ruleType: RuleType, id: string) => {
      getSetter(ruleType)((prev) => removeItemRecursive(prev, id));
    },
    [getSetter]
  );

  const updateRuleData = useCallback(
    (ruleType: RuleType, id: string, newSignalData: SignalBlockData) => {
      getSetter(ruleType)((prev) =>
        updateItemRecursive(prev, id, (item) => {
          if (item.type !== "signal") return item;

          return {
            ...item,
            ...newSignalData,
          } as SignalBlockData;
        })
      );
    },
    [getSetter]
  );

  const updateBlockCondition = useCallback(
    (target: TargetSlot, indicator: IndicatorDefinition) => {
      if (!target) return;
      const { ruleType, blockId, condition } = target;

      const setter = getSetter(ruleType);
      setter((prev) =>
        updateItemRecursive(prev, blockId, (item) => {
          if (item.type !== "signal") return item;

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
              timeframe: indicator.defaultTimeframe, // 지표의 기본 타임프레임 할당
            },
          };
          const updatedSignalItem: SignalBlockData = {
            ...item,
            [condition]: newConditionData,
          };
          return updatedSignalItem;
        })
      );
    },
    [getSetter]
  );

  const updateBlockTimeframe = useCallback(
    (target: TargetSlot, newTimeframe: string) => {
      if (!target) return;
      const { ruleType, blockId, condition } = target;

      const setter = getSetter(ruleType);
      setter((prev) =>
        updateItemRecursive(prev, blockId, (item) => {
          if (item.type !== "signal") return item;

          const currentCondition = item[condition];
          if (!currentCondition || currentCondition.type !== "indicator") {
            return item; // 지표 타입이 아니거나 조건이 없으면 변경하지 않음
          }

          // currentCondition.value가 객체이며 indicatorKey 속성을 가지고 있는지 확인
          if (
            typeof currentCondition.value !== "object" ||
            currentCondition.value === null ||
            !("indicatorKey" in currentCondition.value)
          ) {
            return item;
          }

          // currentCondition.value를 명시적으로 타입 단언
          const updatedValue = {
            ...(currentCondition.value as {
              indicatorKey: string;
              values: Record<string, any>;
              timeframe: string;
            }),
            timeframe: newTimeframe,
          };

          const updatedCondition: Condition = {
            ...currentCondition,
            value: updatedValue,
            // 이름도 업데이트하여 타임프레임이 반영되도록 할 수 있지만, 여기서는 UI에서 처리하는 것이 더 유연함
            // name: `${currentCondition.name.split('(')[0]}(${Object.values(updatedValue.values).join(',')}, ${newTimeframe})`,
          };

          const updatedSignalItem: SignalBlockData = {
            ...item,
            [condition]: updatedCondition,
          };
          return updatedSignalItem;
        })
      );
    },
    [getSetter]
  );

  return {
    buyRules,
    sellRules,
    addRule,
    deleteRule,
    updateRuleData,
    updateBlockCondition,
    updateBlockTimeframe, // 새로운 훅 반환
  };
}
