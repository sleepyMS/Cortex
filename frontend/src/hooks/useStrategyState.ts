"use client";

import { useState, useCallback } from "react";
import { nanoid } from "nanoid";

import {
  RuleItem,
  SignalBlockData,
  Condition,
  RuleType,
  TargetSlot,
  LogicOperator, // LogicOperator import 추가
} from "@/types/strategy"; // strategy.ts 파일에서 타입 정의를 가져옵니다.
import { IndicatorDefinition } from "@/lib/indicators";

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
        return { ...item, children: newChildren } as SignalBlockData; // 타입 단언 추가
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
      as: LogicOperator = "OR" // 'as' 파라미터의 타입을 LogicOperator로 명시
    ) => {
      const newSignal: SignalBlockData = {
        type: "signal",
        id: nanoid(),
        conditionA: null,
        operator: ">",
        conditionB: null,
        children: [], // SignalBlockData에 children 추가
        logicOperator: "AND", // SignalBlockData에 logicOperator 추가
      };
      // RuleItem이 이미 SignalBlockData 타입이므로 newSignal을 직접 할당
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
              // item.type이 "signal"일 때 children 속성에 접근
              if (item.type === "signal") {
                if (as === "AND") {
                  // 기존 children에 새로운 규칙 추가
                  newItems[i] = {
                    ...item,
                    children: [...item.children, newRule],
                  } as SignalBlockData; // 타입 단언
                } else {
                  // OR 조건으로 새로운 규칙을 현재 규칙 다음에 삽입
                  newItems.splice(i + 1, 0, newRule);
                }
              }
              return newItems;
            }
            // item.type이 "signal"일 때 children 속성에 접근
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
                } as SignalBlockData; // 타입 단언
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
          if (item.type !== "signal") return item; // item이 SignalBlockData가 아닐 경우 반환

          // item 자체가 SignalBlockData이므로 data 속성에 접근하지 않고 직접 업데이트
          return {
            ...item,
            ...newSignalData, // newSignalData의 모든 속성을 직접 복사하여 업데이트
          } as SignalBlockData; // 타입 단언 추가
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
          if (item.type !== "signal") return item; // item이 SignalBlockData가 아닐 경우 반환

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
          // item 자체가 SignalBlockData이므로 [condition] 키를 사용하여 직접 업데이트
          const updatedSignalItem: SignalBlockData = {
            ...item,
            [condition]: newConditionData,
          };
          return updatedSignalItem; // 업데이트된 SignalBlockData 반환
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
  };
}
