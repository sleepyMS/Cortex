"use client";

import React, { useMemo, useState } from "react";
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
import { useIndicatorStore } from "@/store/indicatorStore";

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

  const indicatorMetadata = useIndicatorStore((state) => state.metadata);

  const [isMenuOpen, setMenuOpen] = useState(false);

  const handleSelectIndicatorAndClose = () => {
    onSelectIndicator();
    setMenuOpen(false);
  };

  const handleConvertToValueAndClose = () => {
    onConvertToValue();
    setMenuOpen(false);
  };

  const handleConvertToIndicatorAndClose = () => {
    onConvertToIndicator();
    setMenuOpen(false);
  };

  const parameterDetails = useMemo(() => {
    if (
      typeof value !== "object" ||
      value === null ||
      !("indicatorKey" in value)
    ) {
      return "";
    }
    const metadata = indicatorMetadata.find(
      (ind) => ind.key === value.indicatorKey
    );

    if (!metadata) return "";

    const parts: string[] = [];
    if (Object.keys(metadata.parameters).length > 0) {
      parts.push(Object.values(value.values).join(", "));
    }
    if (metadata.outputs.length > 1) {
      const selectedOutputKey = value.outputs[0];
      const outputMeta = metadata.outputs.find(
        (out) => out.key === selectedOutputKey
      );
      if (outputMeta) {
        parts.push(outputMeta.label);
      }
    }
    parts.push(value.timeframe);

    // Offset이 0보다 크면 표시
    if (value.offset && value.offset > 0) {
      parts.push(`Offset: ${value.offset}`);
    }

    return parts.filter(Boolean).join(", ");
  }, [value, indicatorMetadata]);

  if (value === null) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full border-dashed transition-colors hover:bg-muted/50 hover:border-primary/30 flex items-center justify-center text-muted-foreground"
        onClick={onSelectIndicator}
      >
        {t("addIndicatorOrValue")}
      </Button>
    );
  }

  if (typeof value === "object" && "indicatorKey" in value) {
    return (
      <div className="flex w-full items-center">
        <ParameterPopover
          indicatorValue={value}
          onUpdate={(newValue) => onValueChange(newValue)}
          onIndicatorChange={onSelectIndicator}
        >
          <Button
            type="button"
            variant="outline"
            className="flex h-10 w-full items-center justify-start rounded-r-none text-left"
          >
            <div className="truncate">
              <span className="font-semibold">{value.indicatorKey}</span>
              {parameterDetails && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({parameterDetails})
                </span>
              )}
            </div>
          </Button>
        </ParameterPopover>
        <DropdownMenu open={isMenuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-l-none border-l-0 flex-shrink-0"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={handleSelectIndicatorAndClose}>
              {t("changeIndicator")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleConvertToValueAndClose}>
              {t("changeToValue")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // 숫자 입력 슬롯 (기존과 동일)
  return (
    <div className="flex w-full items-center">
      <Input
        type="number"
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="h-10 flex-grow rounded-r-none focus-visible:ring-offset-0"
      />
      <DropdownMenu open={isMenuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-l-none border-l-0 flex-shrink-0"
          >
            <Replace className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={handleConvertToIndicatorAndClose}>
            {t("changeToIndicator")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
