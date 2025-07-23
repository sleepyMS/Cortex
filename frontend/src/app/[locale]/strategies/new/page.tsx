"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { nanoid } from "nanoid";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { IndicatorHub } from "@/components/domain/strategy/IndicatorHub";
import { StrategyBuilderCanvas } from "@/components/domain/strategy/StrategyBuilderCanvas";
import { SignalBlockData } from "@/components/domain/strategy/RuleBlock";
import { IndicatorDefinition } from "@/lib/indicators";

type TargetSlot = {
  ruleType: "buy" | "sell";
  blockId: string;
  condition: "conditionA" | "conditionB";
} | null;

export default function NewStrategyPage() {
  const t = useTranslations("StrategyBuilder");
  const [buyRules, setBuyRules] = useState<SignalBlockData[]>([]);
  const [sellRules, setSellRules] = useState<SignalBlockData[]>([]);

  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot>(null);

  // 모든 핸들러 함수들을 이제 부모인 이 페이지에서 관리합니다.
  const addSignalBlock = (ruleType: "buy" | "sell") => {
    const newBlock: SignalBlockData = {
      id: nanoid(),
      conditionA: null,
      operator: ">",
      conditionB: null,
    };
    const setter = ruleType === "buy" ? setBuyRules : setSellRules;
    setter((prev) => [...prev, newBlock]);
  };
  const deleteSignalBlock = (ruleType: "buy" | "sell", blockId: string) => {
    const setter = ruleType === "buy" ? setBuyRules : setSellRules;
    setter((prev) => prev.filter((block) => block.id !== blockId));
  };
  const updateSignalBlock = (
    ruleType: "buy" | "sell",
    blockId: string,
    updatedBlock: SignalBlockData
  ) => {
    const setter = ruleType === "buy" ? setBuyRules : setSellRules;
    setter((prev) =>
      prev.map((block) => (block.id === blockId ? updatedBlock : block))
    );
  };
  const handleSlotClick = (
    ruleType: "buy" | "sell",
    blockId: string,
    condition: "conditionA" | "conditionB"
  ) => {
    setCurrentTarget({ ruleType, blockId, condition });
    setIsHubOpen(true);
  };
  const handleIndicatorSelect = (indicator: IndicatorDefinition) => {
    if (!currentTarget) return;
    const { ruleType, blockId, condition } = currentTarget;
    const ruleUpdater = (blocks: SignalBlockData[]) =>
      blocks.map((block) => {
        if (block.id === blockId) {
          const newCondition = {
            type: "indicator" as const,
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
          return { ...block, [condition]: newCondition };
        }
        return block;
      });
    if (ruleType === "buy") setBuyRules(ruleUpdater);
    else setSellRules(ruleUpdater);
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
      <div className="container mx-auto max-w-7xl py-10">
        <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>
        {/* 👇 자식 컴포넌트에 필요한 모든 상태와 함수를 props로 전달합니다. */}
        <StrategyBuilderCanvas
          buyRules={buyRules}
          sellRules={sellRules}
          onAddBlock={addSignalBlock}
          onDeleteBlock={deleteSignalBlock}
          onUpdateBlock={updateSignalBlock}
          onSlotClick={handleSlotClick}
        />
      </div>
    </AuthGuard>
  );
}
