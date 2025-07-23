// frontend/src/app/[locale]/strategies/new/page.tsx

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { IndicatorHub } from "@/components/domain/strategy/IndicatorHub";
import { StrategyBuilderCanvas } from "@/components/domain/strategy/StrategyBuilderCanvas";
import { IndicatorDefinition } from "@/lib/indicators";

// ✨ useStrategyState 훅 임포트
import { useStrategyState } from "@/hooks/useStrategyState";

// TargetSlot 타입 정의는 useStrategyState 훅에서 정의된 것을 사용하는 것이 더 좋습니다.
// 여기서는 IndicatorHub와 handleSlotClick에 직접 사용되므로 일단 유지합니다.
type TargetSlot = {
  ruleType: "buy" | "sell";
  blockId: string;
  condition: "conditionA" | "conditionB";
} | null;

export default function NewStrategyPage() {
  const t = useTranslations("StrategyBuilder");

  // ✨ useStrategyState 훅을 사용하여 전략 상태 및 핸들러를 가져옵니다.
  const {
    buyRules,
    sellRules,
    addRule,
    deleteRule,
    updateRuleData,
    updateBlockCondition,
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
      updateBlockCondition(currentTarget, indicator); // ✨ useStrategyState의 함수 호출
    }
    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  return (
    <AuthGuard>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
      />
      {/* ✨ 변경: PageWrapper가 아닌 이 페이지 자체에 레이아웃 클래스 적용 */}
      {/* max-w-7xl 대신 max-w-5xl을 사용하여 Header/Footer와 일관성을 유지합니다. */}
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-foreground">
          {t("title")}
        </h1>
        {/* 👇 StrategyBuilderCanvas에 필요한 모든 상태와 함수를 props로 전달합니다. */}
        <StrategyBuilderCanvas
          buyRules={buyRules}
          sellRules={sellRules}
          onAddRule={addRule} // ✨ props 이름 변경 및 useStrategyState의 함수 연결
          onDeleteRule={deleteRule} // ✨ props 이름 변경 및 useStrategyState의 함수 연결
          onUpdateRuleData={updateRuleData} // ✨ props 이름 변경 및 useStrategyState의 함수 연결
          onUpdateBlockCondition={updateBlockCondition} // ✨ 새로운 props 추가
          onSlotClick={handleSlotClick}
        />
      </div>
    </AuthGuard>
  );
}
