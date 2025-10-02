"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import apiClient from "@/lib/apiClient";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

// UI & 아이콘
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { Calculator, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// API 응답 타입 (schemas.py 기반)
interface CostEstimationResponse {
  originalCost: number;
  discountPct: number;
  finalCost: number;
  userBalance: number;
  isSufficient: boolean;
}

// Zod 스키마 생성
const createEstimatorSchema = (t: any) =>
  z.object({
    backtestDurationYears: z
      .number({ invalid_type_error: t("validation.durationRequired") })
      .min(0.1, t("validation.durationMin")),
    minTimeframeMinutes: z.coerce
      .number()
      .min(1, t("validation.timeframeRequired")),
    trials: z.coerce.number().int().min(1, t("validation.trialsMin")),
  });

export function CostEstimator() {
  const t = useTranslations("Dashboard.credits.estimator");
  const [estimationResult, setEstimationResult] =
    useState<CostEstimationResponse | null>(null);

  const estimatorSchema = createEstimatorSchema(t);
  const form = useForm<z.infer<typeof estimatorSchema>>({
    resolver: zodResolver(estimatorSchema),
    defaultValues: {
      backtestDurationYears: 1,
      minTimeframeMinutes: 60, // 1시간 기본값
      trials: 1,
    },
  });

  const { mutate: estimateCost, isPending } = useMutation({
    mutationFn: (data: z.infer<typeof estimatorSchema>) =>
      apiClient.post("/credits/estimate-cost", data),
    onSuccess: (response) => {
      setEstimationResult(response.data);
    },
    onError: (error: any) => {
      toast.error(t("error.title"), {
        description: error.response?.data?.detail || error.message,
      });
    },
  });

  const onSubmit = (values: z.infer<typeof estimatorSchema>) => {
    estimateCost(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <FormField
              control={form.control}
              name="backtestDurationYears"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>
                    {t("form.durationLabel")} ({field.value}
                    {t("form.year")})
                  </FormLabel>
                  <FormControl>
                    <Slider
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minTimeframeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.timeframeLabel")}</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value)}
                    defaultValue={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("form.timeframePlaceholder")}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">{t("form.1m")}</SelectItem>
                      <SelectItem value="5">{t("form.5m")}</SelectItem>
                      <SelectItem value="15">{t("form.15m")}</SelectItem>
                      <SelectItem value="60">{t("form.1h")}</SelectItem>
                      <SelectItem value="240">{t("form.4h")}</SelectItem>
                      <SelectItem value="1440">{t("form.1d")}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trials"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.trialsLabel")}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="md:col-span-4">
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("form.submitButton")}
              </Button>
            </div>
          </form>
        </Form>
        <AnimatePresence>
          {estimationResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-6 p-4 border rounded-lg bg-muted/50 space-y-3"
            >
              <h4 className="font-semibold text-center">{t("result.title")}</h4>
              <div className="flex justify-between text-sm">
                <span>{t("result.originalCost")}</span>
                <span className="font-mono line-through text-muted-foreground">
                  {estimationResult.originalCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t("result.discount")}</span>
                <span className="font-mono text-emerald-500">
                  - {estimationResult.discountPct * 100} %
                </span>
              </div>
              <hr className="my-2 border-border/50" />
              <div className="flex justify-between font-bold">
                <span>{t("result.finalCost")}</span>
                <span className="font-mono">
                  {estimationResult.finalCost.toLocaleString()}
                </span>
              </div>
              <div
                className={cn(
                  "flex items-center justify-center gap-2 text-sm p-2 rounded-md",
                  estimationResult.isSufficient
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-600"
                )}
              >
                {estimationResult.isSufficient ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span>
                  {t("result.balance")}:{" "}
                  {estimationResult.userBalance.toLocaleString()} /{" "}
                  <span className="font-bold">
                    {estimationResult.isSufficient
                      ? t("result.sufficient")
                      : t("result.insufficient")}
                  </span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
