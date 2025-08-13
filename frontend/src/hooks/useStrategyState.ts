// file: src/hooks/useStrategyState.ts

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  PositionRules,
  TargetCoin,
  LogicBlock,
  StrategyType,
  LogicOperator,
} from "@/types/strategy";

// --- 스토어의 상태(State)와 액션(Actions) 타입 정의 ---
interface StrategyState {
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  targetCoins: TargetCoin[];
}

// 👇 [개선] 'longEntryRules', 'longExitRules' 등 규칙 세트의 키를 나타내는 타입을 만듭니다.
type RulesetKey = `${StrategyType}Rules`;

interface StrategyActions {
  setStrategy: (newState: Partial<StrategyState>) => void;
  addRule: (
    ruleType: StrategyType,
    newBlock: LogicBlock,
    parentId: string | null,
    as?: LogicOperator
  ) => void;
  updateRule: (
    ruleType: StrategyType,
    blockId: string,
    updater: (block: LogicBlock) => LogicBlock
  ) => void;
  updateRuleLogic: (
    ruleType: StrategyType,
    blockId: string,
    key: string,
    value: any
  ) => void;
  deleteRule: (ruleType: StrategyType, blockId: string) => void;
  setTargetCoins: (coins: TargetCoin[]) => void;
  reset: () => void;
}

// --- 스토어의 초기 상태 ---
const initialState: StrategyState = {
  longEntryRules: null,
  longExitRules: null,
  shortEntryRules: null,
  shortExitRules: null,
  targetCoins: [],
};

// --- 재귀 헬퍼 함수 ---
const findAndModifyBlock = (
  blocks: LogicBlock[],
  id: string,
  action: (blocks: LogicBlock[], index: number) => void
): boolean => {
  const index = blocks.findIndex((b) => b.id === id);
  if (index !== -1) {
    action(blocks, index);
    return true;
  }
  for (const block of blocks) {
    if (block.children && findAndModifyBlock(block.children, id, action)) {
      return true;
    }
  }
  return false;
};

// --- Zustand 스토어 생성 ---
export const useStrategyState = create<StrategyState & StrategyActions>()(
  immer((set) => ({
    ...initialState,

    setStrategy: (newState) =>
      set((state) => {
        Object.assign(state, newState);
      }),

    addRule: (ruleType, newBlock, parentId, as = "OR") =>
      set((state) => {
        // 👇 [개선] 'longEntry' -> 'longEntryRules' 와 같이 올바른 키 이름을 조합합니다.
        const rulesetKey: RulesetKey = `${ruleType}Rules`;
        const ruleset = state[rulesetKey];

        if (!ruleset) {
          state[rulesetKey] = { logicOperator: "OR", blocks: [newBlock] };
          return;
        }

        if (!parentId) {
          ruleset.blocks.push(newBlock);
          return;
        }

        findAndModifyBlock(ruleset.blocks, parentId, (blocks, index) => {
          if (as === "AND") {
            const parentBlock = blocks[index];
            if (!parentBlock.children) parentBlock.children = [];
            parentBlock.children.push(newBlock);
            parentBlock.logicOperator = "AND";
          } else {
            blocks.splice(index + 1, 0, newBlock);
          }
        });
      }),

    updateRule: (ruleType, blockId, updater) =>
      set((state) => {
        const rulesetKey: RulesetKey = `${ruleType}Rules`;
        const ruleset = state[rulesetKey];
        if (ruleset) {
          findAndModifyBlock(ruleset.blocks, blockId, (blocks, index) => {
            blocks[index] = updater(blocks[index]);
          });
        }
      }),

    updateRuleLogic: (ruleType, blockId, key, value) =>
      set((state) => {
        const rulesetKey: RulesetKey = `${ruleType}Rules`;
        const ruleset = state[rulesetKey];
        if (ruleset) {
          findAndModifyBlock(ruleset.blocks, blockId, (blocks, index) => {
            (blocks[index] as any)[key] = value;
          });
        }
      }),

    deleteRule: (ruleType, blockId) =>
      set((state) => {
        const rulesetKey: RulesetKey = `${ruleType}Rules`;
        const ruleset = state[rulesetKey];
        if (ruleset) {
          findAndModifyBlock(ruleset.blocks, blockId, (blocks, index) => {
            blocks.splice(index, 1);
          });
          if (ruleset.blocks.length === 0) {
            state[rulesetKey] = null;
          }
        }
      }),

    setTargetCoins: (coins) =>
      set((state) => {
        state.targetCoins = coins;
      }),

    reset: () => set(initialState),
  }))
);
