// 파일 경로: frontend/src/components/domain/strategy/TpslForm.tsx

"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

// --- UI 컴포넌트 및 타입 임포트 ---
import { TpslLogic } from "@/types/strategy";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Separator } from "@/components/ui/Separator";
import { Lock } from "lucide-react";

// --- 사용자 구독 정보 훅 임포트 ---
import { useUserSubscription } from "@/hooks/useUserSubscription";

// --- Zod 폼 스키마 정의 ---
const formSchema = z
  .object({
    take_profit_pct_enabled: z.boolean().default(false),
    take_profit_pct: z
      .number({ invalid_type_error: "숫자를 입력해주세요." })
      .min(0.1, "0.1% 이상이어야 합니다.")
      .optional(),
    stop_loss_pct_enabled: z.boolean().default(false),
    stop_loss_pct: z
      .number({ invalid_type_error: "숫자를 입력해주세요." })
      .min(0.1, "0.1% 이상이어야 합니다.")
      .optional(),
    atr_enabled: z.boolean().default(false),
    atr_stop_loss_multiplier: z
      .number({ invalid_type_error: "숫자를 입력해주세요." })
      .min(0.1, "0.1 이상이어야 합니다.")
      .optional(),
    atr_take_profit_multiplier: z
      .number({ invalid_type_error: "숫자를 입력해주세요." })
      .min(0.1, "0.1 이상이어야 합니다.")
      .optional(),
    atr_period: z
      .number({ invalid_type_error: "숫자를 입력해주세요." })
      .int("정수여야 합니다.")
      .min(1, "1 이상이어야 합니다.")
      .optional(),
  })
  // ATR이 활성화되면 모든 관련 필드가 채워져야 한다는 유효성 검사
  .refine(
    (data) => {
      if (!data.atr_enabled) return true;
      return (
        data.atr_stop_loss_multiplier !== undefined &&
        data.atr_take_profit_multiplier !== undefined &&
        data.atr_period !== undefined
      );
    },
    {
      message: "ATR TP/SL 사용 시 모든 관련 필드를 채워야 합니다.",
      path: ["atr_enabled"], // 오류 메시지를 이 필드에 연결
    }
  );

type TpslFormValues = z.infer<typeof formSchema>;

interface TpslFormProps {
  tpslLogic: TpslLogic | null;
  setTpslLogic: (logic: TpslLogic | null) => void;
}

export function TpslForm({ tpslLogic, setTpslLogic }: TpslFormProps) {
  const t = useTranslations("StrategyBuilder.tpslForm");
  const router = useRouter();
  const { isProOrTrader } = useUserSubscription(); // 사용자 플랜 정보 확인

  const isAtrEnabledInLogic = tpslLogic?.atr_stop_loss_multiplier !== undefined;

  const form = useForm<TpslFormValues>({
    resolver: zodResolver(formSchema),
    // 훅의 상태(tpslLogic)를 기반으로 폼의 기본값 설정
    defaultValues: {
      take_profit_pct_enabled:
        tpslLogic?.take_profit_pct !== undefined &&
        tpslLogic.take_profit_pct !== null,
      take_profit_pct: tpslLogic?.take_profit_pct ?? 2,
      stop_loss_pct_enabled:
        tpslLogic?.stop_loss_pct !== undefined &&
        tpslLogic.stop_loss_pct !== null,
      stop_loss_pct: tpslLogic?.stop_loss_pct ?? 1,
      atr_enabled: isAtrEnabledInLogic,
      atr_stop_loss_multiplier: tpslLogic?.atr_stop_loss_multiplier ?? 2,
      atr_take_profit_multiplier: tpslLogic?.atr_take_profit_multiplier ?? 3,
      atr_period: tpslLogic?.atr_period ?? 14,
    },
  });

  // 폼의 값이 변경될 때마다 useStrategyState의 상태를 업데이트
  useEffect(() => {
    const subscription = form.watch((values) => {
      const newLogic: TpslLogic = {};
      if (values.take_profit_pct_enabled && values.take_profit_pct) {
        newLogic.take_profit_pct = values.take_profit_pct;
      }
      if (values.stop_loss_pct_enabled && values.stop_loss_pct) {
        newLogic.stop_loss_pct = values.stop_loss_pct;
      }
      if (
        isProOrTrader && // 유료 사용자일 경우에만 ATR 로직 포함
        values.atr_enabled &&
        values.atr_stop_loss_multiplier &&
        values.atr_take_profit_multiplier &&
        values.atr_period
      ) {
        newLogic.atr_stop_loss_multiplier = values.atr_stop_loss_multiplier;
        newLogic.atr_take_profit_multiplier = values.atr_take_profit_multiplier;
        newLogic.atr_period = values.atr_period;
      }
      // 생성된 로직 객체가 비어있지 않으면 상태 업데이트, 비어있으면 null로 설정
      setTpslLogic(Object.keys(newLogic).length > 0 ? newLogic : null);
    });

    return () => subscription.unsubscribe();
  }, [form, setTpslLogic, isProOrTrader]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            {/* --- 고정 비율 TP/SL 설정 --- */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <FormField
                  control={form.control}
                  name="take_profit_pct_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal w-28">
                        {t("takeProfitPctLabel")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="take_profit_pct"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          className="w-24 text-right"
                          disabled={!form.watch("take_profit_pct_enabled")}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <FormMessage>
                {form.formState.errors.take_profit_pct?.message}
              </FormMessage>

              <div className="flex items-center space-x-4">
                <FormField
                  control={form.control}
                  name="stop_loss_pct_enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="font-normal w-28">
                        {t("stopLossPctLabel")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stop_loss_pct"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          className="w-24 text-right"
                          disabled={!form.watch("stop_loss_pct_enabled")}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <FormMessage>
                {form.formState.errors.stop_loss_pct?.message}
              </FormMessage>
            </div>

            <Separator />

            {/* --- ATR 기반 TP/SL 설정 (유료 기능) --- */}
            <div className="relative space-y-4 rounded-lg border p-4">
              {/* Basic 사용자를 위한 업그레이드 유도 UI */}
              {!isProOrTrader && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]">
                  <Lock className="h-8 w-8 text-yellow-500 mb-2" />
                  <p className="mb-2 text-center font-semibold text-foreground">
                    {t("upgradeRequiredTitle")}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => router.push("/pricing")}
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg hover:shadow-xl transition-shadow"
                  >
                    {t("upgradeButton")}
                  </Button>
                </div>
              )}

              {/* 실제 ATR 폼 필드 */}
              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="atr_enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isProOrTrader}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t("atrEnabledLabel")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="atr_stop_loss_multiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("atrStopLossLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          disabled={
                            !isProOrTrader || !form.watch("atr_enabled")
                          }
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="atr_take_profit_multiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("atrTakeProfitLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.1"
                          disabled={
                            !isProOrTrader || !form.watch("atr_enabled")
                          }
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="atr_period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("atrPeriodLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="1"
                          disabled={
                            !isProOrTrader || !form.watch("atr_enabled")
                          }
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value, 10))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {form.formState.errors.atr_enabled && (
                <FormMessage>
                  {form.formState.errors.atr_enabled.message}
                </FormMessage>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
