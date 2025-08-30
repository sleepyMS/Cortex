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

import { useUserSubscription } from "@/hooks/useUserSubscription";
import { useIndicatorStore } from "@/store/indicatorStore";
import { IndicatorValue } from "@/types/strategy";
import { IndicatorMetadata } from "@/types/indicator";

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

  // 1. 전역 스토어에서 최신 지표 메타데이터를 가져옵니다.
  const allMetadata = useIndicatorStore((state) => state.metadata);
  const metadata = allMetadata.find(
    (ind) => ind.key === indicatorValue.indicatorKey
  );

  // 메타데이터가 없으면 (아직 로딩 중이거나, 잘못된 key일 경우)
  // Popover를 렌더링하지 않고 Trigger만 표시합니다.
  if (!metadata) {
    return <>{children}</>;
  }

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

  const planName = currentPlan || "Basic";
  // [개선] supportedTimeframes는 이제 백엔드 메타데이터에서 가져옵니다.
  const supportedTimeframes = metadata.supportedTimeframes || [];
  const canSelectMultipleTimeframes =
    planName !== "Basic" && supportedTimeframes.length > 1;

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
            {/* 다중 출력(Output) 렌더링 */}
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

            {/* 파라미터 렌더링 (객체 구조 사용) */}
            {Object.keys(metadata.parameters).map((paramKey) => {
              const paramDef = metadata.parameters[paramKey];
              return (
                <div
                  key={paramKey}
                  className="grid grid-cols-3 items-center gap-4"
                >
                  <Label htmlFor={paramKey}>{paramDef.label}</Label>
                  <Input
                    id={paramKey}
                    type="number"
                    value={indicatorValue.values[paramKey] ?? paramDef.default}
                    onChange={(e) =>
                      handleParameterChange(paramKey, Number(e.target.value))
                    }
                    min={paramDef.validation_range?.[0]}
                    max={paramDef.validation_range?.[1]}
                    step={paramDef.step}
                    className="col-span-2 h-8"
                  />
                </div>
              );
            })}
          </div>

          <Separator />

          {/* 타임프레임 선택 렌더링 */}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="timeframe">{t("timeframeLabel")}</Label>
            {!canSelectMultipleTimeframes ? (
              <button
                type="button"
                onClick={() => router.push("/pricing")}
                className="col-span-2 h-8 p-[2px] rounded-lg relative group overflow-hidden bg-gradient-to-r from-teal-400 via-pink-500 to-yellow-500 transition-all duration-500 [background-size:200%_auto] hover:[background-position:100%_0]"
              >
                <div className="w-full h-full flex items-center justify-center rounded-md bg-background group-hover:bg-muted/80 transition-colors">
                  <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                  <span className="font-semibold text-sm bg-gradient-to-r from-teal-400 via-pink-500 to-yellow-500 text-transparent bg-clip-text [background-size:200%_auto] transition-all duration-500 group-hover:[background-position:100%_0]">
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
                  {supportedTimeframes.map((tf) => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
