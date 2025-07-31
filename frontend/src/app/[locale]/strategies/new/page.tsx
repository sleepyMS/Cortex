// frontend/src/app/[locale]/strategies/new/page.tsx

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { IndicatorHub } from "@/components/domain/strategy/IndicatorHub";
import { StrategyBuilderCanvas } from "@/components/domain/strategy/StrategyBuilderCanvas";
import { IndicatorDefinition } from "@/lib/indicators";

// useStrategyState 훅 임포트
import { useStrategyState } from "@/hooks/useStrategyState";
import { TargetSlot } from "@/types/strategy";

export default function NewStrategyPage() {
  const t = useTranslations("StrategyBuilder");

  // useStrategyState 훅을 사용하여 전략 상태 및 핸들러를 가져옵니다.
  const {
    buyRules,
    sellRules,
    addRule,
    deleteRule,
    updateRuleData,
    updateBlockCondition,
    updateBlockTimeframe, // 새로운 훅 함수 임포트
  } = useStrategyState();

  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot>(null);

  // handleSlotClick은 기존 로직과 동일하게 IndicatorHub를 엽니다.
  const handleSlotClick = (
    ruleType: "buy" | "sell",
    blockId: string,
    condition: "conditionA" | "conditionB"
  ) => {
    setCurrentTarget({ ruleType, blockId, condition });
    setIsHubOpen(true);
  };

  // handleIndicatorSelect는 useStrategyState의 updateBlockCondition을 호출하도록 변경합니다.
  const handleIndicatorSelect = (indicator: IndicatorDefinition) => {
    if (currentTarget) {
      updateBlockCondition(currentTarget, indicator);
    }
    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  // handleTimeframeChange는 RuleBlock에서 호출되어 useStrategyState의 updateBlockTimeframe을 호출합니다.
  const handleTimeframeChange = (target: TargetSlot, newTimeframe: string) => {
    if (target) {
      updateBlockTimeframe(target, newTimeframe); // useStrategyState의 함수 호출
    }
  };

  return (
    <AuthGuard>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
      />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-foreground">
          {t("title")}
        </h1>
        {/* StrategyBuilderCanvas에 필요한 모든 상태와 함수를 props로 전달합니다. */}
        <StrategyBuilderCanvas
          buyRules={buyRules}
          sellRules={sellRules}
          onAddRule={addRule}
          onDeleteRule={deleteRule}
          onUpdateRuleData={updateRuleData}
          onUpdateBlockCondition={updateBlockCondition}
          onSlotClick={handleSlotClick}
          onTimeframeChange={handleTimeframeChange} // 새로운 prop 전달
        />
      </div>
    </AuthGuard>
  );
}
