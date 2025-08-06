// file: frontend/src/components/domain/strategy/StrategyBuilderCanvas.tsx

"use client";

import React from "react";
import { useTranslations } from "next-intl";

import {
  LogicBlock,
  PositionRules,
  StrategyType,
  LogicOperator,
} from "@/types/strategy";
import { Button } from "@/components/ui/Button";
import { PlusCircle } from "lucide-react";
import clsx from "clsx";
import { nanoid } from "nanoid";
import { RecursiveRuleRenderer } from "./RecursiveRuleRenderer";

// StrategyBuilderCanvasProps 인터페이스 정의
interface StrategyBuilderCanvasProps {
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  onAddRule: (
    ruleType: StrategyType,
    newBlock: LogicBlock,
    parentId: string | null,
    as: LogicOperator
  ) => void;
  onDeleteRule: (ruleType: StrategyType, id: string) => void;
  onUpdateRule: (
    ruleType: StrategyType,
    id: string,
    newBlock: LogicBlock
  ) => void;
  onSlotClick: (
    ruleType: StrategyType,
    blockId: string,
    logicType: LogicBlock["type"],
    slotKey: string
  ) => void;
  onAddTopLevelRuleClick: (ruleType: StrategyType) => void;
}

// --- 메인 캔버스 컴포넌트 ---
export function StrategyBuilderCanvas({
  longEntryRules,
  longExitRules,
  shortEntryRules,
  shortExitRules,
  onAddRule,
  onDeleteRule,
  onUpdateRule,
  onSlotClick,
  onAddTopLevelRuleClick,
}: StrategyBuilderCanvasProps) {
  const t = useTranslations("StrategyBuilder");

  const renderRuleList = (
    ruleset: PositionRules | null,
    ruleType: StrategyType
  ) => {
    const stateAndHandlers = {
      onAddRule: (newBlock: LogicBlock, parentId: string, as: LogicOperator) =>
        onAddRule(ruleType, newBlock, parentId, as),
      onDelete: (id: string) => onDeleteRule(ruleType, id),
      onUpdate: (id: string, newBlock: LogicBlock) =>
        onUpdateRule(ruleType, id, newBlock),
      onSlotClick: (
        blockId: string,
        logicType: LogicBlock["type"],
        slotKey: string
      ) => onSlotClick(ruleType, blockId, logicType, slotKey),
    };

    if (!ruleset || ruleset.blocks.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
          <p className="mb-2">{t("noConditionsYet")}</p>
          <Button
            type="button"
            onClick={() => onAddTopLevelRuleClick(ruleType)}
            variant="secondary"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("addFirstCondition")}
          </Button>
        </div>
      );
    }

    return (
      <RecursiveRuleRenderer
        items={ruleset.blocks}
        depth={0}
        ruleType={ruleType}
        stateAndHandlers={stateAndHandlers}
      />
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-8">
        {/* 롱 포지션 진입 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-4 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50 overflow-x-auto">
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground">
              {t("longEntryConditionsTitle")}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddTopLevelRuleClick("longEntry")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")}
            </Button>
          </div>
          {renderRuleList(longEntryRules, "longEntry")}
        </div>

        {/* 롱 포지션 청산 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-4 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50 overflow-x-auto">
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground">
              {t("longExitConditionsTitle")}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddTopLevelRuleClick("longExit")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")}
            </Button>
          </div>
          {renderRuleList(longExitRules, "longExit")}
        </div>

        {/* 숏 포지션 진입 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-4 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50 overflow-x-auto">
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground">
              {t("shortEntryConditionsTitle")}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddTopLevelRuleClick("shortEntry")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")}
            </Button>
          </div>
          {renderRuleList(shortEntryRules, "shortEntry")}
        </div>

        {/* 숏 포지션 청산 조건 영역 */}
        <div className="min-h-[300px] space-y-4 rounded-xl bg-secondary/30 p-4 shadow-xl border border-border transition-all hover:shadow-2xl hover:border-primary/50 overflow-x-auto">
          <div className="flex items-center justify-between border-b pb-4 mb-4 border-border/50">
            <h2 className="text-2xl font-bold text-foreground">
              {t("shortExitConditionsTitle")}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onAddTopLevelRuleClick("shortExit")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <PlusCircle className="mr-2 h-4 w-4 text-primary" />
              {t("addTopLevelCondition")}
            </Button>
          </div>
          {renderRuleList(shortExitRules, "shortExit")}
        </div>
      </div>
    </>
  );
}
