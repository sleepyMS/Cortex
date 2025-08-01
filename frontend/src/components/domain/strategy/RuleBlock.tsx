// frontend/src/components/domain/strategy/RuleBlock.tsx

"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/Popover";
import { Input } from "@/components/ui/Input";
import {
  Plus,
  MoreVertical,
  Trash2,
  CornerDownRight,
  ArrowRight,
} from "lucide-react";
import { ParameterPopover } from "./ParameterPopover";
import { INDICATOR_REGISTRY, IndicatorDefinition } from "@/lib/indicators";
import {
  RuleItem,
  SignalBlockData,
  Condition,
  ConditionType,
  TargetSlot, // 👈 TargetSlot 임포트 추가
  RuleType, // 👈 RuleType 임포트 추가
} from "@/types/strategy";
import clsx from "clsx";
import { useTranslations } from "next-intl";

// --- 타입 정의 ---
interface RuleBlockProps {
  item: RuleItem;
  depth: number;
  onAddRule: (parentId: string, as: "AND" | "OR") => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newSignalData: SignalBlockData) => void;
  onSlotClick: (itemId: string, condition: ConditionType) => void;
  // 👈 onTimeframeChange의 시그니처를 RuleBlock이 직접 받는 인자에 맞게 변경
  onTimeframeChange: (
    ruleType: RuleType, // 👈 ruleType 추가
    blockId: string,
    conditionType: ConditionType,
    newTimeframe: string
  ) => void;
  ruleType: RuleType; // 👈 ruleType prop 추가
}

// --- 내부 컴포넌트: 조건 슬롯 ---
function ConditionSlot({
  condition,
  onAddClick,
  onParamUpdate,
  onValueChange,
  indicatorNameForPopover,
  onIndicatorChangeForPopover,
  onTimeframeChangeForPopover,
  currentTimeframe,
  indicatorKeyForPopover,
}: {
  condition: Condition | null;
  onAddClick: () => void;
  onParamUpdate: (newValues: Record<string, any>) => void;
  onValueChange: (newValue: number) => void;
  indicatorNameForPopover?: string;
  onIndicatorChangeForPopover?: () => void;
  onTimeframeChangeForPopover?: (newTimeframe: string) => void; // 콜백 타입 정의
  currentTimeframe?: string;
  indicatorKeyForPopover?: string;
}) {
  const t = useTranslations("RuleBlock");

  if (!condition) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-full w-full border-dashed transition-colors hover:bg-muted/50 hover:border-primary-foreground/30 flex items-center justify-center text-muted-foreground"
        onClick={onAddClick}
      >
        <Plus className="h-4 w-4 mr-1" /> {t("addCondition")}
      </Button>
    );
  }

  if (condition.type === "value") {
    const displayValue =
      typeof condition.value === "number" ? condition.value : "";
    return (
      <Input
        type="number"
        className="h-full w-full text-center bg-background border-input focus-visible:ring-ring"
        value={displayValue}
        onChange={(e) => onValueChange(Number(e.target.value))}
      />
    );
  }

  // 지표 타입일 경우 condition.value가 객체여야 하며 indicatorKey를 포함해야 함
  if (
    typeof condition.value !== "object" ||
    condition.value === null ||
    !("indicatorKey" in condition.value) ||
    typeof condition.value.indicatorKey !== "string"
  ) {
    return (
      <Button type="button" variant="destructive" className="h-full w-full">
        {t("invalidIndicator")}
      </Button>
    );
  }

  const indicatorDef = INDICATOR_REGISTRY[condition.value.indicatorKey];

  if (!indicatorDef) {
    return (
      <Button type="button" variant="destructive" className="h-full w-full">
        {t("unknownIndicator")}
      </Button>
    );
  }

  const currentValues = (
    condition.value as { values: Record<string, any>; timeframe: string }
  ).values;
  const currentTf = (
    condition.value as { values: Record<string, any>; timeframe: string }
  ).timeframe;

  return (
    <ParameterPopover
      indicatorName={indicatorNameForPopover || indicatorDef.name}
      indicatorKey={indicatorKeyForPopover || indicatorDef.key}
      parameters={indicatorDef.parameters}
      values={currentValues}
      currentTimeframe={currentTf}
      onValuesChange={onParamUpdate}
      onTimeframeChange={onTimeframeChangeForPopover || (() => {})}
      onIndicatorChange={onIndicatorChangeForPopover || (() => {})}
    >
      <Button
        type="button"
        variant="outline"
        className="h-full w-full justify-start text-left truncate bg-card hover:bg-secondary/40 border-border hover:border-primary transition-colors group"
      >
        <span className="font-bold shrink truncate text-foreground group-hover:text-primary transition-colors">
          {indicatorDef.name}
        </span>
        <span className="text-xs text-muted-foreground ml-1 shrink-0">
          ({Object.values(currentValues).join(",")}
          {currentTf ? `, ${currentTf}` : ""})
        </span>
      </Button>
    </ParameterPopover>
  );
}

