"use client";

import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { Lock } from "lucide-react";
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

// --- Props 타입 정의 ---
interface TpslFormProps {
  form: UseFormReturn<any>;
  onModeChange: (mode: TpslMode) => void; // 부모에게 모드 변경을 알릴 콜백 함수
}

// TP/SL 모드를 나타내는 타입
export type TpslMode = "percentage" | "atr";

// --- 메인 컴포넌트 ---
export function TpslForm({ form, onModeChange }: TpslFormProps) {
  const t = useTranslations("StrategyBuilder.tpslForm");
  const router = useRouter();
  const { isProOrTrader } = useUserSubscription();

  // 현재 선택된 TP/SL 모드를 관리하는 내부 상태
  const [selectedMode, setSelectedMode] = useState<TpslMode>("percentage");

  // 폼의 초기 데이터(수정 페이지의 경우)가 로드될 때, 저장된 값에 따라 올바른 모드를 자동으로 선택
  useEffect(() => {
    const initialValues = form.getValues();
    // ATR 관련 필드 중 하나라도 값이 있으면 'atr' 모드로 간주
    if (
      initialValues.atrPeriod ||
      initialValues.atrStopLossMultiplier ||
      initialValues.atrTakeProfitMultiplier
    ) {
      const newMode = "atr";
      setSelectedMode(newMode);
      onModeChange(newMode); // 부모에게 초기 모드 전달
    } else {
      const newMode = "percentage";
      setSelectedMode(newMode);
      onModeChange(newMode);
    }
    // onModeChange를 의존성 배열에 추가하여 부모의 핸들러가 변경될 경우에도 대응
  }, [form.getValues, onModeChange]);

  // 모드가 변경될 때, 부모에게 알리기만 하고 폼 값을 초기화하지 않음
  const handleModeChange = (newMode: TpslMode) => {
    setSelectedMode(newMode);
    onModeChange(newMode);
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
                {!isProOrTrader && <Lock className="h-4 w-4 text-yellow-500" />}
              </span>
            </FormLabel>
          </div>
        </RadioGroup>

        {/* 1. 퍼센티지 기반 손익절 설정 UI (선택된 모드가 'percentage'일 때만 보임) */}
        {selectedMode === "percentage" && (
          <div className="space-y-4 pt-4 border-t">
            <FormField
              control={form.control}
              name="takeProfitPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("takeProfitPctLabel")}</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="5.0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || null)
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <span className="text-muted-foreground">%</span>
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
                        type="number"
                        step="0.1"
                        placeholder="2.0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || null)
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* 2. ATR 기반 손익절 설정 UI (선택된 모드가 'atr'일 때만 보임) */}
        {selectedMode === "atr" && (
          <div className="space-y-4 pt-4 border-t">
            <FormField
              control={form.control}
              name="atrTakeProfitMultiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("atrTakeProfitLabel")}</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="2.0"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || null)
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <span className="text-muted-foreground">x ATR</span>
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
                        type="number"
                        step="0.1"
                        placeholder="1.5"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || null)
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <span className="text-muted-foreground">x ATR</span>
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
                      type="number"
                      step="1"
                      placeholder="14"
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
