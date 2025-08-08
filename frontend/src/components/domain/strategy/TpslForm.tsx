"use client";

import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

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
import { Button } from "@/components/ui/Button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { Separator } from "@/components/ui/Separator";
import { Lock, Sparkles } from "lucide-react";

// Zod 스키마는 폼 유효성 검사를 위해 여전히 필요합니다. (부모 폼 스키마에 병합될 수 있음)
const formSchema = z
  .object({
    takeProfitPctEnabled: z.boolean().default(false),
    takeProfitPct: z.number().min(0.1).optional().nullable(),
    stopLossPctEnabled: z.boolean().default(false),
    stopLossPct: z.number().min(0.1).optional().nullable(),
    atrEnabled: z.boolean().default(false),
    atrStopLossMultiplier: z.number().min(0.1).optional().nullable(),
    atrTakeProfitMultiplier: z.number().min(0.1).optional().nullable(),
    atrPeriod: z.number().int().min(1).optional().nullable(),
  })
  .refine(
    (data) => {
      if (!data.atrEnabled) return true;
      return (
        data.atrStopLossMultiplier &&
        data.atrTakeProfitMultiplier &&
        data.atrPeriod
      );
    },
    {
      message: "ATR TP/SL 사용 시 모든 관련 필드를 채워야 합니다.",
      path: ["atrEnabled"],
    }
  );

// props 타입에서 부모의 form 객체를 받도록 수정
interface TpslFormProps {
  form: UseFormReturn<any>;
  setTpslLogic: (logic: TpslLogic | null) => void;
}

export function TpslForm({ form, setTpslLogic }: TpslFormProps) {
  const t = useTranslations("StrategyBuilder.tpslForm");
  const router = useRouter();
  const { isProOrTrader } = useUserSubscription();

  // form.watch를 사용하여 부모 폼의 값 변경을 감지하고,
  // useStrategyState의 상태를 업데이트하는 로직은 그대로 유지됩니다.
  useEffect(() => {
    const subscription = form.watch((values) => {
      const newLogic: TpslLogic = {};
      if (values.takeProfitPctEnabled && values.takeProfitPct) {
        newLogic.takeProfitPct = values.takeProfitPct;
      }
      if (values.stopLossPctEnabled && values.stopLossPct) {
        newLogic.stopLossPct = values.stopLossPct;
      }
      if (
        isProOrTrader &&
        values.atrEnabled &&
        values.atrStopLossMultiplier &&
        values.atrTakeProfitMultiplier &&
        values.atrPeriod
      ) {
        newLogic.atrStopLossMultiplier = values.atrStopLossMultiplier;
        newLogic.atrTakeProfitMultiplier = values.atrTakeProfitMultiplier;
        newLogic.atrPeriod = values.atrPeriod;
      }
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
        {/* <Form>과 <form> 태그를 제거하고 바로 FormField를 렌더링 */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <FormField
                control={form.control}
                name="takeProfitPctEnabled"
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
                name="takeProfitPct"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        className="w-24 text-right"
                        disabled={!form.watch("takeProfitPctEnabled")}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <FormMessage>
              {form.formState.errors.takeProfitPct?.message?.toString()}
            </FormMessage>

            <div className="flex items-center space-x-4">
              <FormField
                control={form.control}
                name="stopLossPctEnabled"
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
                name="stopLossPct"
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        className="w-24 text-right"
                        disabled={!form.watch("stopLossPctEnabled")}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <FormMessage>
              {form.formState.errors.stopLossPct?.message?.toString()}
            </FormMessage>
          </div>

          <Separator />

          <div className="relative space-y-4 rounded-lg border p-4">
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
            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="atrEnabled"
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
                name="atrStopLossMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("atrStopLossLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        disabled={!isProOrTrader || !form.watch("atrEnabled")}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="atrTakeProfitMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("atrTakeProfitLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        disabled={!isProOrTrader || !form.watch("atrEnabled")}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
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
                        {...field}
                        type="number"
                        step="1"
                        disabled={!isProOrTrader || !form.watch("atrEnabled")}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value, 10))
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {form.formState.errors.atrEnabled && (
              <FormMessage>
                {form.formState.errors.atrEnabled.message?.toString()}
              </FormMessage>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
