import { useEffect, useState, MutableRefObject } from "react";
import { UseFormReturn } from "react-hook-form";
import { Strategy, PositionRules, TargetCoin } from "@/types/strategy";

/**
 * Form 값 타입 (react-hook-form) - 두 파일에서 공통으로 사용
 * 주의: TPSL 필드들은 flat하게 정의됨 (nested tpslLogic이 아님)
 */
interface StrategyFormValues {
  name: string;
  description?: string | null;
  isPublic: boolean;
  takeProfitPct?: number | null;
  stopLossPct?: number | null;
  atrStopLossMultiplier?: number | null;
  atrTakeProfitMultiplier?: number | null;
  atrPeriod?: number | null;
}

/**
 * Zustand 전략 상태 타입 - useStrategyState() 반환 타입의 부분 정의
 */
interface StrategyStateType {
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  targetCoins: TargetCoin[];
  setStrategy: (
    newState: Partial<{
      longEntryRules: PositionRules | null;
      longExitRules: PositionRules | null;
      shortEntryRules: PositionRules | null;
      shortExitRules: PositionRules | null;
      targetCoins: TargetCoin[];
    }>
  ) => void;
  reset: () => void;
}

interface UseStrategyFormSyncOptions {
  formMethods: UseFormReturn<StrategyFormValues>;
  strategyState: StrategyStateType;
  strategyId?: string;
  isEditMode: boolean;
  existingStrategy?: Strategy | null;
  initialStrategyRef: MutableRefObject<Strategy | null>;
}

interface UseStrategyFormSyncReturn {
  tpslMode: "percentage" | "atr";
  setTpslMode: (mode: "percentage" | "atr") => void;
}

/**
 * React Hook Form과 Zustand 전략 상태를 동기화하는 훅
 *
 * 처리하는 패턴:
 * 1. 기존 전략 로드 → Form + Zustand 동기화
 * 2. 생성 모드 진입/전략 변경 → Form + Zustand 리셋
 * 3. 언마운트 시 → Zustand 클린업
 * 4. TPSL 모드(ATR/Percentage) 자동 감지
 */
export function useStrategyFormSync({
  formMethods,
  strategyState,
  strategyId,
  isEditMode,
  existingStrategy,
  initialStrategyRef,
}: UseStrategyFormSyncOptions): UseStrategyFormSyncReturn {
  const [tpslMode, setTpslMode] = useState<"percentage" | "atr">("percentage");

  // Destructure stable functions to avoid dependency cycles
  const { setStrategy, reset } = strategyState;
  const { reset: resetForm } = formMethods;

  // Effect 1: 기존 전략을 Form과 Zustand에 동기화
  useEffect(() => {
    if (isEditMode && existingStrategy) {
      initialStrategyRef.current = existingStrategy;
      formMethods.reset({
        name: existingStrategy.name,
        description: existingStrategy.description,
        isPublic: existingStrategy.isPublic,
        takeProfitPct: existingStrategy.tpslLogic?.takeProfitPct,
        stopLossPct: existingStrategy.tpslLogic?.stopLossPct,
        atrStopLossMultiplier:
          existingStrategy.tpslLogic?.atrStopLossMultiplier,
        atrTakeProfitMultiplier:
          existingStrategy.tpslLogic?.atrTakeProfitMultiplier,
        atrPeriod: existingStrategy.tpslLogic?.atrPeriod,
      });
      strategyState.setStrategy({
        longEntryRules: existingStrategy.longEntryRules,
        longExitRules: existingStrategy.longExitRules,
        shortEntryRules: existingStrategy.shortEntryRules,
        shortExitRules: existingStrategy.shortExitRules,
        targetCoins: existingStrategy.targetCoins,
      });
      if (existingStrategy.tpslLogic?.atrPeriod) {
        setTpslMode("atr");
      }
    }
  }, [
    isEditMode,
    existingStrategy,
    resetForm,
    setStrategy,
    initialStrategyRef,
  ]);

  // Effect 2: 생성 모드 진입 또는 strategyId 변경 시 리셋
  useEffect(() => {
    if (!isEditMode) {
      initialStrategyRef.current = null;
      strategyState.reset();
      formMethods.reset({
        name: "",
        description: "",
        isPublic: false,
      });
    }
  }, [strategyId, isEditMode, reset, resetForm, initialStrategyRef]);

  // Effect 3: 언마운트 시 Zustand 클린업
  useEffect(() => {
    return () => {
      strategyState.reset();
    };
  }, [reset]);

  return { tpslMode, setTpslMode };
}
