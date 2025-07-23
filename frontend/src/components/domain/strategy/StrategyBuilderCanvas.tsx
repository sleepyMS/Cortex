"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

import { useStrategyState } from "@/hooks/useStrategyState";
import {
  RuleItem,
  RuleType,
  TargetSlot,
  SignalBlockData,
} from "@/types/strategy";
import { Button } from "@/components/ui/Button";
import { RuleBlock } from "./RuleBlock";
import { IndicatorHub } from "./IndicatorHub";
import { PlusCircle } from "lucide-react";
import { IndicatorDefinition } from "@/lib/indicators";

// --- 내부 렌더링 컴포넌트 ---
// StrategyBuilderCanvas.tsx
function RecursiveRuleRenderer({
  items,
  depth = 0,
  ruleType,
  stateAndHandlers,
}: {
  items: RuleItem[];
  depth?: number;
  ruleType: RuleType;
  stateAndHandlers: any;
}) {
  return (
    <div className="space-y-2">
      {" "}
      {/* 이 space-y-2는 최상위 OR 조건 간격으로 사용 */}
      {items.map((item, index) => (
        <div key={item.id}>
          <RuleBlock
            item={item}
            depth={depth}
            onAddRule={stateAndHandlers.onAddRule}
            onDelete={stateAndHandlers.onDelete}
            onUpdate={stateAndHandlers.onUpdate}
            onSlotClick={stateAndHandlers.onSlotClick}
          />
          {item.type === "signal" &&
            item.children &&
            item.children.length > 0 && ( // item이 SignalBlockData일 때만 children 처리
              <div className="relative mt-2 border-l-2 border-slate-700 pl-6">
                {" "}
                {/* 이 부분은 자식 블록과의 연결 선 및 기본 들여쓰기 */}
                <div className="absolute -left-3.5 top-1/2 -translate-y-1/2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 rounded-full px-2 text-xs"
                  >
                    {item.logicOperator}{" "}
                    {/* SignalBlockData의 logicOperator 사용 */}
                  </Button>
                </div>
                {/* AND 조건을 위한 더 가깝게, OR은 space-y-2 유지 */}
                <div
                  className={
                    item.logicOperator === "AND" ? "space-y-1" : "space-y-2"
                  }
                >
                  <RecursiveRuleRenderer
                    items={item.children}
                    depth={depth + 1}
                    ruleType={ruleType}
                    stateAndHandlers={stateAndHandlers}
                  />
                </div>
              </div>
            )}
          {/* OR 조건 블록 사이의 간격은 div.space-y-2 (최상위) 또는 GroupBlock.tsx 내부에서 처리됩니다. */}
        </div>
      ))}
    </div>
  );
}

// --- 메인 캔버스 컴포넌트 ---
export function StrategyBuilderCanvas() {
  const t = useTranslations("StrategyBuilder.form");
  const {
    buyRules,
    sellRules,
    addRule,
    deleteRule,
    updateRuleData,
    updateBlockCondition,
  } = useStrategyState();

  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot | null>(null);

  const openHubWithTarget = (
    itemId: string,
    condition: "conditionA" | "conditionB"
  ) => {
    // TODO: 현재 활성화된 캔버스(buy/sell)를 감지하는 로직 필요
    const ruleType: RuleType = "buy";
    setCurrentTarget({ ruleType, blockId: itemId, condition });
    setIsHubOpen(true);
  };

  const handleIndicatorSelect = (indicator: IndicatorDefinition) => {
    if (currentTarget) {
      updateBlockCondition(currentTarget, indicator);
    }
    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  const renderRuleList = (rules: RuleItem[], ruleType: RuleType) => {
    const stateAndHandlers = {
      onAddRule: (parentId: string, as: "AND" | "OR") =>
        addRule(ruleType, parentId, as),
      onDelete: (id: string) => deleteRule(ruleType, id),
      onUpdate: (id: string, newSignalData: SignalBlockData) =>
        updateRuleData(ruleType, id, newSignalData),
      onSlotClick: openHubWithTarget,
    };

    return (
      <RecursiveRuleRenderer
        items={rules}
        ruleType={ruleType}
        stateAndHandlers={stateAndHandlers}
      />
    );
  };

  return (
    <>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* 매수 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-lg bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">매수 조건</h2>
            <Button variant="ghost" size="sm" onClick={() => addRule("buy")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              최상위 조건 추가
            </Button>
          </div>
          {renderRuleList(buyRules, "buy")}
        </div>

        {/* 매도 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-lg bg-secondary/30 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">매도 조건</h2>
            <Button variant="ghost" size="sm" onClick={() => addRule("sell")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              최상위 조건 추가
            </Button>
          </div>
          {renderRuleList(sellRules, "sell")}
        </div>
      </div>
    </>
  );
}
