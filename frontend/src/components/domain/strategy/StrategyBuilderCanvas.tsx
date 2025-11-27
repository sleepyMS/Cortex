"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { PlusCircle, Maximize2, Minimize2 } from "lucide-react";

import {
  LogicBlock,
  PositionRules,
  StrategyType,
  LogicOperator,
} from "@/types/strategy";
import { Button } from "@/components/ui/Button";
import { RuleBlock } from "./RuleBlock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

// ... (인터페이스 정의는 기존과 동일하게 유지) ...
interface StrategyBuilderCanvasProps {
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  onAddTopLevelRule: (ruleType: StrategyType) => void;
  onTriggerNestedAddRule: (
    ruleType: StrategyType,
    parentId: string,
    as: LogicOperator
  ) => void;
  onTriggerOperandHub: (
    ruleType: StrategyType,
    blockId: string,
    operandKey: string
  ) => void;
  onUpdateRule: (
    ruleType: StrategyType,
    id: string,
    newBlock: LogicBlock
  ) => void;
  onDeleteRule: (ruleType: StrategyType, id: string) => void;
}

// ... (RecursiveRuleRenderer 컴포넌트도 기존과 동일하게 유지) ...
// (지면 관계상 생략했습니다. 기존 코드를 그대로 두시면 됩니다.)
interface RecursiveRuleRendererProps {
  items: LogicBlock[];
  ruleType: StrategyType;
  onTriggerNestedAddRule: (parentId: string, as: LogicOperator) => void;
  onTriggerOperandHub: (blockId: string, operandKey: string) => void;
  onUpdateRule: (id: string, newBlock: LogicBlock) => void;
  onDeleteRule: (id: string) => void;
}

function RecursiveRuleRenderer({
  items,
  ruleType,
  ...handlers
}: RecursiveRuleRendererProps) {
  const t = useTranslations("StrategyBuilder");
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && (
            <div className="flex items-center justify-center">
              <span className="text-sm font-semibold text-muted-foreground">
                {t("orOperator")}
              </span>
            </div>
          )}
          <div className="relative">
            <RuleBlock
              item={item}
              onUpdate={(id, newBlock) => handlers.onUpdateRule(id, newBlock)}
              onDelete={() => handlers.onDeleteRule(item.id)}
              onTriggerAddRule={(parentId, as) =>
                handlers.onTriggerNestedAddRule(parentId, as)
              }
              onTriggerOperandHub={(blockId, operandKey) =>
                handlers.onTriggerOperandHub(blockId, operandKey)
              }
            />
            {item.children && item.children.length > 0 && (
              <div className="relative mt-4 pl-8 border-l-2 border-primary/50">
                <div className="absolute -left-[11px] top-1/2 -translate-y-1/2 z-10 px-1 bg-background">
                  <span className="text-sm font-semibold text-primary">
                    {t("andOperator")}
                  </span>
                </div>
                <RecursiveRuleRenderer
                  items={item.children}
                  ruleType={ruleType}
                  onUpdateRule={(id, newBlock) =>
                    handlers.onUpdateRule(id, newBlock)
                  }
                  onDeleteRule={handlers.onDeleteRule}
                  onTriggerNestedAddRule={(parentId, as) =>
                    handlers.onTriggerNestedAddRule(parentId, as)
                  }
                  onTriggerOperandHub={(blockId, operandKey) =>
                    handlers.onTriggerOperandHub(blockId, operandKey)
                  }
                />
              </div>
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export function StrategyBuilderCanvas({
  longEntryRules,
  longExitRules,
  shortEntryRules,
  shortExitRules,
  onAddTopLevelRule,
  onTriggerNestedAddRule,
  onTriggerOperandHub,
  onUpdateRule,
  onDeleteRule,
}: StrategyBuilderCanvasProps) {
  const t = useTranslations("StrategyBuilder");

  // [추가] 현재 확대된 섹션을 추적하는 상태
  const [focusedSection, setFocusedSection] = useState<StrategyType | null>(
    null
  );

  const sections: {
    titleKey: string;
    rules: PositionRules | null;
    ruleType: StrategyType;
    color: string;
  }[] = [
    {
      titleKey: "longEntryConditionsTitle",
      rules: longEntryRules,
      ruleType: "longEntry",
      color: "border-blue-500/50 hover:border-blue-500",
    },
    {
      titleKey: "longExitConditionsTitle",
      rules: longExitRules,
      ruleType: "longExit",
      color: "border-blue-500/50 hover:border-blue-500",
    },
    {
      titleKey: "shortEntryConditionsTitle",
      rules: shortEntryRules,
      ruleType: "shortEntry",
      color: "border-red-500/50 hover:border-red-500",
    },
    {
      titleKey: "shortExitConditionsTitle",
      rules: shortExitRules,
      ruleType: "shortExit",
      color: "border-red-500/50 hover:border-red-500",
    },
  ];

  const handleToggleFocus = (ruleType: StrategyType) => {
    setFocusedSection((prev) => (prev === ruleType ? null : ruleType));
  };

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2 transition-all duration-500 ease-in-out">
      {sections.map(({ titleKey, rules, ruleType, color }) => {
        const isFocused = focusedSection === ruleType;

        return (
          <Card
            key={ruleType}
            className={clsx(
              "transition-all duration-300 ease-in-out",
              color,
              // [수정] 확대 시 전체 너비(col-span-2) 차지 및 순서 최상단(order-first) 이동
              isFocused
                ? "xl:col-span-2 order-first shadow-lg ring-2 ring-primary/20"
                : ""
            )}
          >
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                {/* @ts-expect-error */}
                <CardTitle>{t(titleKey)}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => handleToggleFocus(ruleType)}
                  title={isFocused ? "축소" : "확대"}
                >
                  {isFocused ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onAddTopLevelRule(ruleType)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("addTopLevelCondition")}
              </Button>
            </CardHeader>
            <CardContent
              className={clsx(
                "transition-all duration-300",
                isFocused ? "min-h-[400px]" : "min-h-[200px]"
              )}
            >
              {!rules || rules.blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                  <p className="mb-4">{t("noConditionsYet")}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onAddTopLevelRule(ruleType)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t("addFirstCondition")}
                  </Button>
                </div>
              ) : (
                <RecursiveRuleRenderer
                  items={rules.blocks}
                  ruleType={ruleType}
                  onUpdateRule={(id, newBlock) =>
                    onUpdateRule(ruleType, id, newBlock)
                  }
                  onDeleteRule={(id) => onDeleteRule(ruleType, id)}
                  onTriggerNestedAddRule={(parentId, as) =>
                    onTriggerNestedAddRule(ruleType, parentId, as)
                  }
                  onTriggerOperandHub={(blockId, operandKey) =>
                    onTriggerOperandHub(ruleType, blockId, operandKey)
                  }
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