// --- 메인 컴포넌트: 규칙 블록 ---
export function RuleBlock({
  item,
  depth,
  onAddRule,
  onDelete,
  onUpdate,
  onSlotClick,
  onTimeframeChange, // 👈 새로운 시그니처에 맞춤
  ruleType, // 👈 ruleType prop 사용
}: RuleBlockProps) {
  const t = useTranslations("RuleBlock");

  if (item.type !== "signal") {
    return null;
  }

  const signalData: SignalBlockData = item;

  const handleOperatorChange = (newOperator: string) => {
    onUpdate(item.id, { ...signalData, operator: newOperator });
  };

  const handleIndicatorChangeForSlot = (conditionType: ConditionType) => {
    onSlotClick(item.id, conditionType);
  };

  // 👈 onTimeframeChangeForSlot 함수 수정: RuleBlockProps의 onTimeframeChange 시그니처에 맞춤
  const handleTimeframeChangeForSlot = (
    conditionType: ConditionType,
    newTimeframe: string
  ) => {
    onTimeframeChange(ruleType, item.id, conditionType, newTimeframe);
  };

  const handleConditionChange = (
    conditionType: ConditionType,
    change:
      | { type: "param"; newValues: Record<string, any> }
      | { type: "value"; newValue: number }
  ) => {
    const condition = signalData[conditionType];
    if (!condition) return;

    let updatedCondition: Condition;
    if (
      change.type === "param" &&
      condition.type === "indicator" &&
      typeof condition.value === "object" &&
      condition.value !== null &&
      "indicatorKey" in condition.value
    ) {
      const indicatorDef = INDICATOR_REGISTRY[condition.value.indicatorKey];
      if (!indicatorDef) return;

      const currentTf = (condition.value as { timeframe: string }).timeframe;

      const newName = `${indicatorDef.name}(${indicatorDef.parameters
        .map((p) => change.newValues[p.key])
        .join(",")})${currentTf ? `, ${currentTf}` : ""}`;

      updatedCondition = {
        ...condition,
        name: newName,
        value: { ...condition.value, values: change.newValues },
      };
    } else if (change.type === "value" && condition.type === "value") {
      updatedCondition = {
        ...condition,
        value: change.newValue,
        name: String(change.newValue),
      };
    } else {
      return;
    }
    onUpdate(item.id, { ...signalData, [conditionType]: updatedCondition });
  };

  const depthStyles = clsx({
    "bg-card": depth === 0,
    "bg-background/70 border-l-2 border-primary/20": depth === 1,
    "bg-secondary/20 border-l-2 border-primary/30": depth === 2,
    "bg-muted/10 border-l-2 border-primary/40": depth >= 3,
  });

  return (
    <div className="relative group">
      <Card
        className={clsx(
          "p-3 rounded-lg shadow-sm transition-all min-w-max",
          depthStyles
        )}
      >
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
          <ConditionSlot
            condition={signalData.conditionA}
            onAddClick={() => onSlotClick(item.id, "conditionA")}
            onParamUpdate={(newValues) =>
              handleConditionChange("conditionA", { type: "param", newValues })
            }
            onValueChange={(newValue) =>
              handleConditionChange("conditionA", { type: "value", newValue })
            }
            indicatorNameForPopover={signalData.conditionA?.name}
            indicatorKeyForPopover={
              typeof signalData.conditionA?.value === "object" &&
              signalData.conditionA.value !== null &&
              "indicatorKey" in signalData.conditionA.value
                ? signalData.conditionA.value.indicatorKey
                : undefined
            }
            currentTimeframe={
              typeof signalData.conditionA?.value === "object" &&
              signalData.conditionA.value !== null &&
              "timeframe" in signalData.conditionA.value
                ? signalData.conditionA.value.timeframe
                : undefined
            }
            onIndicatorChangeForPopover={() =>
              handleIndicatorChangeForSlot("conditionA")
            }
            onTimeframeChangeForPopover={(newTimeframe) =>
              handleTimeframeChangeForSlot("conditionA", newTimeframe)
            }
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="px-3 text-base font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                {signalData.operator}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1 bg-popover border-border shadow-lg">
              <div className="flex flex-col">
                {[">", "<", "=", t("crossesAbove"), t("crossesBelow")].map(
                  (op) => (
                    <Button
                      type="button"
                      key={op}
                      variant="ghost"
                      className="justify-start text-foreground hover:bg-accent hover:text-primary"
                      onClick={() => handleOperatorChange(op)}
                    >
                      {op}
                    </Button>
                  )
                )}
              </div>
            </PopoverContent>
          </Popover>
          <ConditionSlot
            condition={signalData.conditionB}
            onAddClick={() => onSlotClick(item.id, "conditionB")}
            onParamUpdate={(newValues) =>
              handleConditionChange("conditionB", { type: "param", newValues })
            }
            onValueChange={(newValue) =>
              handleConditionChange("conditionB", { type: "value", newValue })
            }
            indicatorNameForPopover={signalData.conditionB?.name}
            indicatorKeyForPopover={
              typeof signalData.conditionB?.value === "object" &&
              signalData.conditionB.value !== null &&
              "indicatorKey" in signalData.conditionB.value
                ? signalData.conditionB.value.indicatorKey
                : undefined
            }
            currentTimeframe={
              typeof signalData.conditionB?.value === "object" &&
              signalData.conditionB.value !== null &&
              "timeframe" in signalData.conditionB.value
                ? signalData.conditionB.value.timeframe
                : undefined
            }
            onIndicatorChangeForPopover={() =>
              handleIndicatorChangeForSlot("conditionB")
            }
            onTimeframeChangeForPopover={(newTimeframe) =>
              handleTimeframeChangeForSlot("conditionB", newTimeframe)
            }
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1 bg-popover border-border shadow-lg">
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start text-xs text-foreground hover:bg-accent hover:text-primary"
                  onClick={() => onAddRule(item.id, "OR")}
                >
                  <ArrowRight className="h-3 w-3 mr-2 text-primary" />{" "}
                  {t("addOrCondition")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="justify-start text-xs text-foreground hover:bg-accent hover:text-primary"
                  onClick={() => onAddRule(item.id, "AND")}
                >
                  <CornerDownRight className="h-3 w-3 mr-2 text-primary" />{" "}
                  {t("addAndCondition")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive justify-start text-xs hover:bg-destructive/10"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-3 w-3 mr-2" /> {t("delete")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </Card>
    </div>
  );
}
