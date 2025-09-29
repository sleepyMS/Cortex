"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { addDays, startOfDay } from "date-fns";
import Link from "next/link";
import {
  PlusCircle,
  Loader2,
  CheckCircle,
  Lock,
  Coins,
  TrendingDown,
  ShieldCheck,
  Tag,
  Percent,
  Receipt,
} from "lucide-react";
import debounce from "lodash.debounce";

import apiClient from "@/lib/apiClient";
import { Strategy, LogicBlock, IndicatorMetadata } from "@/types/strategy";
import { cn } from "@/lib/utils";
import { useIndicatorStore } from "@/store/indicatorStore";
import { useUserStore } from "@/store/userStore"; // [추가] userStore 임포트

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

// 비용 예측 API 응답 타입 (API 명세에 따라 정의)
interface CostEstimationResponse {
  originalCost: number; // 정가
  discountPct: number; // 할인율
  finalCost: number;
  userBalance: number; // 사용자 잔액
  isSufficient: boolean; // 잔액 충분 여부
}

// --- 메인 컴포넌트 ---
export function BacktestSetupForm() {
  const t = useTranslations("BacktestSetupForm");
  const router = useRouter();
  const queryClient = useQueryClient();
  const syncCreditBalance = useUserStore((state) => state.syncCreditBalance);

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
  const watchedDateRange = watch("dateRange");
  const watchedTrailingStop = watch("trailingStopEnabled");

  // --- 신규 기능: 비용 예측 로직 ---
  const [estimation, setEstimation] = useState<CostEstimationResponse | null>(
    null
  );

  const { mutate: estimateCost, isPending: isEstimatingCost } = useMutation({
    mutationFn: async (variables: {
      strategyId: string;
      startDate: Date;
      endDate: Date;
    }) => {
      // API 명세에 맞는 payload로 전송
      const payload = {
        ...variables,
        startDate: variables.startDate.toISOString(),
        endDate: variables.endDate.toISOString(),
      };
      const { data } = await apiClient.post(
        "/backtests/estimate-cost",
        payload
      );
      return data as CostEstimationResponse;
    },
    onSuccess: (data) => setEstimation(data),
    onError: () => setEstimation(null),
  });

  // `estimateCost`는 useMutation에서 반환되어 참조가 안정적이므로 의존성 배열에 포함
  const debouncedEstimateCost = useCallback(
    debounce((strategyId: string, dateRange: { from: Date; to: Date }) => {
      if (!strategyId || !dateRange?.from || !dateRange?.to) {
        setEstimation(null); // 조건이 충족되지 않으면 예측값 초기화
        return;
      }
      estimateCost({
        strategyId,
        startDate: dateRange.from,
        endDate: dateRange.to,
      });
    }, 500),
    [estimateCost]
  );

  useEffect(() => {
    debouncedEstimateCost(watchedStrategyId, watchedDateRange);
  }, [watchedStrategyId, watchedDateRange, debouncedEstimateCost]);
  // --- 비용 예측 로직 끝 ---

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

  // --- [핵심 해결책] useRef를 사용한 의존성 분리 ---
  const replaceRef = useRef(replace);
  useEffect(() => {
    // 매 렌더링마다 ref에 최신 replace 함수를 덮어쓰기만 합니다.
    // 이 과정은 리렌더링을 유발하지 않으므로 안전합니다.
    replaceRef.current = replace;
  });

  useEffect(() => {
    // 이 useEffect는 오직 selectedStrategy 데이터의 변경에만 반응합니다.
    // 내부에서는 ref를 통해 항상 최신의 replace 함수를 사용합니다.
    const currentReplace = replaceRef.current;

    if (!selectedStrategy) {
      currentReplace([]);
      return;
    }

    const extractParamsRecursive = (
      blocks: LogicBlock[],
      pathPrefix: string
    ): { path: string; value: any }[] => {
      let params: { path: string; value: any }[] = [];
      blocks.forEach((block, index) => {
        const currentPath = `${pathPrefix}.${index}`;
        for (const key in block) {
          if (key === "children" || key === "id" || key === "type") continue;
          const value = (block as any)[key];
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
          } else if (typeof value === "number") {
            params.push({ path: `${currentPath}.${key}`, value: value });
          }
        }
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

    currentReplace(allParams);
  }, [selectedStrategy]); // 의존성 배열에서 `replace`를 완전히 제거하여 무한 루프의 원인을 차단

  const getTpslLogicText = (tpslLogic: any) => {
    if (
      !tpslLogic ||
      Object.keys(tpslLogic).every(
        (k) =>
          tpslLogic[k] === null ||
          tpslLogic[k] === undefined ||
          tpslLogic[k] === false
      )
    )
      return t("summary.notSet");
    if (tpslLogic.atrPeriod) return t("summary.tpslTypes.atr");
    if (tpslLogic.takeProfitPct || tpslLogic.stopLossPct)
      return t("summary.tpslTypes.percentage");
    return t("summary.tpslSet");
  };

  const createBacktestMutation = useMutation({
    mutationFn: (data: FormValues) => {
      // [신규 로직] overrides 배열에서 TP/SL 값을 찾습니다.
      const takeProfitOverride = data.overrides?.find(
        (o) => o.path === "tpslLogic.takeProfitPct"
      );
      const stopLossOverride = data.overrides?.find(
        (o) => o.path === "tpslLogic.stopLossPct"
      );

      const payload = {
        strategyId: data.strategyId,
        startDate: data.dateRange.from.toISOString(),
        endDate: data.dateRange.to.toISOString(),
        initialCapital: data.initialCapital,
        parameters: {
          leverage: data.leverage,
          fee: data.feePct,
          slippage: data.slippagePct,
          // overrides 배열은 그대로 전달합니다.
          overrides: data.overrides,
          // [수정] tpslLogic 객체를 완전한 형태로 구성합니다.
          tpslLogic: {
            // 트레일링 스탑 관련 값
            trailingStopEnabled: data.trailingStopEnabled,
            trailingStopActivationPct: data.trailingStopActivationPct,
            trailingStopCallbackPct: data.trailingStopCallbackPct,
            // overrides 배열에서 찾은 TP/SL 값을 명시적으로 추가
            takeProfitPct: takeProfitOverride ? takeProfitOverride.value : null,
            stopLossPct: stopLossOverride ? stopLossOverride.value : null,
          },
        },
      };
      return apiClient.post("/backtests", payload);
    },
    onSuccess: (response) => {
      toast.success(t("submitSuccess"));
      syncCreditBalance();
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

                {/* 비용 예측 결과 표시 */}
                <div className="w-full pt-2">
                  <Separator className="mb-4" />
                  <h4 className="font-semibold text-sm mb-3">
                    {t("summary.costDetails.title")}
                  </h4>
                  {isEstimatingCost ? (
                    <div className="flex justify-center items-center h-24">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : estimation ? (
                    <div className="space-y-2.5 text-sm">
                      {/* 1. 정가 (Basic 플랜 기준) */}
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Tag className="h-4 w-4" /> {/* 아이콘 변경 */}
                          {t("summary.costDetails.originalCost")}
                        </span>
                        <span className="font-mono">
                          {estimation.originalCost.toLocaleString()} CC
                        </span>
                      </div>

                      {/* 2. 플랜 할인 (항상 표시되도록 조건 제거) */}
                      <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                        <span className="flex items-center gap-1.5">
                          <Percent className="h-4 w-4" /> {/* 아이콘 변경 */}
                          {t("summary.costDetails.planDiscount", {
                            planName: "Pro", // TODO: 실제 사용자 플랜 이름으로 교체
                            discountRate: (
                              estimation.discountPct * 100
                            ).toFixed(0),
                          })}
                        </span>
                        <span className="font-mono">
                          -
                          {(
                            estimation.originalCost - estimation.finalCost
                          ).toLocaleString()}{" "}
                          CC
                        </span>
                      </div>

                      <Separator className="my-2" />

                      {/* 3. 최종 비용 */}
                      <div className="flex justify-between items-center font-bold text-base">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="h-4 w-4 text-primary" />{" "}
                          {t("summary.costDetails.finalCost")}
                        </span>
                        <span className="font-mono text-primary">
                          {estimation.finalCost.toLocaleString()} CC
                        </span>
                      </div>

                      {/* 4. 내 크레딧 잔액 */}
                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-muted-foreground">
                          {t("summary.costDetails.yourBalance")}
                        </span>
                        <span
                          className={`font-mono ${
                            !estimation.isSufficient ? "text-destructive" : ""
                          }`}
                        >
                          {estimation.userBalance.toLocaleString()} CC
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs py-8">
                      {t("summary.costDetails.noEstimation")}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2"
                  disabled={
                    createBacktestMutation.isPending ||
                    !methods.formState.isValid ||
                    (estimation && !estimation.isSufficient) // 잔액 부족 시 비활성화
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

                {estimation && !estimation.isSufficient && (
                  <p className="text-center text-xs text-destructive w-full">
                    {t("summary.insufficientCredits")}
                  </p>
                )}
              </CardFooter>
            </Card>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
