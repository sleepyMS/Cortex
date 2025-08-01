// frontend/src/components/domain/strategy/StrategyBuilderCanvas.tsx

"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";

import {
  RuleItem,
  RuleType,
  TargetSlot,
  SignalBlockData,
  LogicOperator,
  ConditionType,
} from "@/types/strategy";
import { Button } from "@/components/ui/Button";
import { RuleBlock } from "./RuleBlock";
import { PlusCircle } from "lucide-react";
import { IndicatorDefinition } from "@/lib/indicators";
import clsx from "clsx";

// StrategyBuilderCanvasProps 인터페이스 정의
interface StrategyBuilderCanvasProps {
  buyRules: RuleItem[];
  sellRules: RuleItem[];
  onAddRule: (
    ruleType: RuleType,
    parentId: string | null,
    as: LogicOperator
  ) => void;
  onDeleteRule: (ruleType: RuleType, id: string) => void;
  onUpdateRuleData: (
    ruleType: RuleType,
    id: string,
    newSignalData: SignalBlockData
  ) => void;
  onUpdateBlockCondition: (
    target: TargetSlot,
    indicator: IndicatorDefinition
  ) => void;
  onSlotClick: (
    ruleType: RuleType,
    blockId: string,
    condition: ConditionType
  ) => void;
  // 👈 onTimeframeChange의 시그니처는 page.tsx에서 받는 그대로 유지
  onTimeframeChange: (target: TargetSlot, newTimeframe: string) => void;
}

// --- 내부 렌더링 컴포넌트 ---
interface RecursiveRuleRendererProps {
  items: RuleItem[];
  depth?: number;
  ruleType: RuleType;
  // 👈 stateAndHandlers.onTimeframeChange 시그니처를 RuleBlock이 기대하는 3개 인자로 변경
  stateAndHandlers: {
    onAddRule: (parentId: string, as: "AND" | "OR") => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string, newSignalData: SignalBlockData) => void;
    onSlotClick: (blockId: string, condition: ConditionType) => void;
    onTimeframeChange: (
      // 👈 여기 시그니처 변경
      ruleType: RuleType,
      blockId: string,
      conditionType: ConditionType,
      newTimeframe: string
    ) => void;
  };
}

function RecursiveRuleRenderer({
  items,
  depth = 0,
  ruleType,
  stateAndHandlers,
}: RecursiveRuleRendererProps) {
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
              onTimeframeChange={stateAndHandlers.onTimeframeChange} // 👈 변경된 시그니처의 함수 전달
              ruleType={ruleType} // 👈 ruleType prop 전달
            />
            {item.type === "signal" &&
              item.children &&
              item.children.length > 0 && (
                <div
                  className={clsx("relative mt-2 pl-8", {
                    // AND 그룹에만 연결선 적용
                    "border-l-2 border-slate-700 dark:border-slate-500":
                      item.logicOperator === "AND",
                  })}
                >
                  {/* AND 연산자 라벨 */}
                  {item.logicOperator === "AND" && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 z-10">
                      <Button
                        type="button"
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
export function StrategyBuilderCanvas({
  buyRules,
  sellRules,
  onAddRule,
  onDeleteRule,
  onUpdateRuleData,
  onUpdateBlockCondition,
  onSlotClick,
  onTimeframeChange, // 👈 새로운 props 받기
}: StrategyBuilderCanvasProps) {
  const t = useTranslations("StrategyBuilder");

  const renderRuleList = (rules: RuleItem[], ruleType: RuleType) => {
    const stateAndHandlers = {
      onAddRule: (parentId: string, as: "AND" | "OR") =>
        onAddRule(ruleType, parentId, as),
      onDelete: (id: string) => onDeleteRule(ruleType, id),
      onUpdate: (id: string, newSignalData: SignalBlockData) =>
        onUpdateRuleData(ruleType, id, newSignalData),
      onSlotClick: (blockId: string, condition: ConditionType) =>
        onSlotClick(ruleType, blockId, condition),
      // 👈 RuleBlock으로 전달될 onTimeframeChange 함수:
      // 이 함수는 3개 인자를 받아, StrategyBuilderCanvasProps의 onTimeframeChange (2개 인자)를 호출
      onTimeframeChange: (
        targetRuleType: RuleType,
        blockId: string,
        conditionType: ConditionType,
        newTimeframe: string
      ) =>
        onTimeframeChange(
          { ruleType: targetRuleType, blockId, condition: conditionType },
          newTimeframe
        ),
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
      <div className="grid grid-cols-1 gap-8">
        {/* 매수 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-4 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50 overflow-x-auto">
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground">
              {t("buyConditionsTitle")}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddRule("buy", null, "OR")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")}
            </Button>
          </div>
          {buyRules.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
              <p className="mb-2">{t("noBuyConditionsYet")}</p>
              <Button
                type="button"
                onClick={() => onAddRule("buy", null, "OR")}
                variant="secondary"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("addFirstBuyCondition")}
              </Button>
            </div>
          )}
          {renderRuleList(buyRules, "buy")}
        </div>

        {/* 매도 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-4 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50 overflow-x-auto">
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground">
              {t("sellConditionsTitle")}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddRule("sell", null, "OR")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")}
            </Button>
          </div>
          {sellRules.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
              <p className="mb-2">{t("noSellConditionsYet")}</p>
              <Button
                type="button"
                onClick={() => onAddRule("sell", null, "OR")}
                variant="secondary"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
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
