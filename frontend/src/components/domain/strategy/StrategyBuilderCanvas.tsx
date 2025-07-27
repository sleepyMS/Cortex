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
  // onSlotClick은 StrategyBuilderCanvas에서 직접 호출되는 것이 아니라,
  // page.tsx의 handleSlotClick을 통해 IndicatorHub를 여는 역할만 하므로 RuleBlock에 전달됩니다.
  // RuleBlock의 onSlotClick은 (blockId: string, condition: ConditionType) 형태이므로 이 형태에 맞춥니다.
  onSlotClick: (
    ruleType: RuleType,
    blockId: string,
    condition: ConditionType
  ) => void;
}

// --- 내부 렌더링 컴포넌트 ---
// RecursiveRuleRenderer의 props 타입도 명확히 정의합니다.
interface RecursiveRuleRendererProps {
  items: RuleItem[];
  depth?: number;
  ruleType: RuleType;
  // stateAndHandlers는 이제 StrategyBuilderCanvas의 props를 직접 전달받는 형태가 됩니다.
  stateAndHandlers: {
    onAddRule: (parentId: string, as: "AND" | "OR") => void; // RuleBlock에서 호출될 함수 시그니처
    onDelete: (id: string) => void; // RuleBlock에서 호출될 함수 시그니처
    onUpdate: (id: string, newSignalData: SignalBlockData) => void; // RuleBlock에서 호출될 함수 시그니처
    onSlotClick: (blockId: string, condition: ConditionType) => void; // RuleBlock에서 호출될 함수 시그니처
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
// ✨ StrategyBuilderCanvasProps 인터페이스를 적용합니다.
export function StrategyBuilderCanvas({
  buyRules,
  sellRules,
  onAddRule,
  onDeleteRule,
  onUpdateRuleData,
  onUpdateBlockCondition, // 새로운 props 추가
  onSlotClick, // onSlotClick도 props로 받습니다.
}: StrategyBuilderCanvasProps) {
  // ✨ 인터페이스 적용
  const t = useTranslations("StrategyBuilder");

  const renderRuleList = (rules: RuleItem[], ruleType: RuleType) => {
    // ✨ stateAndHandlers 객체는 이제 StrategyBuilderCanvas의 props를 사용하여 구성합니다.
    const stateAndHandlers = {
      onAddRule: (parentId: string, as: "AND" | "OR") =>
        onAddRule(ruleType, parentId, as), // prop으로 받은 onAddRule 호출
      onDelete: (id: string) => onDeleteRule(ruleType, id), // prop으로 받은 onDeleteRule 호출
      onUpdate: (id: string, newSignalData: SignalBlockData) =>
        onUpdateRuleData(ruleType, id, newSignalData), // prop으로 받은 onUpdateRuleData 호출
      // onSlotClick은 RuleBlock에서 호출될 때 RuleBlock의 ID와 conditionType만 전달합니다.
      // RuleBlock의 onSlotClick prop은 (blockId: string, condition: ConditionType) 형태여야 합니다.
      onSlotClick: (blockId: string, condition: ConditionType) =>
        onSlotClick(ruleType, blockId, condition), // prop으로 받은 onSlotClick 호출
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
      <div className="grid grid-cols-1 gap-8 p-4 md:p-6 lg:p-8">
        {/* 매수 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-4 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50 overflow-x-auto">
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground">
              {t("buyConditionsTitle")}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddRule("buy", null, "OR")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {" "}
              {/* ✨ onClick 핸들러 변경 */}
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")}
            </Button>
          </div>
          {buyRules.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
              <p className="mb-2">{t("noBuyConditionsYet")}</p>
              <Button
                onClick={() => onAddRule("buy", null, "OR")}
                variant="secondary"
              >
                {" "}
                {/* ✨ onClick 핸들러 변경 */}
                <PlusCircle className="mr-2 h-4 w-4" />{" "}
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
              variant="ghost"
              size="sm"
              onClick={() => onAddRule("sell", null, "OR")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {" "}
              {/* ✨ onClick 핸들러 변경 */}
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")}
            </Button>
          </div>
          {sellRules.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
              <p className="mb-2">{t("noSellConditionsYet")}</p>
              <Button
                onClick={() => onAddRule("sell", null, "OR")}
                variant="secondary"
              >
                {" "}
                {/* ✨ onClick 핸들러 변경 */}
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
