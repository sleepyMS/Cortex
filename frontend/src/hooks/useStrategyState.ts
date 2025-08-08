"use client";

import { useState, useCallback, useMemo } from "react";
import {
  LogicBlock,
  PositionRules,
  TargetCoin,
  StrategyType,
  LogicOperator,
} from "@/types/strategy";

// --- 헬퍼 함수 ---
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
      // @ts-ignore - Allow dynamic key assignment
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
      as: LogicOperator = "OR"
    ) => {
      setStrategyState((prev) => {
        const rulesetKey = `${ruleType}Rules` as keyof typeof strategyState;
        const currentRuleset = prev[rulesetKey];

        if (!currentRuleset) {
          return {
            ...prev,
            [rulesetKey]: { logicOperator: "OR", blocks: [newBlock] },
          };
        }

        if (parentId === null) {
          return {
            ...prev,
            [rulesetKey]: {
              ...currentRuleset,
              blocks: [...currentRuleset.blocks, newBlock],
            },
          };
        }

        const addRecursive = (blocks: LogicBlock[]): LogicBlock[] => {
          const result: LogicBlock[] = [];
          for (const block of blocks) {
            if (block.id === parentId) {
              if (as === "AND") {
                result.push({
                  ...block,
                  children: [...(block.children || []), newBlock],
                  logicOperator: "AND",
                });
              } else {
                result.push(block, newBlock);
              }
            } else if (block.children) {
              result.push({ ...block, children: addRecursive(block.children) });
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

  const deleteRule = useCallback((ruleType: StrategyType, id: string) => {
    setStrategyState((prev) => {
      const rulesetKey = `${ruleType}Rules` as keyof typeof strategyState;
      const currentRuleset = prev[rulesetKey];
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
        const rulesetKey = `${ruleType}Rules` as keyof typeof strategyState;
        const currentRuleset = prev[rulesetKey];
        if (!currentRuleset) return prev;
        const newBlocks = updateBlockRecursive(
          currentRuleset.blocks,
          id,
          () => newBlock
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
        const rulesetKey = `${ruleType}Rules` as keyof typeof strategyState;
        const currentRuleset = prev[rulesetKey];
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

  const setTargetCoins = useCallback((coins: TargetCoin[]) => {
    setStrategyState((prev) => ({ ...prev, targetCoins: coins }));
  }, []);

  return useMemo(
    () => ({
      ...strategyState,
      setStrategy,
      addRule,
      deleteRule,
      updateRule,
      updateRuleLogic,
      setTargetCoins,
    }),
    [
      strategyState,
      setStrategy,
      addRule,
      deleteRule,
      updateRule,
      updateRuleLogic,
      setTargetCoins,
    ]
  );
}
