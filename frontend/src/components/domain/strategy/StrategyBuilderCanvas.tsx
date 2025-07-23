"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl"; // useTranslations 임포트 유지

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
  const t = useTranslations("StrategyBuilder"); // ✨ useTranslations 훅 추가

  return (
    <div className="relative space-y-2">
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {/* OR 조건 사이에 시각적 구분선 추가 */}
          {index > 0 &&
            item.logicOperator === "OR" && ( // depth === 0 조건 제거. 중첩된 OR에도 적용 가능하도록.
              <div className="flex items-center justify-center my-4">
                <span className="bg-background text-muted-foreground px-3 py-1 rounded-full text-xs font-semibold border border-dashed border-border shadow-inner">
                  {" "}
                  {/* shadow-inner 추가 */}
                  {t("orOperator")} {/* ✨ 언어팩 사용 */}
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
                  className={clsx("relative mt-2 pl-8", {
                    "border-l-2 border-slate-700 dark:border-slate-500":
                      item.logicOperator === "AND",
                  })}
                >
                  {/* AND 연산자 라벨 */}
                  {item.logicOperator === "AND" && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10">
                      {" "}
                      {/* z-10 추가하여 다른 요소 위로 오게 */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 rounded-full px-2 text-xs bg-primary text-primary-foreground border-primary hover:bg-primary-foreground hover:text-primary transition-colors whitespace-nowrap" // whitespace-nowrap 추가
                      >
                        {t("andOperator")} {/* ✨ 언어팩 사용 */}
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
  const t = useTranslations("StrategyBuilder"); // ✨ useTranslations 훅 사용
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
    // 이 부분은 Context API 등을 사용하여 현재 매수/매도 캔버스 상태를 추적하는 것이 이상적입니다.
    // 현재는 'buy'로 가정하고 진행합니다.
    const ruleType: RuleType = "buy"; // 예시: 현재 'buy'로 고정되어 있음. 실제 구현 시 동적으로 결정 필요.
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
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 p-4 md:p-6 lg:p-8">
        {" "}
        {/* ✨ 전체 컨테이너 패딩 추가 */}
        {/* 매수 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-6 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50">
          {" "}
          {/* ✨ 스타일 개선 */}
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            {" "}
            {/* ✨ 하단 border 추가 */}
            <h2 className="text-2xl font-bold text-foreground">
              {t("buyConditionsTitle")} {/* ✨ 언어팩 사용 */}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addRule("buy")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {" "}
              {/* ✨ 버튼 색상 조정 */}
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")} {/* ✨ 언어팩 사용 */}
            </Button>
          </div>
          {buyRules.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
              <p className="mb-2">{t("noBuyConditionsYet")}</p>{" "}
              {/* ✨ 언어팩 사용 */}
              <Button onClick={() => addRule("buy")} variant="secondary">
                <PlusCircle className="mr-2 h-4 w-4" />{" "}
                {t("addFirstBuyCondition")} {/* ✨ 언어팩 사용 */}
              </Button>
            </div>
          )}
          {renderRuleList(buyRules, "buy")}
        </div>
        {/* 매도 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-6 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50">
          {" "}
          {/* ✨ 스타일 개선 */}
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            {" "}
            {/* ✨ 하단 border 추가 */}
            <h2 className="text-2xl font-bold text-foreground">
              {t("sellConditionsTitle")} {/* ✨ 언어팩 사용 */}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => addRule("sell")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {" "}
              {/* ✨ 버튼 색상 조정 */}
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")} {/* ✨ 언어팩 사용 */}
            </Button>
          </div>
          {sellRules.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
              <p className="mb-2">{t("noSellConditionsYet")}</p>{" "}
              {/* ✨ 언어팩 사용 */}
              <Button onClick={() => addRule("sell")} variant="secondary">
                <PlusCircle className="mr-2 h-4 w-4" />{" "}
                {t("addFirstSellCondition")} {/* ✨ 언어팩 사용 */}
              </Button>
            </div>
          )}
          {renderRuleList(sellRules, "sell")}
        </div>
      </div>
    </>
  );
}
