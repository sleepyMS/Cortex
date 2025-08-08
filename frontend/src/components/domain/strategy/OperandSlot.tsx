// file: frontend/src/components/domain/strategy/OperandSlot.tsx

"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { IndicatorValue } from "@/types/strategy";
import { INDICATOR_METADATA } from "@/lib/indicators";

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
  onSelectIndicator: () => void;
  onConvertToValue: () => void;
  onConvertToIndicator: () => void;
  onValueChange: (newValue: number | IndicatorValue) => void;
}

export function OperandSlot({
  value,
  onSelectIndicator,
  onConvertToValue,
  onConvertToIndicator,
  onValueChange,
}: OperandSlotProps) {
  const t = useTranslations("RuleBlock");

  // 🔽🔽🔽 수정된 useMemo 🔽🔽🔽
  const parameterDetails = useMemo(() => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("indicatorKey" in value)
    ) {
      return "";
    }

    const metadata = INDICATOR_METADATA.find(
      (ind) => ind.key === value.indicatorKey
    );
    if (!metadata) return "";

    const parts: string[] = [];

    // 1. 파라미터 정보 추가 (파라미터가 있을 경우에만)
    if (metadata.parameters.length > 0) {
      parts.push(Object.values(value.values).join(", "));
    }

    // 2. 출력 정보 추가 (선택 가능한 출력이 2개 이상일 경우에만)
    if (metadata.outputs.length > 1) {
      const selectedOutputKey = value.outputs[0];
      const outputMeta = metadata.outputs.find(
        (out) => out.key === selectedOutputKey
      );
      if (outputMeta) {
        parts.push(outputMeta.label);
      }
    }

    // 3. 타임프레임 정보 항상 추가
    parts.push(value.timeframe);

    return parts.filter(Boolean).join(", ");
  }, [value]);
  // 🔼🔼🔼 수정된 useMemo 완료 🔼🔼🔼

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
          onUpdate={(newValue) => onValueChange(newValue)}
          onIndicatorChange={onSelectIndicator}
        >
          <Button
            type="button"
            variant="outline"
            className="flex-grow justify-start text-left truncate rounded-r-none"
          >
            {/* 🔽🔽🔽 수정된 렌더링 부분 🔽🔽🔽 */}
            <span className="font-semibold">{value.indicatorKey}</span>
            {parameterDetails && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({parameterDetails})
              </span>
            )}
            {/* 🔼🔼🔼 수정된 렌더링 부분 완료 🔼🔼🔼 */}
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
