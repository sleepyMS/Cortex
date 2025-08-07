"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { Separator } from "@/components/ui/Separator";
import { RefreshCcw, Sparkles } from "lucide-react";

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
  const router = useRouter();
  const { currentPlan } = useUserSubscription();

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
    onUpdate({ ...indicatorValue, outputs: [newOutput] });
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    onUpdate({ ...indicatorValue, timeframe: newTimeframe });
  };

  const planName = currentPlan?.plan?.name?.toLowerCase() || "basic";
  const canSelectMultipleTimeframes = ["trader", "pro"].includes(planName);

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 bg-popover border-border shadow-lg">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-foreground">
              {metadata.label}
            </h4>
            <p className="text-sm text-muted-foreground">
              {metadata.description}
            </p>
          </div>

          <Separator />

          <div className="grid gap-4">
            {metadata.outputs.length > 1 && (
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="output">{t("outputLabel")}</Label>
                <Select
                  value={indicatorValue.outputs[0]}
                  onValueChange={handleOutputChange}
                >
                  <SelectTrigger className="col-span-2 h-8">
                    <SelectValue placeholder={t("selectOutputPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
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
                <Label htmlFor={param.key}>{param.label}</Label>
                <Input
                  id={param.key}
                  type="number"
                  value={indicatorValue.values[param.key] ?? param.default}
                  onChange={(e) =>
                    handleParameterChange(param.key, Number(e.target.value))
                  }
                  className="col-span-2 h-8"
                />
              </div>
            ))}
          </div>

          <Separator />

          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="timeframe">{t("timeframeLabel")}</Label>
            {/* 🔽🔽🔽 핵심 수정 영역 🔽🔽🔽 */}
            {!canSelectMultipleTimeframes ? (
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="col-span-2 h-8 p-[2px] rounded-lg relative group overflow-hidden
                           bg-gradient-to-r from-teal-400 via-pink-500 to-yellow-500
                           transition-all duration-500 [background-size:200%_auto] hover:[background-position:100%_0]"
              >
                <div className="w-full h-full flex items-center justify-center rounded-md bg-background group-hover:bg-muted/80 transition-colors">
                  <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                  <span
                    className="font-semibold text-sm
                                 bg-gradient-to-r from-teal-400 via-pink-500 to-yellow-500
                                 text-transparent bg-clip-text
                                 [background-size:200%_auto] transition-all duration-500
                                 group-hover:[background-position:100%_0]"
                  >
                    {t("upgradePlanForTimeframe")}
                  </span>
                </div>
              </button>
            ) : (
              <Select
                value={indicatorValue.timeframe}
                onValueChange={handleTimeframeChange}
              >
                <SelectTrigger className="col-span-2 h-8">
                  <SelectValue placeholder={t("selectTimeframePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {metadata.supportedTimeframes.map((tf) => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* 🔼🔼🔼 핵심 수정 영역 완료 🔼🔼🔼 */}
          </div>

          <Separator />

          <Button
            variant="outline"
            className="w-full"
            onClick={onIndicatorChange}
          >
            <RefreshCcw className="h-4 w-4 mr-2" /> {t("changeIndicatorButton")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
