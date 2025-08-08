"use client";

import { useTranslations } from "next-intl";
import { UseFormReturn } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";

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

// props 타입에서 form 객체만 받도록 수정
interface TpslFormProps {
  form: UseFormReturn<any>;
}

export function TpslForm({ form }: TpslFormProps) {
  const t = useTranslations("StrategyBuilder.tpslForm");
  const router = useRouter();
  const { isProOrTrader } = useUserSubscription();

  // 폼 값 변경을 감지하여 전역 상태를 업데이트하던 useEffect 전체를 제거

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
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
                          field.onChange(
                            parseFloat(e.target.value) || undefined
                          )
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
                          field.onChange(
                            parseFloat(e.target.value) || undefined
                          )
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
                          field.onChange(
                            parseFloat(e.target.value) || undefined
                          )
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
                          field.onChange(
                            parseFloat(e.target.value) || undefined
                          )
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
                          field.onChange(
                            parseInt(e.target.value, 10) || undefined
                          )
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
