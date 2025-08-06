// file: frontend/src/components/domain/strategy/RecursiveRuleRenderer.tsx

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { LogicBlock, StrategyType, LogicOperator } from "@/types/strategy";
import { RuleBlock } from "./RuleBlock";
import { Button } from "@/components/ui/Button";

// --- 타입 정의 ---
interface RecursiveRuleRendererProps {
  items: LogicBlock[];
  depth?: number;
  ruleType: StrategyType;
  stateAndHandlers: {
    onAddRule: (
      newBlock: LogicBlock,
      parentId: string,
      as: LogicOperator
    ) => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string, newBlock: LogicBlock) => void;
    onSlotClick: (
      blockId: string,
      logicType: LogicBlock["type"],
      slotKey: string
    ) => void;
  };
}

export function RecursiveRuleRenderer({
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
          {/* 'OR' 구분선: 중첩된 레벨에서도 보이도록 depth 조건 제거 */}
          {index > 0 && (
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
              ruleType={ruleType}
            />
            {/* 자식 규칙 렌더링은 이 컴포넌트가 전담 */}
            {item.children && item.children.length > 0 && (
              <div
                className={clsx("relative mt-2 pl-8", {
                  // 'AND' 조건일 때 왼쪽 테두리로 시각적 그룹화
                  "border-l-2 border-primary/50 dark:border-primary/70":
                    item.logic_operator === "AND",
                })}
              >
                {item.logic_operator === "AND" && (
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
                {/* 'AND' 그룹 내 자식들은 더 촘촘한 간격으로 배치 */}
                <div
                  className={clsx({
                    "space-y-1": item.logic_operator === "AND",
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
