"use client";

import React from "react";
import { useTranslations } from "next-intl";
import clsx from "clsx";
import { PlusCircle } from "lucide-react";

import {
  LogicBlock,
  PositionRules,
  StrategyType,
  LogicOperator,
} from "@/types/strategy";
import { Button } from "@/components/ui/Button";
import { RuleBlock } from "./RuleBlock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

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

// --- 재귀 렌더러 ---
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

// --- 메인 캔버스 컴포넌트 ---
export function StrategyBuilderCanvas({
  longEntryRules,
  longExitRules,
  shortEntryRules,
  shortExitRules,
  onAddTopLevelRule, // 👈 2. props 이름 변경
  onTriggerNestedAddRule,
  onTriggerOperandHub,
  onUpdateRule,
  onDeleteRule,
}: StrategyBuilderCanvasProps) {
  const t = useTranslations("StrategyBuilder");

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

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
      {sections.map(({ titleKey, rules, ruleType, color }) => (
        <Card key={ruleType} className={clsx("transition-colors", color)}>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t(titleKey)}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddTopLevelRule(ruleType)} // 👈 3. 호출하는 함수 이름 변경
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("addTopLevelCondition")}
            </Button>
          </CardHeader>
          <CardContent className="min-h-[200px]">
            {!rules || rules.blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <p className="mb-4">{t("noConditionsYet")}</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onAddTopLevelRule(ruleType)} // 👈 4. 호출하는 함수 이름 변경
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
      ))}
    </div>
  );
}
