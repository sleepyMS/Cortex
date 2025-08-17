"use client";

import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";
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
import { Button } from "@/components/ui/Button";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { Separator } from "@/components/ui/Separator";

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
    if (newMode === "atr") {
      form.setValue("takeProfitPct", null, { shouldValidate: true });
      form.setValue("stopLossPct", null, { shouldValidate: true });
    } else if (newMode === "percentage") {
      form.setValue("atrTakeProfitMultiplier", null, { shouldValidate: true });
      form.setValue("atrStopLossMultiplier", null, { shouldValidate: true });
      form.setValue("atrPeriod", null, { shouldValidate: true });
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

        {/* 변경: grid-cols-2를 grid-cols-[1fr_auto_1fr]로 수정하여 구분선 공간 확보 */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-8 gap-y-6 pt-4">
          {/* 1. 퍼센티지 기반 손익절 설정 UI */}
          <fieldset
            disabled={selectedMode !== "percentage"}
            className="space-y-4 transition-opacity duration-300 disabled:opacity-50"
          >
            <h3 className="font-medium text-foreground">
              {t("percentageTab")}
            </h3>
            <FormField
              control={form.control}
              name="takeProfitPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("takeProfitPctLabel")}</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        className="w-[50%]"
                        type="number"
                        step="0.1"
                        placeholder={t("takeProfitPctPlaceholder")}
                        {...field}
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
              )}
            />
            <FormField
              control={form.control}
              name="stopLossPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("stopLossPctLabel")}</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        className="w-[50%]"
                        type="number"
                        step="0.1"
                        placeholder={t("stopLossPctPlaceholder")}
                        {...field}
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
              )}
            />
          </fieldset>

          {/* 변경: 수직 구분선 추가 */}
          <Separator orientation="vertical" className="h-auto" />

          {/* 2. ATR 기반 손익절 설정 UI */}
          <div className="relative">
            <fieldset
              disabled={selectedMode !== "atr"}
              className="space-y-4 transition-opacity duration-300 disabled:opacity-50"
            >
              <h3 className="font-medium text-foreground flex items-center gap-2">
                {t("atrTab")}
              </h3>
              <FormField
                control={form.control}
                name="atrTakeProfitMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("atrTakeProfitLabel")}</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          className="w-[50%]"
                          type="number"
                          step="0.1"
                          placeholder={t("atrTakeProfitMultiplierPlaceholder")}
                          {...field}
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
                )}
              />
              <FormField
                control={form.control}
                name="atrStopLossMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("atrStopLossLabel")}</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input
                          className="w-[50%]"
                          type="number"
                          step="0.1"
                          placeholder={t("atrStopLossMultiplierPlaceholder")}
                          {...field}
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
                )}
              />
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
