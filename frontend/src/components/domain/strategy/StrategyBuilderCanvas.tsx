"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

import { useStrategyState } from "@/hooks/useStrategyState";
import {
  RuleItem,
  RuleType,
  TargetSlot,
  SignalBlockData,
  LogicOperator,
} from "@/types/strategy";
import { Button } from "@/components/ui/Button";
import { RuleBlock } from "./RuleBlock";
import { IndicatorHub } from "./IndicatorHub";
import { PlusCircle } from "lucide-react";
import { IndicatorDefinition } from "@/lib/indicators";
import clsx from "clsx";

// --- 내부 렌더링 컴포넌트 ---
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
  const t = useTranslations("StrategyBuilder");

  return (
    <div className="relative space-y-2">
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {/* OR 조건 사이에 시각적 구분선 추가 */}
          {index > 0 && item.logicOperator === "OR" && (
            <div className="flex items-center justify-center my-4">
              <span className="bg-background text-muted-foreground px-3 py-1 rounded-full text-xs font-semibold border border-dashed border-border shadow-inner">
                {t("orOperator")}
              </span>
            </div>
          )}
          <div className="relative">
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
              item.children.length > 0 && (
                <div
                  // ✨ 기존 pl-8 대신 반응형 클래스 적용: 모바일에서는 pl-6, lg 이상에서는 pl-8
                  className={clsx("relative mt-2 pl-6 lg:pl-8", {
                    "border-l-2 border-slate-700 dark:border-slate-500":
                      item.logicOperator === "AND",
                  })}
                >
                  {/* AND 연산자 라벨 */}
                  {item.logicOperator === "AND" && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 rounded-full px-2 text-xs bg-primary text-primary-foreground border-primary hover:bg-primary-foreground hover:text-primary transition-colors whitespace-nowrap"
                      >
                        {t("andOperator")}
                      </Button>
                    </div>
                  )}

                  <div
                    className={clsx({
                      "space-y-1": item.logicOperator === "AND",
                      "space-y-2": item.logicOperator === "OR",
                    })}
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
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// --- 메인 캔버스 컴포넌트 ---
export function StrategyBuilderCanvas() {
  const t = useTranslations("StrategyBuilder");
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
      {/* ✨ 모바일에서 좌우 패딩을 줄여 더 많은 공간 확보 (기존 p-4 md:p-6 lg:p-8 유지) */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 p-4 md:p-6 lg:p-8">
        {/* 매수 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-4 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50">
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground">
              {t("buyConditionsTitle")}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addRule("buy")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")}
            </Button>
          </div>
          {buyRules.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
              <p className="mb-2">{t("noBuyConditionsYet")}</p>
              <Button onClick={() => addRule("buy")} variant="secondary">
                <PlusCircle className="mr-2 h-4 w-4" />{" "}
                {t("addFirstBuyCondition")}
              </Button>
            </div>
          )}
          {renderRuleList(buyRules, "buy")}
        </div>

        {/* 매도 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-4 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50">
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground">
              {t("sellConditionsTitle")}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addRule("sell")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")}
            </Button>
          </div>
          {sellRules.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
              <p className="mb-2">{t("noSellConditionsYet")}</p>
              <Button onClick={() => addRule("sell")} variant="secondary">
                <PlusCircle className="mr-2 h-4 w-4" />{" "}
                {t("addFirstSellCondition")}
              </Button>
            </div>
          )}
          {renderRuleList(sellRules, "sell")}
        </div>
      </div>
    </>
  );
}
