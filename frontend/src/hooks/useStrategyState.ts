// 파일 경로: frontend/src/hooks/useStrategyState.ts

"use client";

import { useState, useCallback } from "react";
import {
  LogicBlock,
  PositionRules,
  TpslLogic,
  TargetCoin,
  StrategyType,
  LogicOperator,
} from "@/types/strategy";

// --- 헬퍼 함수 (기존과 동일) ---
// ... updateBlockRecursive, removeBlockRecursive, updateRuleLogicRecursive ...

// --- useStrategyState 훅 ---
export function useStrategyState() {
  const [strategyState, setStrategyState] = useState({
    longEntryRules: null as PositionRules | null,
    longExitRules: null as PositionRules | null,
    shortEntryRules: null as PositionRules | null,
    shortExitRules: null as PositionRules | null,
    tpslLogic: null as TpslLogic | null,
    targetCoins: [] as TargetCoin[],
  });

  const setStrategy = useCallback((newState: Partial<typeof strategyState>) => {
    setStrategyState((prev) => ({ ...prev, ...newState }));
  }, []);

  // 🔽 핵심 수정: addRule 함수
  const addRule = useCallback(
    (
      ruleType: StrategyType,
      newBlock: LogicBlock,
      parentId: string | null = null,
      as: LogicOperator = "OR"
    ) => {
      setStrategyState((prev) => {
        const rulesetKey = `${ruleType}Rules` as keyof typeof prev;
        const currentRuleset = prev[rulesetKey];

        // 1. 규칙이 하나도 없을 때
        if (!currentRuleset) {
          return {
            ...prev,
            [rulesetKey]: { logic_operator: "OR", blocks: [newBlock] },
          };
        }

        // 2. 최상위 레벨에 OR 조건으로 추가할 때 (parentId가 없을 때)
        if (parentId === null) {
          return {
            ...prev,
            [rulesetKey]: {
              ...currentRuleset,
              blocks: [...currentRuleset.blocks, newBlock],
            },
          };
        }

        // 3. 재귀적으로 규칙을 추가 (AND 또는 OR)
        const addRecursive = (blocks: LogicBlock[]): LogicBlock[] => {
          const result: LogicBlock[] = [];
          for (const block of blocks) {
            if (block.id === parentId) {
              if (as === "AND") {
                // AND 조건: children으로 추가
                result.push({
                  ...block,
                  children: [...(block.children || []), newBlock],
                  logic_operator: "AND",
                });
              } else {
                // OR 조건: 같은 레벨의 다음 순서로 추가
                result.push(block);
                result.push(newBlock);
              }
            } else if (block.children) {
              // 자식 노드에서 재귀적으로 탐색
              const newChildren = addRecursive(block.children);
              result.push({ ...block, children: newChildren });
            } else {
              result.push(block);
            }
          }
          return result;
        };

        const newBlocks = addRecursive(currentRuleset.blocks);
        return {
          ...prev,
          [rulesetKey]: { ...currentRuleset, blocks: newBlocks },
        };
      });
    },
    []
  );

  // ... (deleteRule, updateRule 등 나머지 함수는 기존과 동일) ...

  const deleteRule = useCallback((ruleType: StrategyType, id: string) => {
    setStrategyState((prev) => {
      const rulesetKey = `${ruleType}Rules` as keyof typeof prev;
      const currentRuleset = prev[rulesetKey] as PositionRules | null;

      if (!currentRuleset) return prev;

      const newBlocks = removeBlockRecursive(currentRuleset.blocks, id);

      if (newBlocks.length === 0) {
        return { ...prev, [rulesetKey]: null };
      }

      return {
        ...prev,
        [rulesetKey]: { ...currentRuleset, blocks: newBlocks },
      };
    });
  }, []);

  const updateRule = useCallback(
    (ruleType: StrategyType, id: string, newBlock: LogicBlock) => {
      setStrategyState((prev) => {
        const rulesetKey = `${ruleType}Rules` as keyof typeof prev;
        const currentRuleset = prev[rulesetKey] as PositionRules | null;

        if (!currentRuleset) return prev;

        const newBlocks = updateBlockRecursive(
          currentRuleset.blocks,
          id,
          (block) => {
            return newBlock;
          }
        );

        return {
          ...prev,
          [rulesetKey]: { ...currentRuleset, blocks: newBlocks },
        };
      });
    },
    []
  );

  const updateRuleLogic = useCallback(
    (
      ruleType: StrategyType,
      blockId: string,
      slotKey: string,
      newValue: any
    ) => {
      setStrategyState((prev) => {
        const rulesetKey = `${ruleType}Rules` as keyof typeof prev;
        const currentRuleset = prev[rulesetKey] as PositionRules | null;

        if (!currentRuleset) return prev;

        const newBlocks = updateRuleLogicRecursive(
          currentRuleset.blocks,
          blockId,
          slotKey,
          newValue
        );

        return {
          ...prev,
          [rulesetKey]: { ...currentRuleset, blocks: newBlocks },
        };
      });
    },
    []
  );

  const setTpslLogic = useCallback((logic: TpslLogic | null) => {
    setStrategyState((prev) => ({ ...prev, tpslLogic: logic }));
  }, []);

  const setTargetCoins = useCallback((coins: TargetCoin[]) => {
    setStrategyState((prev) => ({ ...prev, targetCoins: coins }));
  }, []);

  return {
    ...strategyState,
    setStrategy,
    addRule,
    deleteRule,
    updateRule,
    updateRuleLogic,
    setTpslLogic,
    setTargetCoins,
  };
}

// --- 헬퍼 함수 (기존과 동일) ---
const updateBlockRecursive = (
  blocks: LogicBlock[],
  id: string,
  updater: (block: LogicBlock) => LogicBlock
): LogicBlock[] => {
  return blocks.map((block) => {
    if (block.id === id) {
      return updater(block);
    }
    if (block.children && block.children.length > 0) {
      const newChildren = updateBlockRecursive(block.children, id, updater);
      if (newChildren !== block.children) {
        return { ...block, children: newChildren };
      }
    }
    return block;
  });
};

const removeBlockRecursive = (
  blocks: LogicBlock[],
  id: string
): LogicBlock[] => {
  const filteredBlocks = blocks.filter((block) => block.id !== id);
  return filteredBlocks.map((block) => {
    if (block.children && block.children.length > 0) {
      const newChildren = removeBlockRecursive(block.children, id);
      if (newChildren !== block.children) {
        return { ...block, children: newChildren };
      }
    }
    return block;
  });
};

const updateRuleLogicRecursive = (
  blocks: LogicBlock[],
  blockId: string,
  slotKey: string,
  newValue: any
): LogicBlock[] => {
  return blocks.map((block) => {
    if (block.id === blockId) {
      return { ...block, [slotKey]: newValue };
    }
    if (block.children) {
      const newChildren = updateRuleLogicRecursive(
        block.children,
        blockId,
        slotKey,
        newValue
      );
      if (newChildren !== block.children) {
        return { ...block, children: newChildren };
      }
    }
    return block;
  });
};
