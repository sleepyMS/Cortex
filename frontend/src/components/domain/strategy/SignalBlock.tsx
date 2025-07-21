"use client";

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
  GripVertical,
  MoreVertical,
  Copy,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import { ParameterPopover } from "./ParameterPopover";
import { INDICATOR_REGISTRY } from "@/lib/indicators";

// --- Type Definitions ---
export interface Condition {
  type: "indicator" | "value";
  name: string;
  value:
    | {
        indicatorKey: string;
        values: Record<string, any>;
      }
    | number;
}

export interface SignalBlockData {
  id: string;
  type: "signal";
  conditionA: Condition | null;
  operator: string;
  conditionB: Condition | null;
}

interface SignalBlockProps {
  data: SignalBlockData;
  onSlotClick: (condition: "conditionA" | "conditionB") => void;
  onDelete: () => void;
  onUpdate: (updatedBlock: SignalBlockData) => void;
  onCloneSymmetrical: () => void;
}

// --- Internal Component: Condition Slot ---
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
  // If the slot is empty
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

  // If the slot type is 'value'
  if (condition.type === "value") {
    // Ensure the value passed to the Input is a string or number
    const displayValue =
      typeof condition.value === "number" ? condition.value : "";
    return (
      <Input
        type="number"
        className="h-full w-full"
        value={displayValue}
        onChange={(e) => onValueChange(Number(e.target.value))}
      />
    );
  }

  // If the slot type is 'indicator'
  // At this point, TypeScript knows `condition.value` must be an object
  const indicatorDef = INDICATOR_REGISTRY[condition.value.indicatorKey];

  if (!indicatorDef) {
    return (
      <Button variant="destructive" className="h-full w-full">
        Unknown Indicator
      </Button>
    );
  }

  return (
    <ParameterPopover
      parameters={indicatorDef.parameters}
      values={condition.value.values}
      onValuesChange={onParamUpdate}
    >
      <Button
        variant="outline"
        className="h-full w-full justify-start text-left"
      >
        <span className="font-bold truncate">{indicatorDef.name}</span>
        <span className="text-xs text-muted-foreground ml-1">
          ({Object.values(condition.value.values).join(",")})
        </span>
      </Button>
    </ParameterPopover>
  );
}

// --- Main Component: Signal Block ---
export function SignalBlock({
  data,
  onSlotClick,
  onDelete,
  onUpdate,
  onCloneSymmetrical,
}: SignalBlockProps) {
  const handleOperatorChange = (newOperator: string) => {
    onUpdate({ ...data, operator: newOperator });
  };

  const handleConditionChange = (
    conditionType: "conditionA" | "conditionB",
    change:
      | { type: "param"; newValues: Record<string, any> }
      | { type: "value"; newValue: number }
  ) => {
    const condition = data[conditionType];
    if (!condition) return;

    let updatedCondition: Condition;

    if (
      change.type === "param" &&
      condition.type === "indicator" &&
      typeof condition.value === "object"
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
    onUpdate({ ...data, [conditionType]: updatedCondition });
  };

  return (
    <Card className="p-2 bg-background/50">
      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
        <button className="cursor-grab p-2 text-muted-foreground">
          <GripVertical className="h-5 w-5" />
        </button>

        <ConditionSlot
          condition={data.conditionA}
          onAddClick={() => onSlotClick("conditionA")}
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
              {data.operator}
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
          condition={data.conditionB}
          onAddClick={() => onSlotClick("conditionB")}
          onParamUpdate={(newValues) =>
            handleConditionChange("conditionB", { type: "param", newValues })
          }
          onValue-Change={(newValue) =>
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
              <Button variant="ghost" className="justify-start text-xs">
                <Copy className="h-3 w-3 mr-2" /> Clone
              </Button>
              <Button
                variant="ghost"
                className="justify-start text-xs"
                onClick={onCloneSymmetrical}
              >
                <ArrowRightLeft className="h-3 w-3 mr-2" /> Symmetrical Clone to
                Sell
              </Button>
              <Button
                variant="ghost"
                className="text-destructive justify-start text-xs"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3 mr-2" /> Delete
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Card>
  );
}
