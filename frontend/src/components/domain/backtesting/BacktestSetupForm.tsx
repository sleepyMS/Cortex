"use client";

import * as React from "react";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { addDays, startOfDay } from "date-fns";
import Link from "next/link";
import { PlusCircle, Loader2, CheckCircle, Lock } from "lucide-react";

import apiClient from "@/lib/apiClient";
import { Strategy, LogicBlock, IndicatorMetadata } from "@/types/strategy";
import { cn } from "@/lib/utils";
import { useIndicatorStore } from "@/store/indicatorStore";

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
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { DateRangePickerCustom } from "@/components/ui/DateRangePickerCustom";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { ParameterTreeView } from "./ParameterTreeView";

// --- Zod 폼 유효성 검사 스키마 ---
const parameterOverrideSchema = z.object({
  path: z.string(),
  value: z.any(),
});

const formSchema = z
  .object({
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
    initialCapital: z.coerce
      .number()
      .min(1, "초기 자본금은 1 이상이어야 합니다."),
    leverage: z.coerce.number().min(1).max(125),
    feePct: z.coerce.number().min(0).max(1),
    slippagePct: z.coerce.number().min(0).max(1),
    overrides: z.array(parameterOverrideSchema).optional(),
    trailingStopEnabled: z.boolean().default(false),
    trailingStopActivationPct: z.coerce.number().min(0).optional(),
    trailingStopCallbackPct: z.coerce.number().min(0.1).optional(),
  })
  .refine(
    (data) => {
      if (data.trailingStopEnabled) {
        return (
          data.trailingStopActivationPct !== undefined &&
          data.trailingStopCallbackPct !== undefined
        );
      }
      return true;
    },
    {
      message: "활성화 및 콜백 %를 입력해야 합니다.",
      path: ["trailingStopCallbackPct"],
    }
  );
type FormValues = z.infer<typeof formSchema>;

