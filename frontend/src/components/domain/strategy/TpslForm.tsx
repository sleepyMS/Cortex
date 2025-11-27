"use client";

import { useTranslations } from "next-intl";
import { UseFormReturn, useWatch } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { Lock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

// --- UI 컴포넌트 임포트 ---
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { Separator } from "@/components/ui/Separator";
import { Checkbox } from "@/components/ui/Checkbox";

// --- Props 타입 정의 ---
interface TpslFormProps {
  form: UseFormReturn<any>;
  onModeChange: (mode: TpslMode) => void;
}

export type TpslMode = "percentage" | "atr";

// --- 메인 컴포넌트 ---
export function TpslForm({ form, onModeChange }: TpslFormProps) {
  const t = useTranslations("StrategyBuilder.tpslForm");
  const router = useRouter();
  const { isProOrTrader } = useUserSubscription();
  const [selectedMode, setSelectedMode] = useState<TpslMode>("percentage");

  // 폼 값 감시 (체크박스 상태 동기화용)
  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    const initialValues = form.getValues();
    const newMode =
      initialValues.atrPeriod ||
      initialValues.atrStopLossMultiplier ||
      initialValues.atrTakeProfitMultiplier
        ? "atr"
        : "percentage";
    setSelectedMode(newMode);
    onModeChange(newMode);
  }, [form.getValues, onModeChange]);

  const handleModeChange = (newMode: TpslMode) => {
    if (newMode === selectedMode) return;
    setSelectedMode(newMode);
    onModeChange(newMode);

    // 모드 변경 시 값 초기화 로직은 유지하되,
    // 체크박스 로직에 의해 null로 설정되므로 여기서는 모드 전환에 집중
    if (newMode === "atr") {
      form.setValue("takeProfitPct", null);
      form.setValue("stopLossPct", null);
    } else if (newMode === "percentage") {
      form.setValue("atrTakeProfitMultiplier", null);
      form.setValue("atrStopLossMultiplier", null);
      form.setValue("atrPeriod", null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedMode}
          onValueChange={(value) => handleModeChange(value as TpslMode)}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <RadioGroupItem
              value="percentage"
              id="mode-percentage"
              className="peer sr-only"
            />
            <FormLabel
              htmlFor="mode-percentage"
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              {t("percentageTab")}
            </FormLabel>
          </div>
          <div>
            <RadioGroupItem
              value="atr"
              id="mode-atr"
              className="peer sr-only"
              disabled={!isProOrTrader}
            />
            <FormLabel
              htmlFor="mode-atr"
              className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${
                !isProOrTrader
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer"
              }`}
            >
              <span className="flex items-center gap-2">
                {t("atrTab")}
                {!isProOrTrader && <Lock className="h-4 w-4 text-purple-500" />}
              </span>
            </FormLabel>
          </div>
        </RadioGroup>

        <Separator />

        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-8 gap-y-6 pt-4">
          {/* 1. 퍼센티지 기반 손익절 설정 UI */}
          <fieldset
            disabled={selectedMode !== "percentage"}
            className="space-y-6 transition-opacity duration-300 disabled:opacity-50"
          >
            <h3 className="font-medium text-foreground">
              {t("percentageTab")}
            </h3>

            {/* 익절 (Percentage) */}
            <FormField
              control={form.control}
              name="takeProfitPct"
              render={({ field }) => {
                const isEnabled =
                  field.value !== null && field.value !== undefined;
                return (
                  <FormItem className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="use-tp-pct"
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange(10); // 기본값 10%
                          } else {
                            field.onChange(null);
                          }
                        }}
                      />
                      <FormLabel
                        htmlFor="use-tp-pct"
                        className="cursor-pointer font-normal"
                      >
                        {t("takeProfitPctLabel")} 사용
                      </FormLabel>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <FormControl>
                        <Input
                          className="w-[50%]"
                          type="number"
                          step="0.1"
                          placeholder={t("takeProfitPctPlaceholder")}
                          {...field}
                          disabled={!isEnabled}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || null)
                          }
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <span className="text-muted-foreground">
                        {t("percentSymbol")}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* 손절 (Percentage) */}
            <FormField
              control={form.control}
              name="stopLossPct"
              render={({ field }) => {
                const isEnabled =
                  field.value !== null && field.value !== undefined;
                return (
                  <FormItem className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="use-sl-pct"
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange(5); // 기본값 5%
                          } else {
                            field.onChange(null);
                          }
                        }}
                      />
                      <FormLabel
                        htmlFor="use-sl-pct"
                        className="cursor-pointer font-normal"
                      >
                        {t("stopLossPctLabel")} 사용
                      </FormLabel>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <FormControl>
                        <Input
                          className="w-[50%]"
                          type="number"
                          step="0.1"
                          placeholder={t("stopLossPctPlaceholder")}
                          {...field}
                          disabled={!isEnabled}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || null)
                          }
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <span className="text-muted-foreground">
                        {t("percentSymbol")}
                      </span>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </fieldset>

          <Separator orientation="vertical" className="h-auto" />

          {/* 2. ATR 기반 손익절 설정 UI */}
          <div className="relative">
            <fieldset
              disabled={selectedMode !== "atr"}
              className="space-y-6 transition-opacity duration-300 disabled:opacity-50"
            >
              <h3 className="font-medium text-foreground flex items-center gap-2">
                {t("atrTab")}
              </h3>

              {/* 익절 (ATR) */}
              <FormField
                control={form.control}
                name="atrTakeProfitMultiplier"
                render={({ field }) => {
                  const isEnabled =
                    field.value !== null && field.value !== undefined;
                  return (
                    <FormItem className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="use-tp-atr"
                          checked={isEnabled}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange(3); // 기본값 3배
                            } else {
                              field.onChange(null);
                            }
                          }}
                        />
                        <FormLabel
                          htmlFor="use-tp-atr"
                          className="cursor-pointer font-normal"
                        >
                          {t("atrTakeProfitLabel")} 사용
                        </FormLabel>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <FormControl>
                          <Input
                            className="w-[50%]"
                            type="number"
                            step="0.1"
                            placeholder={t(
                              "atrTakeProfitMultiplierPlaceholder"
                            )}
                            {...field}
                            disabled={!isEnabled}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || null)
                            }
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <span className="text-muted-foreground">
                          {t("atrMultiplierUnit")}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* 손절 (ATR) */}
              <FormField
                control={form.control}
                name="atrStopLossMultiplier"
                render={({ field }) => {
                  const isEnabled =
                    field.value !== null && field.value !== undefined;
                  return (
                    <FormItem className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="use-sl-atr"
                          checked={isEnabled}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange(2); // 기본값 2배
                            } else {
                              field.onChange(null);
                            }
                          }}
                        />
                        <FormLabel
                          htmlFor="use-sl-atr"
                          className="cursor-pointer font-normal"
                        >
                          {t("atrStopLossLabel")} 사용
                        </FormLabel>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <FormControl>
                          <Input
                            className="w-[50%]"
                            type="number"
                            step="0.1"
                            placeholder={t("atrStopLossMultiplierPlaceholder")}
                            {...field}
                            disabled={!isEnabled}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || null)
                            }
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <span className="text-muted-foreground">
                          {t("atrMultiplierUnit")}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* ATR Period (항상 표시하되, TP/SL 중 하나라도 켜져있을 때 유효) */}
              <FormField
                control={form.control}
                name="atrPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("atrPeriodLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        className="w-[50%]"
                        type="number"
                        step="1"
                        placeholder={t("atrPeriodPlaceholder")}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10) || null)
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {!isProOrTrader && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-background/80 text-center backdrop-blur-sm z-10 p-2">
                <Lock className="h-8 w-8 text-purple-500" />
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {t("proFeatureLock.description")}
                </p>
                <div className="p-1"></div>
                <button
                  type="button"
                  onClick={() => router.push("/pricing")}
                  className="col-span-2 h-8 p-[2px] rounded-lg relative group overflow-hidden
                           bg-gradient-to-r from-teal-400 via-pink-500 to-yellow-500
                           transition-all duration-500 [background-size:200%_auto] hover:[background-position:100%_0]"
                >
                  <div className="w-full h-full flex items-center justify-center rounded-md bg-background group-hover:bg-muted/80 transition-colors p-2">
                    <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                    <span
                      className="font-semibold text-sm
                                 bg-gradient-to-r from-teal-400 via-pink-500 to-yellow-500
                                 text-transparent bg-clip-text
                                 [background-size:200%_auto] transition-all duration-500
                                 group-hover:[background-position:100%_0]"
                    >
                      {t("proFeatureLock.upgradeButton")}
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
