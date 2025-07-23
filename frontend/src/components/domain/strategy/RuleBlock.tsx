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
import clsx from "clsx"; // clsx 유틸리티 임포트

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
}: {
  condition: Condition | null;
  onAddClick: () => void;
  onParamUpdate: (newValues: Record<string, any>) => void;
  onValueChange: (newValue: number) => void;
}) {
  if (!condition) {
    return (
      <Button
        variant="outline"
        className="h-full w-full border-dashed transition-colors hover:bg-muted/50 hover:border-primary-foreground/30 flex items-center justify-center text-muted-foreground" // 비어있는 슬롯 스타일 개선
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
        className="h-full w-full text-center bg-background border-input focus-visible:ring-ring" // 값 슬롯 스타일 개선
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
      parameters={indicatorDef.parameters}
      values={currentValues}
      onValuesChange={onParamUpdate}
    >
      <Button
        variant="outline"
        className="h-full w-full justify-start text-left truncate bg-card hover:bg-secondary/40 border-border hover:border-primary transition-colors group" // 지표 슬롯 스타일 개선
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
  // globals.css에 정의된 변수들을 활용
  const depthStyles = clsx({
    "bg-card": depth === 0, // 최상위 depth
    "bg-background/70 border-l-2 border-primary/20": depth === 1, // 첫 번째 중첩
    "bg-secondary/20 border-l-2 border-primary/30": depth === 2, // 두 번째 중첩
    "bg-muted/10 border-l-2 border-primary/40": depth >= 3, // 세 번째 이상 중첩
  });

  return (
    <div
      style={{ paddingLeft: `${depth * 1.5}rem` }}
      className="w-full relative group"
    >
      {" "}
      {/* paddingLeft를 줄여 더 간결하게 */}
      <Card
        className={clsx("p-3 rounded-lg shadow-sm transition-all", depthStyles)}
      >
        {" "}
        {/* Card 스타일 개선 */}
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
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="px-3 text-base font-medium text-primary hover:bg-primary/10 transition-colors" // 연산자 버튼 색상 강조
              >
                {signalData.operator}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1 bg-popover border-border shadow-lg">
              {" "}
              {/* Popover 스타일 개선 */}
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
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              >
                {" "}
                {/* 더보기 버튼 스타일 개선 */}
                <MoreVertical className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1 bg-popover border-border shadow-lg">
              {" "}
              {/* Popover 스타일 개선 */}
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
      {/* depth가 0이 아니고, AND/OR 버튼이 있는 경우 시각적인 연결선 추가 (선택 사항 - RecursiveRuleRenderer에서 처리하는 것이 더 좋을 수 있음) */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-4 pointer-events-none">
          {/* 부모 블록과 연결되는 세로선 */}
          <div className="absolute left-2.5 top-0 w-0.5 h-full bg-border group-hover:bg-primary/50 transition-colors"></div>
        </div>
      )}
    </div>
  );
}
