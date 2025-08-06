// file: frontend/src/components/domain/strategy/ParameterPopover.tsx

"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { RefreshCcw } from "lucide-react";

import { IndicatorValue } from "@/types/strategy";
import { INDICATOR_METADATA, IndicatorMetadata } from "@/lib/indicators";
import { useUserSubscription } from "@/hooks/useUserSubscription";

interface ParameterPopoverProps {
  indicatorValue: IndicatorValue;
  onUpdate: (newValue: IndicatorValue) => void;
  onIndicatorChange: () => void;
  children: React.ReactNode;
}

export function ParameterPopover({
  indicatorValue,
  onUpdate,
  onIndicatorChange,
  children,
}: ParameterPopoverProps) {
  const t = useTranslations("ParameterPopover");
  const { currentPlan, allowedTimeframes } = useUserSubscription(); // 👈 훅에서 플랜 정보 가져오기

  const metadata: IndicatorMetadata | undefined = INDICATOR_METADATA.find(
    (ind) => ind.key === indicatorValue.indicatorKey
  );

  if (!metadata) return null;

  const handleParameterChange = (paramKey: string, newValue: any) => {
    onUpdate({
      ...indicatorValue,
      values: { ...indicatorValue.values, [paramKey]: newValue },
    });
  };

  const handleOutputChange = (newOutput: string) => {
    onUpdate({
      ...indicatorValue,
      outputs: [newOutput],
    });
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    onUpdate({
      ...indicatorValue,
      timeframe: newTimeframe,
    });
  };

  const canSelectMultipleTimeframes = ["trader", "pro"].includes(
    currentPlan.name
  );
  const selectedOutputMetadata = metadata.outputs.find(
    (o) => o.key === indicatorValue.outputs[0]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 bg-popover border-border shadow-lg">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-foreground">
              {metadata.label}
              <span className="text-muted-foreground text-sm ml-1">
                {t("title")}
              </span>
            </h4>
            <p className="text-sm text-muted-foreground">
              {metadata.description}
            </p>
          </div>
          <div className="grid gap-4">
            {metadata.outputs.length > 1 && (
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="output" className="text-foreground">
                  {t("outputLabel")}
                </Label>
                <Select
                  value={indicatorValue.outputs[0]}
                  onValueChange={handleOutputChange}
                >
                  <SelectTrigger className="col-span-2 h-8 bg-background border-input focus:ring-ring">
                    <SelectValue placeholder={t("selectOutputPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {metadata.outputs.map((output) => (
                      <SelectItem key={output.key} value={output.key}>
                        {output.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {metadata.parameters.map((param) => (
              <div
                key={param.key}
                className="grid grid-cols-3 items-center gap-4"
              >
                <Label htmlFor={param.key} className="text-foreground">
                  {param.label}
                </Label>
                <Input
                  id={param.key}
                  type="number"
                  value={indicatorValue.values[param.key] ?? param.default}
                  onChange={(e) =>
                    handleParameterChange(param.key, Number(e.target.value))
                  }
                  className="col-span-2 h-8 bg-background border-input focus-visible:ring-ring"
                />
              </div>
            ))}

            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="timeframe" className="text-foreground">
                {t("timeframeLabel")}
              </Label>
              {!canSelectMultipleTimeframes ? (
                <Button
                  variant="outline"
                  className="col-span-2 h-8 bg-secondary/30 text-secondary-foreground hover:bg-secondary/50 transition-colors cursor-not-allowed"
                  disabled
                >
                  {t("upgradePlanForTimeframe")}
                </Button>
              ) : (
                <Select
                  value={indicatorValue.timeframe}
                  onValueChange={handleTimeframeChange}
                >
                  <SelectTrigger className="col-span-2 h-8 bg-background border-input focus:ring-ring">
                    <SelectValue
                      placeholder={t("selectTimeframePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {metadata.supportedTimeframes
                      .filter((tf) => allowedTimeframes.includes(tf))
                      .map((tf) => (
                        <SelectItem key={tf} value={tf}>
                          {tf}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-4 bg-secondary/30 text-secondary-foreground hover:bg-secondary/50 transition-colors"
            onClick={onIndicatorChange}
          >
            <RefreshCcw className="h-4 w-4 mr-2" /> {t("changeIndicatorButton")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
