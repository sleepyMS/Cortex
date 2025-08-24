"use client";

import * as React from "react";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { addDays, startOfDay, parseISO } from "date-fns";
import Link from "next/link";
import { PlusCircle, Loader2, CheckCircle, Lock } from "lucide-react";

import apiClient from "@/lib/apiClient";
import { Strategy, LogicBlock } from "@/types/strategy";
import { cn } from "@/lib/utils";

import {
  Form,
  FormControl,
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
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { DateRangePickerCustom } from "@/components/ui/DateRangePickerCustom";
import { Skeleton } from "@/components/ui/Skeleton";
// [최종] 새로 설계한 독립적인 파라미터 뷰어 컴포넌트를 import 합니다.
import { ParameterTreeView } from "./ParameterTreeView";

// --- Zod Form Schema (overrides 필드 포함) ---
const parameterOverrideSchema = z.object({
  path: z.string(),
  value: z.any(),
});

const formSchema = z.object({
  strategyId: z.string().uuid({ message: "전략을 선택해주세요." }),
  dateRange: z
    .object({
      from: z.date({ required_error: "시작일을 선택해주세요." }),
      to: z.date({ required_error: "종료일을 선택해주세요." }),
    })
    .refine((data) => data.from < data.to, {
      message: "종료일은 시작일보다 이후여야 합니다.",
      path: ["to"],
    }),
  initialCapital: z.coerce.number().min(1),
  leverage: z.coerce.number().min(1).max(125),
  feePct: z.coerce.number().min(0).max(1),
  overrides: z.array(parameterOverrideSchema).optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function BacktestSetupForm() {
  const t = useTranslations("BacktestSetupForm");
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      initialCapital: 10000,
      leverage: 1,
      feePct: 0.04,
      dateRange: {
        from: startOfDay(addDays(new Date(), -365)),
        to: startOfDay(new Date()),
      },
      overrides: [],
    },
  });
  const { control } = methods;

  const { fields, replace } = useFieldArray({ control, name: "overrides" });
  const watchedStrategyId = methods.watch("strategyId");

  const { data: strategies, isLoading: isLoadingStrategies } = useQuery<
    Strategy[]
  >({
    queryKey: ["userStrategiesForSetup"],
    queryFn: async () => (await apiClient.get("/strategies?limit=1000")).data,
  });

  const { data: selectedStrategy, isLoading: isLoadingStrategyDetails } =
    useQuery<Strategy>({
      queryKey: ["strategyDetail", watchedStrategyId],
      queryFn: async () =>
        (await apiClient.get(`/strategies/${watchedStrategyId}`)).data,
      enabled: !!watchedStrategyId,
    });

  // [핵심] 선택된 전략이 변경될 때마다 파라미터를 추출하여 폼 상태를 업데이트하는 '두뇌' 역할
  useEffect(() => {
    if (!selectedStrategy) {
      replace([]);
      return;
    }

    const extractParams = (
      blocks: LogicBlock[],
      pathPrefix: string
    ): { path: string; value: any }[] => {
      let params: { path: string; value: any }[] = [];
      blocks.forEach((block, index) => {
        const currentPath = `${pathPrefix}.blocks.${index}`;
        Object.keys(block).forEach((key) => {
          const potentialOperand = (block as any)[key];
          if (
            potentialOperand &&
            typeof potentialOperand === "object" &&
            potentialOperand.values
          ) {
            Object.entries(potentialOperand.values).forEach(
              ([paramKey, value]) => {
                params.push({
                  path: `${currentPath}.${key}.values.${paramKey}`,
                  value,
                });
              }
            );
          }
        });
        if (block.children && block.children.length > 0) {
          params = [
            ...params,
            ...extractParams(block.children, `${currentPath}.children`),
          ];
        }
      });
      return params;
    };

    let allParams: { path: string; value: any }[] = [];
    const ruleKeys = [
      "longEntryRules",
      "longExitRules",
      "shortEntryRules",
      "shortExitRules",
    ];
    ruleKeys.forEach((key) => {
      const rules = selectedStrategy[key as keyof Strategy];
      if (rules?.blocks) {
        allParams = [...allParams, ...extractParams(rules.blocks, key)];
      }
    });
    replace(allParams);
  }, [selectedStrategy, replace]);

  const createBacktestMutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payload = {
        strategyId: data.strategyId,
        startDate: data.dateRange.from.toISOString(),
        endDate: data.dateRange.to.toISOString(),
        initialCapital: data.initialCapital,
        parameters: {
          leverage: data.leverage,
          fee: data.feePct,
          overrides: data.overrides,
        },
      };
      return apiClient.post("/backtests", payload);
    },
    onSuccess: (response) => {
      toast.success(t("submitSuccess"));
      queryClient.invalidateQueries({ queryKey: ["backtests"] });
      router.push(`/backtester/${response.data.id}`);
    },
    onError: (error: any) =>
      toast.error(
        t("submitError", {
          error: error?.response?.data?.detail || error.message,
        })
      ),
  });

  const onSubmit = (values: FormValues) =>
    createBacktestMutation.mutate(values);

  const getTpslLogicText = (tpslLogic: any) => {
    if (!tpslLogic) return t("summary.notSet");
    if (tpslLogic.atrPeriod) return t("summary.tpslTypes.atr");
    if (tpslLogic.takeProfitPct || tpslLogic.stopLossPct)
      return t("summary.tpslTypes.percentage");
    return t("summary.tpslSet");
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
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
                      control={methods.control}
                      name="strategyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("standard.strategyLabel")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
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
                              {strategies && strategies.length > 0 ? (
                                strategies.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-4 text-center">
                                  <p className="text-sm text-muted-foreground mb-3">
                                    {t("standard.noStrategiesFound")}
                                  </p>
                                  <Link href="/strategies/new">
                                    <Button size="sm">
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
                      control={methods.control}
                      name="dateRange"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t("standard.dateRangeLabel")}</FormLabel>
                          <DateRangePickerCustom
                            startDate={field.value?.from}
                            endDate={field.value?.to}
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
                        control={methods.control}
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
                        control={methods.control}
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
                        control={methods.control}
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
              {/* WIP 탭 (기존 유지) */}
              <TabsContent value="walk_forward">
                <Card className="text-center p-10 flex flex-col items-center justify-center h-full">
                  <Lock className="h-12 w-12 text-muted-foreground" />
                  <CardTitle className="mt-4">{t("wip.title")}</CardTitle>
                  <CardDescription className="mt-2">
                    {t("wip.description")}
                  </CardDescription>
                </Card>
              </TabsContent>
              <TabsContent value="monte_carlo">
                <Card className="text-center p-10 flex flex-col items-center justify-center h-full">
                  <Lock className="h-12 w-12 text-muted-foreground" />
                  <CardTitle className="mt-4">{t("wip.title")}</CardTitle>
                  <CardDescription className="mt-2">
                    {t("wip.description")}
                  </CardDescription>
                </Card>
              </TabsContent>
            </Tabs>

            {!isLoadingStrategyDetails && selectedStrategy && (
              <ParameterTreeView
                strategy={selectedStrategy}
                control={control}
                fields={fields}
              />
            )}
          </div>

          <div className="lg:col-span-1 sticky top-24">
            <Card>
              <CardHeader>
                <CardTitle>{t("summary.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 min-h-[180px]">
                {isLoadingStrategyDetails && watchedStrategyId ? (
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : !selectedStrategy ? (
                  <div className="text-center text-muted-foreground pt-12">
                    <p>{t("summary.selectStrategyPrompt")}</p>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <h3 className="font-semibold text-base text-primary break-all">
                      {selectedStrategy.name}
                    </h3>
                    <p className="text-muted-foreground line-clamp-3 text-xs">
                      {selectedStrategy.description ||
                        t("summary.noDescription")}
                    </p>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {t("summary.targetCoins")}
                      </span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                        {selectedStrategy.targetCoins?.length > 0 ? (
                          selectedStrategy.targetCoins.map((c: any) => (
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
                      <span className="font-medium">{t("summary.tpsl")}</span>
                      <Badge variant="outline">
                        {getTpslLogicText(selectedStrategy.tpslLogic)}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col items-start gap-4 bg-muted/50 p-4">
                <h4 className="font-semibold text-sm">
                  {t("summary.preflightCheck.title")}
                </h4>
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle
                      className={cn(
                        "h-4 w-4 transition-colors",
                        methods.getFieldState("strategyId").isDirty &&
                          !methods.getFieldState("strategyId").invalid
                          ? "text-green-500"
                          : "text-gray-400"
                      )}
                    />
                    <span>{t("summary.preflightCheck.strategy")}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle
                      className={cn(
                        "h-4 w-4 transition-colors",
                        methods.getFieldState("dateRange").isDirty &&
                          !methods.getFieldState("dateRange").invalid
                          ? "text-green-500"
                          : "text-gray-400"
                      )}
                    />
                    <span>{t("summary.preflightCheck.period")}</span>
                  </li>
                </ul>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  disabled={
                    createBacktestMutation.isPending ||
                    !methods.formState.isValid
                  }
                >
                  {createBacktestMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("submitButtonLoading")}
                    </>
                  ) : (
                    t("submitButton")
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
