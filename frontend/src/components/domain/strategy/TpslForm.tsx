// file: frontend/src/components/domain/strategy/TpslForm.tsx

"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { TpslLogic } from "@/types/strategy";
import { Card } from "@/components/ui/Card";
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
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { Save } from "lucide-react";

interface TpslFormProps {
  tpslLogic: TpslLogic | null;
  setTpslLogic: (logic: TpslLogic | null) => void;
}

const formSchema = z
  .object({
    take_profit_pct_enabled: z.boolean().default(false),
    take_profit_pct: z
      .number()
      .min(0.1, "최소 0.1% 이상이어야 합니다.")
      .optional(),
    stop_loss_pct_enabled: z.boolean().default(false),
    stop_loss_pct: z
      .number()
      .min(0.1, "최소 0.1% 이상이어야 합니다.")
      .optional(),
    atr_enabled: z.boolean().default(false),
    atr_stop_loss_multiplier: z
      .number()
      .min(0.1, "최소 0.1 이상이어야 합니다.")
      .optional(),
    atr_take_profit_multiplier: z
      .number()
      .min(0.1, "최소 0.1 이상이어야 합니다.")
      .optional(),
    atr_period: z.number().int().min(1, "최소 1 이상이어야 합니다.").optional(),
  })
  .refine(
    (data) =>
      !data.atr_enabled ||
      (data.atr_stop_loss_multiplier &&
        data.atr_take_profit_multiplier &&
        data.atr_period),
    {
      message: "ATR TP/SL 사용 시 모든 필드를 채워야 합니다.",
      path: ["atr_enabled"],
    }
  );

type TpslFormValues = z.infer<typeof formSchema>;

export function TpslForm({ tpslLogic, setTpslLogic }: TpslFormProps) {
  const t = useTranslations("StrategyBuilder");
  const { isProOrTrader } = useUserSubscription();
  const isAtrEnabled = tpslLogic?.atr_stop_loss_multiplier !== undefined;

  const form = useForm<TpslFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      take_profit_pct_enabled: tpslLogic?.take_profit_pct !== undefined,
      take_profit_pct: tpslLogic?.take_profit_pct ?? 2,
      stop_loss_pct_enabled: tpslLogic?.stop_loss_pct !== undefined,
      stop_loss_pct: tpslLogic?.stop_loss_pct ?? 1,
      atr_enabled: isAtrEnabled,
      atr_stop_loss_multiplier: tpslLogic?.atr_stop_loss_multiplier ?? 2,
      atr_take_profit_multiplier: tpslLogic?.atr_take_profit_multiplier ?? 3,
      atr_period: tpslLogic?.atr_period ?? 14,
    },
  });

  const onSubmit = (values: TpslFormValues) => {
    const newLogic: TpslLogic = {};
    if (values.take_profit_pct_enabled && values.take_profit_pct) {
      newLogic.take_profit_pct = values.take_profit_pct;
    }
    if (values.stop_loss_pct_enabled && values.stop_loss_pct) {
      newLogic.stop_loss_pct = values.stop_loss_pct;
    }
    if (isProOrTrader && values.atr_enabled) {
      newLogic.atr_stop_loss_multiplier = values.atr_stop_loss_multiplier;
      newLogic.atr_take_profit_multiplier = values.atr_take_profit_multiplier;
      newLogic.atr_period = values.atr_period;
    }
    setTpslLogic(Object.keys(newLogic).length > 0 ? newLogic : null);
  };

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-xl font-bold">{t("tpslForm.title")}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center space-x-2">
            <FormField
              control={form.control}
              name="take_profit_pct_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(e) => {
                        field.onChange(e);
                        if (!e) form.setValue("take_profit_pct", undefined);
                      }}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {t("tpslForm.takeProfitPctLabel")}
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="take_profit_pct"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.1"
                      className="w-24"
                      disabled={!form.watch("take_profit_pct_enabled")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <span className="text-muted-foreground">%</span>
          </div>

          <div className="flex items-center space-x-2">
            <FormField
              control={form.control}
              name="stop_loss_pct_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(e) => {
                        field.onChange(e);
                        if (!e) form.setValue("stop_loss_pct", undefined);
                      }}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {t("tpslForm.stopLossPctLabel")}
                  </FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stop_loss_pct"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.1"
                      className="w-24"
                      disabled={!form.watch("stop_loss_pct_enabled")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <span className="text-muted-foreground">%</span>
          </div>

          {isProOrTrader && (
            <div className="space-y-2 mt-4 p-4 border rounded-md">
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
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t("tpslForm.atrEnabledLabel")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("atr_enabled") && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="atr_stop_loss_multiplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("tpslForm.atrStopLossLabel")}</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.1" />
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
                        <FormLabel>
                          {t("tpslForm.atrTakeProfitLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.1" />
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
                        <FormLabel>{t("tpslForm.atrPeriodLabel")}</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          )}

          <Button type="submit" className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {t("tpslForm.saveButton")}
          </Button>
        </form>
      </Form>
    </Card>
  );
}
