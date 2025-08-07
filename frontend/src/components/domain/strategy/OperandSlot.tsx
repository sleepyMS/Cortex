// file: frontend/src/components/domain/strategy/OperandSlog.tsx

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { IndicatorValue } from "@/types/strategy";

import { ParameterPopover } from "./ParameterPopover";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Settings2, Replace } from "lucide-react";

interface OperandSlotProps {
  value: IndicatorValue | number | null;
  onSelectIndicator: () => void; // IndicatorHub를 열어 지표를 선택하는 함수
  onConvertToValue: () => void; // 현재 슬롯을 '고정 값' 타입으로 변경하는 함수
  onConvertToIndicator: () => void; // 현재 슬롯을 '지표' 타입으로 변경하는 함수
  onValueChange: (newValue: number) => void; // '고정 값'일 때 값을 업데이트하는 함수
}

export function OperandSlot({
  value,
  onSelectIndicator,
  onConvertToValue,
  onConvertToIndicator,
  onValueChange,
}: OperandSlotProps) {
  const t = useTranslations("RuleBlock");

  // 1. 슬롯이 비어있을 경우
  if (value === null) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-full w-full border-dashed transition-colors hover:bg-muted/50 hover:border-primary/30 flex items-center justify-center text-muted-foreground"
        onClick={onSelectIndicator}
      >
        {t("addIndicatorOrValue")}
      </Button>
    );
  }

  // 2. 슬롯의 값이 '지표'일 경우
  if (typeof value === "object" && "indicatorKey" in value) {
    return (
      <div className="flex w-full">
        <ParameterPopover
          indicatorValue={value}
          onUpdate={(newValue) => onValueChange(newValue as any)} // 타입 호환을 위해 any 사용, 실제 로직은 상위에서 처리
          onIndicatorChange={onSelectIndicator}
        >
          <Button
            type="button"
            variant="outline"
            className="flex-grow justify-start text-left truncate rounded-r-none"
          >
            <span className="font-semibold">{value.indicatorKey}</span>
            <span className="ml-1 text-xs text-muted-foreground">
              ({Object.values(value.values).join(", ")})
            </span>
          </Button>
        </ParameterPopover>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="w-10 rounded-l-none border-l-0"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSelectIndicator}>
              {t("changeIndicator")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onConvertToValue}>
              {t("changeToValue")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // 3. 슬롯의 값이 '고정 값'일 경우
  return (
    <div className="flex w-full">
      <Input
        type="number"
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="flex-grow rounded-r-none focus-visible:ring-offset-0"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="w-10 rounded-l-none border-l-0"
          >
            <Replace className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onConvertToIndicator}>
            {t("changeToIndicator")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