// --- 메인 컴포넌트 ---
export function BacktestSetupForm() {
  const t = useTranslations("BacktestSetupForm");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { metadata: indicatorMetadataArray, isLoaded } = useIndicatorStore();

  const indicatorDefinitions = useMemo(() => {
    if (!isLoaded) return {};
    return indicatorMetadataArray.reduce((acc, meta) => {
      acc[meta.indicatorKey] = meta;
      return acc;
    }, {} as Record<string, IndicatorMetadata>);
  }, [indicatorMetadataArray, isLoaded]);

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      initialCapital: 10000,
      leverage: 1,
      feePct: 0.05,
      slippagePct: 0.01,
      dateRange: {
        from: startOfDay(addDays(new Date(), -365)),
        to: startOfDay(new Date()),
      },
      overrides: [],
      trailingStopEnabled: false,
    },
  });
  const { control, watch } = methods;
  const { fields, replace } = useFieldArray({ control, name: "overrides" });
  const watchedStrategyId = watch("strategyId");
  const watchedTrailingStop = watch("trailingStopEnabled");

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

  // [핵심] 전략 변경 시 모든 파라미터를 재귀적으로 추출하여 폼 상태를 업데이트
  useEffect(() => {
    if (!selectedStrategy) {
      replace([]);
      return;
    }

    const extractParamsRecursive = (
      blocks: LogicBlock[],
      pathPrefix: string
    ): { path: string; value: any }[] => {
      let params: { path: string; value: any }[] = [];
      blocks.forEach((block, index) => {
        const currentPath = `${pathPrefix}.${index}`;

        // 블록의 모든 키를 순회
        for (const key in block) {
          if (key === "children" || key === "id" || key === "type") continue;

          const value = (block as any)[key];

          // 1. 기존 로직: 지표(indicator) 내부의 파라미터 추출
          if (
            value &&
            typeof value === "object" &&
            "indicatorKey" in value &&
            "values" in value
          ) {
            for (const [paramKey, paramValue] of Object.entries(value.values)) {
              if (typeof paramValue === "number") {
                params.push({
                  path: `${currentPath}.${key}.values.${paramKey}`,
                  value: paramValue,
                });
              }
            }
          }
          // 2. 신규 로직: 블록에 직접 속한 숫자형 파라미터 추출 (예: lowerBound, operandB)
          else if (typeof value === "number") {
            params.push({ path: `${currentPath}.${key}`, value: value });
          }
        }

        // 3. 자식 블록 재귀 호출 (기존과 동일)
        if (block.children && block.children.length > 0) {
          params = [
            ...params,
            ...extractParamsRecursive(
              block.children,
              `${currentPath}.children.blocks`
            ),
          ];
        }
      });
      return params;
    };

    let allParams: { path: string; value: any }[] = [];
    const ruleKeys: (keyof Strategy)[] = [
      "longEntryRules",
      "longExitRules",
      "shortEntryRules",
      "shortExitRules",
    ];

    ruleKeys.forEach((key) => {
      const rules = selectedStrategy[key];
      if (rules && rules.blocks) {
        allParams = [
          ...allParams,
          ...extractParamsRecursive(rules.blocks, `${key}.blocks`),
        ];
      }
    });

    if (selectedStrategy.tpslLogic) {
      for (const [key, value] of Object.entries(selectedStrategy.tpslLogic)) {
        if (typeof value === "number") {
          allParams.push({ path: `tpslLogic.${key}`, value });
        }
      }
    }

    replace(allParams);
  }, [selectedStrategy, replace]);

  const getTpslLogicText = (tpslLogic: any) => {
    // tpslLogic 객체가 없거나 내용이 비어있으면 "미설정"
    if (
      !tpslLogic ||
      Object.keys(tpslLogic).every(
        (k) =>
          tpslLogic[k] === null ||
          tpslLogic[k] === undefined ||
          tpslLogic[k] === false
      )
    ) {
      return t("summary.notSet");
    }
    // ATR 관련 설정이 있으면 "ATR 기반"
    if (tpslLogic.atrPeriod) {
      return t("summary.tpslTypes.atr");
    }
    // 고정 비율 설정이 있으면 "고정 비율"
    if (tpslLogic.takeProfitPct || tpslLogic.stopLossPct) {
      return t("summary.tpslTypes.percentage");
    }
    // 그 외의 경우 (매우 드묾)
    return t("summary.tpslSet");
  };

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
          slippage: data.slippagePct,
          overrides: data.overrides,
          tpslLogic: {
            // Trailing Stop 로직을 parameters.tpslLogic으로 전달
            trailingStopEnabled: data.trailingStopEnabled,
            trailingStopActivationPct: data.trailingStopActivationPct,
            trailingStopCallbackPct: data.trailingStopCallbackPct,
          },
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

  if (!isLoaded) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-[600px] w-full" />
        </div>
        <div className="lg:col-span-1 sticky top-24">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="standard" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="standard">{t("tabs.standard")}</TabsTrigger>
                <TabsTrigger value="walk_forward" disabled>
                  <Lock className="h-4 w-4 mr-2" />
                  {t("tabs.walkForward")}
                </TabsTrigger>
                <TabsTrigger value="monte_carlo" disabled>
                  <Lock className="h-4 w-4 mr-2" />
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
                      control={control}
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
                              {strategies?.length ? (
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
                                  <Button asChild size="sm">
                                    <Link href="/strategies/new">
                                      <PlusCircle className="mr-2 h-4 w-4" />
                                      {t("standard.goToCreateStrategy")}
                                    </Link>
                                  </Button>
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
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
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <FormField
                        control={control}
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
                        control={control}
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
                        control={control}
                        name="feePct"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("standard.feePctLabel")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.05"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="slippagePct"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("standard.slippagePctLabel")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.01"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Separator />
                    <FormField
                      control={control}
                      name="trailingStopEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>
                              {t("standard.trailingStopLabel")}
                            </FormLabel>
                            <FormDescription>
                              {t("standard.trailingStopDescription")}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    {watchedTrailingStop && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={control}
                          name="trailingStopActivationPct"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("standard.activationPctLabel")}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="2.0"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={control}
                          name="trailingStopCallbackPct"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {t("standard.callbackPctLabel")}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.1"
                                  placeholder="1.5"
                                  {...field}
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
              </TabsContent>
            </Tabs>

            {!isLoadingStrategyDetails && selectedStrategy && (
              <ParameterTreeView
                strategy={selectedStrategy}
                indicatorDefinitions={indicatorDefinitions}
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
                  <div className="space-y-2 pt-4">
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
                      <Badge variant="secondary">
                        {selectedStrategy.targetCoins?.[0]?.ticker ||
                          t("summary.notSet")}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{t("summary.tpsl")}</span>
                      <Badge variant="outline">
                        {getTpslLogicText(selectedStrategy.tpslLogic)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {t("summary.trailingStop")}
                      </span>
                      <Badge
                        variant={watchedTrailingStop ? "default" : "outline"}
                      >
                        {watchedTrailingStop
                          ? t("summary.enabled")
                          : t("summary.disabled")}
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
