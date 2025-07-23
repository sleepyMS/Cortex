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
} from "@/types/strategy"; // strategy.ts에서 타입 정의를 가져옵니다.

// --- 타입 정의 ---
interface RuleBlockProps {
  item: RuleItem; // RuleItem 타입으로 변경
  depth: number;
  onAddRule: (parentId: string, as: "AND" | "OR") => void;
  onDelete: (id: string) => void;
  // onUpdate는 이제 RuleItem을 받도록 변경합니다. SignalBlockData는 RuleItem의 하위 타입이므로 문제 없음.
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
        className="h-full w-full border-dashed"
        onClick={onAddClick}
      >
        <Plus className="h-4 w-4" />
      </Button>
    );
  }

  if (condition.type === "value") {
    const displayValue =
      typeof condition.value === "number" ? condition.value : "";
    return (
      <Input
        type="number"
        className="h-full w-full text-center"
        value={displayValue}
        onChange={(e) => onValueChange(Number(e.target.value))}
      />
    );
  }

  // condition.value가 객체이고, indicatorKey가 있는지 확인합니다.
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

  // indicatorKey가 올바르게 추론되도록 단언합니다.
  const indicatorDef = INDICATOR_REGISTRY[condition.value.indicatorKey];

  if (!indicatorDef) {
    return (
      <Button variant="destructive" className="h-full w-full">
        Unknown
      </Button>
    );
  }

  // condition.value.values가 Record<string, any> 타입임을 확인합니다.
  const currentValues = (condition.value as { values: Record<string, any> })
    .values;

  return (
    <ParameterPopover
      parameters={indicatorDef.parameters}
      values={currentValues} // 올바른 값을 전달
      onValuesChange={onParamUpdate}
    >
      <Button
        variant="outline"
        className="h-full w-full justify-start text-left truncate"
      >
        <span className="font-bold shrink truncate">{indicatorDef.name}</span>
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
  // item이 SignalBlockData 타입인지 확인하고 캐스팅합니다.
  // RuleBlock은 SignalBlockData만 렌더링하도록 설계되었기 때문에 이 검사는 중요합니다.
  if (item.type !== "signal") {
    // 만약 item이 signal 타입이 아니라면 (예: group), null을 반환하거나 다른 처리를 할 수 있습니다.
    // 현재는 RuleBlock 컴포넌트 자체가 SignalBlockData를 다루도록 되어 있습니다.
    return null;
  }

  // item을 SignalBlockData로 캐스팅하여 직접 접근합니다.
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
    // signalData는 이미 item이므로 signalData[conditionType]으로 직접 접근합니다.
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
      // parameter.map을 사용하기 위해 indicatorDef.parameters가 존재함을 확인합니다.
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
    // onUpdate 함수에 변경된 SignalBlockData 객체를 전달합니다.
    onUpdate(item.id, { ...signalData, [conditionType]: updatedCondition });
  };

  return (
    <div style={{ paddingLeft: `${depth * 2.5}rem` }} className="w-full">
      <Card className="p-2 bg-background/50">
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
              <Button variant="ghost" className="px-3 text-base font-medium">
                {signalData.operator}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1">
              <div className="flex flex-col">
                {[">", "<", "=", "Crosses Above", "Crosses Below"].map((op) => (
                  <Button
                    key={op}
                    variant="ghost"
                    className="justify-start"
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
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-1">
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  className="justify-start text-xs"
                  onClick={() => onAddRule(item.id, "OR")}
                >
                  <ArrowRight className="h-3 w-3 mr-2" /> OR 조건 추가
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-xs"
                  onClick={() => onAddRule(item.id, "AND")}
                >
                  <CornerDownRight className="h-3 w-3 mr-2" /> AND 조건 추가
                </Button>
                <Button
                  variant="ghost"
                  className="text-destructive justify-start text-xs"
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
