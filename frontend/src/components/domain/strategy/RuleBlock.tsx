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
import { INDICATOR_REGISTRY } from "@/lib/indicators";
import {
  RuleItem,
  SignalBlockData,
  Condition,
  ConditionType,
} from "@/types/strategy";
import clsx from "clsx";

// --- 타입 정의 ---
interface RuleBlockProps {
  item: RuleItem;
  depth: number;
  onAddRule: (parentId: string, as: "AND" | "OR") => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, newSignalData: SignalBlockData) => void;
  onSlotClick: (itemId: string, condition: ConditionType) => void;
}

// --- 내부 컴포넌트: 조건 슬롯 ---
function ConditionSlot({
  condition,
  onAddClick,
  onParamUpdate,
  onValueChange,
  indicatorNameForPopover,
  onIndicatorChangeForPopover,
}: {
  condition: Condition | null;
  onAddClick: () => void;
  onParamUpdate: (newValues: Record<string, any>) => void;
  onValueChange: (newValue: number) => void;
  indicatorNameForPopover?: string;
  onIndicatorChangeForPopover?: () => void;
}) {
  if (!condition) {
    return (
      <Button
        variant="outline"
        className="h-full w-full border-dashed transition-colors hover:bg-muted/50 hover:border-primary-foreground/30 flex items-center justify-center text-muted-foreground"
        onClick={onAddClick}
      >
        <Plus className="h-4 w-4 mr-1" /> 추가
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

  if (
    typeof condition.value !== "object" ||
    condition.value === null ||
    !("indicatorKey" in condition.value) ||
    typeof condition.value.indicatorKey !== "string"
  ) {
    return (
      <Button variant="destructive" className="h-full w-full">
        Invalid Indicator
      </Button>
    );
  }

  const indicatorDef = INDICATOR_REGISTRY[condition.value.indicatorKey];

  if (!indicatorDef) {
    return (
      <Button variant="destructive" className="h-full w-full">
        Unknown
      </Button>
    );
  }

  const currentValues = (condition.value as { values: Record<string, any> })
    .values;

  return (
    <ParameterPopover
      indicatorName={indicatorNameForPopover || indicatorDef.name}
      parameters={indicatorDef.parameters}
      values={currentValues}
      onValuesChange={onParamUpdate}
      onIndicatorChange={onIndicatorChangeForPopover || (() => {})}
    >
      <Button
        variant="outline"
        className="h-full w-full justify-start text-left truncate bg-card hover:bg-secondary/40 border-border hover:border-primary transition-colors group"
      >
        <span className="font-bold shrink truncate text-foreground group-hover:text-primary transition-colors">
          {indicatorDef.name}
        </span>
        <span className="text-xs text-muted-foreground ml-1 shrink-0">
          ({Object.values(currentValues).join(",")})
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
}: RuleBlockProps) {
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
      const newName = `${indicatorDef.name}(${indicatorDef.parameters
        .map((p) => change.newValues[p.key])
        .join(",")})`;
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

  // depth에 따른 배경색 및 테두리 색상 변화를 위한 Tailwind CSS 클래스 정의
  const depthStyles = clsx({
    "bg-card": depth === 0,
    "bg-background/70 border-l-2 border-primary/20": depth === 1,
    "bg-secondary/20 border-l-2 border-primary/30": depth === 2,
    "bg-muted/10 border-l-2 border-primary/40": depth >= 3,
  });

  return (
    <div className="relative group">
      {" "}
      {/* ✨ 변경: w-full 제거 */}
      <Card
        className={clsx(
          "p-3 rounded-lg shadow-sm transition-all min-w-max",
          depthStyles
        )}
      >
        {" "}
        {/* ✨ 변경: min-w-max 추가 */}
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
            onIndicatorChangeForPopover={() =>
              handleIndicatorChangeForSlot("conditionA")
            }
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="px-3 text-base font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                {signalData.operator}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1 bg-popover border-border shadow-lg">
              <div className="flex flex-col">
                {[">", "<", "=", "Crosses Above", "Crosses Below"].map((op) => (
                  <Button
                    key={op}
                    variant="ghost"
                    className="justify-start text-foreground hover:bg-accent hover:text-primary"
                    onClick={() => handleOperatorChange(op)}
                  >
                    {op}
                  </Button>
                ))}
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
            onIndicatorChangeForPopover={() =>
              handleIndicatorChangeForSlot("conditionB")
            }
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
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
                  variant="ghost"
                  className="justify-start text-xs text-foreground hover:bg-accent hover:text-primary"
                  onClick={() => onAddRule(item.id, "OR")}
                >
                  <ArrowRight className="h-3 w-3 mr-2 text-primary" /> OR 조건
                  추가
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-xs text-foreground hover:bg-accent hover:text-primary"
                  onClick={() => onAddRule(item.id, "AND")}
                >
                  <CornerDownRight className="h-3 w-3 mr-2 text-primary" /> AND
                  조건 추가
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive justify-start text-xs hover:bg-destructive/10"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-3 w-3 mr-2" /> 삭제
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </Card>
    </div>
  );
}
