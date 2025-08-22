"use client";

import * as React from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { addDays, startOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { PlusCircle } from "lucide-react"; // 아이콘 추가
import Link from "next/link"; // Link 컴포넌트 추가

import apiClient from "@/lib/apiClient";
import { Strategy } from "@/types/strategy";
import { cn } from "@/lib/utils";

// --- UI Components ---
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
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Loader2, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { DateRangePickerCustom } from "@/components/ui/DateRangePickerCustom"; // 최종 완성된 컴포넌트

// --- Zod Form Schema ---
const formSchema = z
  .object({
    strategyId: z.string().uuid({ message: "전략을 선택해주세요." }),
    dateRange: z.object({
      from: z.date({ required_error: "시작일을 선택해주세요." }),
      to: z.date({ required_error: "종료일을 선택해주세요." }),
    }),
    initialCapital: z.coerce
      .number()
      .min(1, "초기 자본금은 1 이상이어야 합니다."),
    leverage: z.coerce
      .number()
      .min(1, "레버리지는 1 이상이어야 합니다.")
      .max(125, "레버리지는 125 이하이어야 합니다."),
    feePct: z.coerce
      .number()
      .min(0, "수수료는 0 이상이어야 합니다.")
      .max(1, "수수료는 1 이하이어야 합니다."),
  })
  .refine((data) => data.dateRange.from < data.dateRange.to, {
    message: "종료일은 시작일보다 이후여야 합니다.",
    path: ["dateRange"],
  });

type FormValues = z.infer<typeof formSchema>;

export function BacktestSetupForm() {
  const t = useTranslations("BacktestSetupForm");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: strategies, isLoading: isLoadingStrategies } = useQuery<
    Strategy[]
  >({
    queryKey: ["userStrategiesForSetup"],
    queryFn: async () => (await apiClient.get("/strategies?limit=1000")).data,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      initialCapital: 10000,
      leverage: 1,
      feePct: 0.04,
      dateRange: {
        from: startOfDay(addDays(new Date(), -365)),
        to: startOfDay(new Date()),
      },
    },
  });

  const watchedStrategyId = form.watch("strategyId");
  const selectedStrategy = useMemo(
    () => strategies?.find((s) => s.id === watchedStrategyId),
    [strategies, watchedStrategyId]
  );

  const createBacktestMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payload = {
        strategy_id: data.strategyId,
        start_date: data.dateRange.from.toISOString(),
        end_date: data.dateRange.to.toISOString(),
        initial_capital: data.initialCapital,
        // API 명세에 추가된다면 아래 파라미터들도 함께 전송
        // parameters: {
        //   leverage: data.leverage,
        //   fee: data.feePct,
        // }
      };
      return apiClient.post("/backtests", payload);
    },
    onSuccess: () => {
      toast.success(t("submitSuccess"));
      queryClient.invalidateQueries({ queryKey: ["backtests"] });
      router.push("/backtester");
    },
    onError: (error: any) =>
      toast.error(
        t("submitError", {
          error: error?.response?.data?.detail || error.message,
        })
      ),
  });

  const onSubmit = (values: FormValues) => {
    createBacktestMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* --- 좌측: 설정 영역 --- */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="standard" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="standard">{t("tabs.standard")}</TabsTrigger>
                <TabsTrigger value="walk_forward" disabled>
                  {t("tabs.walkForward")}
                </TabsTrigger>
                <TabsTrigger value="monte_carlo" disabled>
                  {t("tabs.monteCarlo")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="standard" className="pt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("standard.title")}</CardTitle>
                    <CardDescription>
                      {t("standard.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="strategyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("standard.strategyLabel")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={isLoadingStrategies}
                          >
                            <FormControl>
                              <SelectTrigger>
                                {isLoadingStrategies ? (
                                  t("standard.strategyLoading")
                                ) : (
                                  <SelectValue
                                    placeholder={t(
                                      "standard.strategyPlaceholder"
                                    )}
                                  />
                                )}
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {!isLoadingStrategies &&
                              strategies &&
                              strategies.length > 0 ? (
                                strategies.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))
                              ) : (
                                // 전략이 없을 때 표시될 버튼
                                <div className="p-2 text-center text-sm text-muted-foreground">
                                  <p className="mb-2">
                                    {t("standard.noStrategiesFound")}
                                  </p>
                                  <Link href="/strategies">
                                    <Button className="w-full h-9">
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      {t("standard.goToCreateStrategy")}
                                    </Button>
                                  </Link>
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateRange"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t("standard.dateRangeLabel")}</FormLabel>
                          <DateRangePickerCustom
                            startDate={field.value.from}
                            endDate={field.value.to}
                            onStartDateChange={(date) =>
                              field.onChange({ ...field.value, from: date })
                            }
                            onEndDateChange={(date) =>
                              field.onChange({ ...field.value, to: date })
                            }
                          />
                          <FormMessage className="pt-1" />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="initialCapital"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("standard.initialCapitalLabel")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="10000"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="leverage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("standard.leverageLabel")}</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="feePct"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("standard.feePctLabel")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.04"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* --- 우측: 정보 요약 영역 --- */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>{t("summary.title")}</CardTitle>
                <CardDescription>{t("summary.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 min-h-[150px]">
                {!selectedStrategy ? (
                  <div className="text-center text-muted-foreground py-10">
                    <p>{t("summary.selectStrategyPrompt")}</p>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <h3 className="font-semibold text-base text-primary">
                      {selectedStrategy.name}
                    </h3>
                    <p className="text-muted-foreground line-clamp-2 text-xs">
                      {selectedStrategy.description ||
                        t("summary.noDescription")}
                    </p>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">
                        {t("summary.targetCoins")}
                      </span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {selectedStrategy.targetCoins.length > 0 ? (
                          selectedStrategy.targetCoins.map((c) => (
                            <Badge key={c.ticker} variant="secondary">
                              {c.ticker}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">{t("summary.notSet")}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-foreground">
                        {t("summary.tpsl")}
                      </span>
                      <Badge variant="outline">
                        {selectedStrategy.tpslLogic?.atrPeriod
                          ? "ATR Based"
                          : selectedStrategy.tpslLogic
                          ? "Percentage"
                          : t("summary.notSet")}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col items-start gap-3 bg-muted/50 p-4">
                <h4 className="font-semibold text-sm">
                  {t("summary.preflightCheck.title")}
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle
                      className={cn(
                        "h-4 w-4",
                        form.formState.dirtyFields.strategyId
                          ? "text-green-500"
                          : "text-gray-400"
                      )}
                    />{" "}
                    {t("summary.preflightCheck.strategy")}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle
                      className={cn(
                        "h-4 w-4",
                        form.getValues("dateRange.to")
                          ? "text-green-500"
                          : "text-gray-400"
                      )}
                    />{" "}
                    {t("summary.preflightCheck.period")}
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-2">
                  {t("summary.estimate", { duration: "약 15초" })}
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            type="submit"
            size="lg"
            className="w-full max-w-sm"
            disabled={createBacktestMutation.isPending}
          >
            {createBacktestMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("submitButton")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
