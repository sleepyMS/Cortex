// file: frontend/src/hooks/useStrategyState.ts

"use client";

import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import {
  LogicBlock,
  PositionRules,
  TpslLogic,
  TargetCoin,
  StrategyType,
} from "@/types/strategy";

// --- 헬퍼 함수 ---
// 재귀적으로 로직 블록을 업데이트하는 함수
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

// 재귀적으로 로직 블록을 제거하는 함수
const removeBlockRecursive = (
  blocks: LogicBlock[],
  id: string
): LogicBlock[] => {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) => {
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

  const addRule = useCallback(
    (
      ruleType: StrategyType,
      newBlock: LogicBlock,
      parentId: string | null = null,
      as: "AND" | "OR" = "OR"
    ) => {
      setStrategyState((prev) => {
        const rulesetKey = `${ruleType}Rules` as keyof typeof prev;
        let currentRuleset = prev[rulesetKey] as PositionRules | null;

        if (!currentRuleset) {
          currentRuleset = { logic_operator: "OR", blocks: [newBlock] };
        } else if (parentId === null) {
          currentRuleset = {
            ...currentRuleset,
            blocks: [...currentRuleset.blocks, newBlock],
          };
        } else {
          // 부모 블록을 찾아 새로운 블록을 자식으로 추가
          const addRecursive = (blocks: LogicBlock[]): LogicBlock[] => {
            return blocks.map((block) => {
              if (block.id === parentId) {
                // 부모 블록의 logic_operator를 업데이트하고 children에 추가
                return {
                  ...block,
                  children: [...(block.children || []), newBlock],
                  logic_operator: as,
                } as LogicBlock;
              }
              if (block.children) {
                const newChildren = addRecursive(block.children);
                if (newChildren !== block.children) {
                  return { ...block, children: newChildren };
                }
              }
              return block;
            });
          };
          currentRuleset = {
            ...currentRuleset,
            blocks: addRecursive(currentRuleset.blocks),
          };
        }
        return { ...prev, [rulesetKey]: currentRuleset };
      });
    },
    []
  );

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
