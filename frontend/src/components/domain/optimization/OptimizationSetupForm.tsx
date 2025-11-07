// file: frontend/src/components/domain/optimization/OptimizationSetupForm.tsx

"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  useForm,
  FormProvider,
  useFieldArray,
  Controller,
} from "react-hook-form";
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
  Zap,
  BarChartHorizontal,
  X,
  Receipt,
  Tag,
  Percent,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import debounce from "lodash.debounce";

import apiClient from "@/lib/apiClient";
import { Strategy, LogicBlock } from "@/types/strategy";
import { IndicatorMetadata } from "@/types/indicator";
import { cn } from "@/lib/utils";
import { useIndicatorStore } from "@/store/indicatorStore";
import { useUserStore } from "@/store/userStore";

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
import { Separator } from "@/components/ui/Separator";
import { DateRangePickerCustom } from "@/components/ui/DateRangePickerCustom";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { OptimizationParameterTreeView } from "./OptimizationParameterTreeView";

// --- Zod 폼 유효성 검사 스키마 ---

const constraintSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["mdd", "min_trades", "win_rate", "profit_factor"]),
  operator: z.enum([">=", "<="]),
  value: z.coerce.number(),
});

// 파라미터 범위 스키마 (선택 여부 포함)
const parameterRangeSchema = z.object({
  path: z.string(),
  isSelected: z.boolean().default(false), // 최적화 대상 여부
  min: z.coerce.number(),
  max: z.coerce.number(),
  step: z.coerce.number().min(0.000001, "스텝은 0보다 커야 합니다."),
});

const formSchema = z
  .object({
    // 1. 공통 설정
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

    // 2. 탭 선택
    currentTab: z.enum(["general", "wfo"]).default("general"),

    // 3. 최적화 목표
    objective: z.string().min(1, "최적화 목표를 선택해주세요."),
    constraints: z
      .array(constraintSchema)
      .max(3, "제약 조건은 최대 3개까지 설정할 수 있습니다."),

    // 4. 일반 최적화 설정
    general_trials: z.coerce
      .number()
      .min(10, "최소 10회 이상 시도해야 합니다."),

    // 5. WFO 설정
    wfo_folds: z.coerce.number().min(2, "최소 2개 이상의 구간이 필요합니다."),
    wfo_trialsPerFold: z.coerce
      .number()
      .min(10, "구간당 최소 10회 이상 시도해야 합니다."),

    // 6. 파라미터 범위
    parameterRanges: z.array(parameterRangeSchema),
  })
  .refine(
    (data) => {
      // WFO 탭일 때 훈련 기간이 너무 짧아지는 경우 방지
      if (
        data.currentTab === "wfo" &&
        data.dateRange.from &&
        data.dateRange.to
      ) {
        const totalDays =
          (data.dateRange.to.getTime() - data.dateRange.from.getTime()) /
          (1000 * 3600 * 24);
        // 확장창 기준: 첫 훈련 기간은 총 기간 / 구간 수
        const firstISDays = totalDays / data.wfo_folds;
        return firstISDays >= 7; // 최소 1주일은 되도록 강제
      }
      return true;
    },
    {
      message:
        "총 기간에 비해 구간(Folds) 수가 너무 많아 훈련 기간이 너무 짧습니다.",
      path: ["wfo_folds"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

// 비용 예측 API 응답 타입
interface CostEstimationResponse {
  originalCost: number;
  discountPct: number;
  finalCost: number;
  userBalance: number;
  isSufficient: boolean;
}

// --- 메인 컴포넌트 ---
export function OptimizationSetupForm() {
  const t = useTranslations("OptimizationSetupForm");
  const router = useRouter();
  const queryClient = useQueryClient();
  const syncCreditBalance = useUserStore((state) => state.syncCreditBalance);

  // 지표 메타데이터 로드
  const { metadata: indicatorMetadataArray, isLoaded } = useIndicatorStore();
  const indicatorDefinitions = useMemo(() => {
    if (!isLoaded) return {};
    return indicatorMetadataArray.reduce((acc, meta) => {
      acc[meta.key] = meta;
      return acc;
    }, {} as Record<string, IndicatorMetadata>);
  }, [indicatorMetadataArray, isLoaded]);

  // Form 설정
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
      currentTab: "general",
      objective: "cortexScore", // 기본값
      constraints: [],
      general_trials: 100,
      wfo_folds: 5,
      wfo_trialsPerFold: 50,
      parameterRanges: [],
    },
  });

  const { control, watch, setValue, formState } = methods;

  // 제약 조건 필드 배열
  const {
    fields: constraintFields,
    append: appendConstraint,
    remove: removeConstraint,
  } = useFieldArray({ control, name: "constraints" });

  // 파라미터 범위 필드 배열
  const { fields: rangeFields, replace: replaceRanges } = useFieldArray({
    control,
    name: "parameterRanges",
  });

  // UI 변경 및 동적 계산을 위한 값 구독
  const watchedValues = watch();
  const {
    strategyId,
    dateRange,
    currentTab,
    wfo_folds,
    general_trials,
    wfo_trialsPerFold,
    parameterRanges,
  } = watchedValues;

  // --- 동적 1회 훈련 기간 계산 (핵심 로직) ---
  const trainingPeriodInfo = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return { months: 0, text: "N/A" };

    const totalDays =
      (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 3600 * 24);

    if (totalDays <= 0) return { months: 0, text: "N/A" };

    if (currentTab === "general") {
      return {
        months: totalDays / 30.44,
        text: t("trainingPeriod.general", { days: totalDays.toFixed(0) }),
      };
    } else {
      if (!wfo_folds || wfo_folds < 1) return { months: 0, text: "N/A" };
      // 확장창 기준: 첫 훈련(IS)은 총 기간의 1/N
      const firstISDays = totalDays / wfo_folds;
      return {
        months: firstISDays / 30.44,
        text: t("trainingPeriod.wfo", { days: firstISDays.toFixed(1) }),
      };
    }
  }, [dateRange, currentTab, wfo_folds, t]);

  const isShortTrainPeriod = trainingPeriodInfo.months < 12;

  // 훈련 기간이 짧아지면 연율화 목표가 선택되어 있을 경우 기본값으로 강제 변경
  useEffect(() => {
    const currentObjective = methods.getValues("objective");
    const annualizedObjectives = ["cortexScore", "CAGR", "sortino", "calmar"];
    if (isShortTrainPeriod && annualizedObjectives.includes(currentObjective)) {
      setValue("objective", "totalReturnPct");
      toast.info(t("objectives.autoChangedToTotalReturn"));
    }
  }, [isShortTrainPeriod, setValue, methods, t]);

  // --- 총 시도 횟수 및 선택된 파라미터 수 계산 ---
  const totalEstimatedTrials = useMemo(() => {
    if (currentTab === "general") {
      return general_trials || 0;
    } else {
      return (wfo_folds || 0) * (wfo_trialsPerFold || 0);
    }
  }, [currentTab, general_trials, wfo_folds, wfo_trialsPerFold]);

  const selectedParamsCount = useMemo(() => {
    return parameterRanges?.filter((r) => r.isSelected)?.length || 0;
  }, [parameterRanges]);

  // --- 데이터 쿼리 ---
  const { data: strategies, isLoading: isLoadingStrategies } = useQuery<
    Strategy[]
  >({
    queryKey: ["userStrategiesForSetup"],
    queryFn: async () => (await apiClient.get("/strategies?limit=1000")).data,
  });

  const { data: selectedStrategy, isLoading: isLoadingStrategyDetails } =
    useQuery<Strategy>({
      queryKey: ["strategyDetail", strategyId],
      queryFn: async () =>
        (await apiClient.get(`/strategies/${strategyId}`)).data,
      enabled: !!strategyId,
    });

  // --- 파라미터 범위 필드 초기화 ---
  // 전략이 변경되면 모든 숫자형 파라미터를 추출하여 초기화합니다.
  const replaceRangesRef = useRef(replaceRanges);
  useEffect(() => {
    replaceRangesRef.current = replaceRanges;
  }, [replaceRanges]);

  useEffect(() => {
    const currentReplace = replaceRangesRef.current;
    if (!selectedStrategy) {
      currentReplace([]);
      return;
    }

    const extractParamsRecursive = (
      blocks: LogicBlock[],
      pathPrefix: string
    ): z.infer<typeof parameterRangeSchema>[] => {
      let params: z.infer<typeof parameterRangeSchema>[] = [];
      blocks.forEach((block, index) => {
        const currentPath = `${pathPrefix}.${index}`;
        for (const key in block) {
          if (key === "children" || key === "id" || key === "type") continue;
          const value = (block as any)[key];

          // 파라미터 추가 헬퍼 함수
          const addParam = (val: number, path: string) => {
            // 초기값: 선택 안됨(false), Min/Max는 현재값, Step은 10% 또는 0.0001
            params.push({
              path: path,
              isSelected: false,
              min: val,
              max: val,
              step: Math.max(
                0.0001,
                Number((Math.abs(val) * 0.1).toPrecision(2))
              ),
            });
          };

          if (
            value &&
            typeof value === "object" &&
            "indicatorKey" in value &&
            "values" in value
          ) {
            for (const [paramKey, paramValue] of Object.entries(value.values)) {
              if (typeof paramValue === "number") {
                addParam(
                  paramValue,
                  `${currentPath}.${key}.values.${paramKey}`
                );
              }
            }
          } else if (typeof value === "number") {
            addParam(value, `${currentPath}.${key}`);
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

    let allParams: z.infer<typeof parameterRangeSchema>[] = [];
    const ruleKeys: (keyof Strategy)[] = [
      "longEntryRules",
      "longExitRules",
      "shortEntryRules",
      "shortExitRules",
    ];
    ruleKeys.forEach((key) => {
      const rules = selectedStrategy[key] as any;
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
          allParams.push({
            path: `tpslLogic.${key}`,
            isSelected: false,
            min: value,
            max: value,
            step: Math.max(
              0.0001,
              Number((Math.abs(value) * 0.1).toPrecision(2))
            ),
          });
        }
      }
    }
    currentReplace(allParams);
  }, [selectedStrategy]);

  // --- 비용 예측 로직 ---
  const [estimation, setEstimation] = useState<CostEstimationResponse | null>(
    null
  );
  const { mutate: estimateCost, isPending: isEstimatingCost } = useMutation({
    mutationFn: async (variables: { trials: number }) => {
      // 필요한 최소 정보만 전송하여 비용 계산
      const payload = {
        strategyId: watchedValues.strategyId,
        startDate: watchedValues.dateRange.from.toISOString(),
        endDate: watchedValues.dateRange.to.toISOString(),
        trials: variables.trials,
      };
      const { data } = await apiClient.post(
        "/optimizations/estimate-cost",
        payload
      );
      return data as CostEstimationResponse;
    },
    onSuccess: (data) => setEstimation(data),
    onError: () => setEstimation(null),
  });

  const debouncedEstimateCost = useCallback(
    debounce((trials: number) => {
      if (
        !watchedValues.strategyId ||
        !watchedValues.dateRange?.from ||
        !watchedValues.dateRange?.to ||
        trials <= 0
      ) {
        setEstimation(null);
        return;
      }
      estimateCost({ trials });
    }, 500),
    [estimateCost, watchedValues.strategyId, watchedValues.dateRange]
  );

  useEffect(() => {
    debouncedEstimateCost(totalEstimatedTrials);
  }, [totalEstimatedTrials, debouncedEstimateCost]);

  // --- 제출 로직 ---
  const createOptimizationMutation = useMutation({
    mutationFn: (data: FormValues) => {
      // 실제 최적화할 파라미터만 필터링
      const selectedRanges = data.parameterRanges.filter((r) => r.isSelected);

      if (selectedRanges.length === 0) {
        throw new Error(t("errors.noParametersSelected"));
      }

      const payload = {
        strategyId: data.strategyId,
        startDate: data.dateRange.from.toISOString(),
        endDate: data.dateRange.to.toISOString(),
        optimizationType: data.currentTab,
        settings: {
          [data.currentTab]: {
            trials: data.general_trials,
            folds: data.wfo_folds,
            trialsPerFold: data.wfo_trialsPerFold,
          },
        },
        objective: data.objective,
        constraints: data.constraints.map((c) => ({
          type: c.type,
          operator: c.operator,
          value: c.value,
        })),
        // 선택된 범위만 전송
        parameterRanges: selectedRanges.map((r) => ({
          path: r.path,
          min: r.min,
          max: r.max,
          step: r.step,
        })),
        commonParameters: {
          initialCapital: data.initialCapital,
          leverage: data.leverage,
          fee: data.feePct,
          slippage: data.slippagePct,
        },
      };

      return apiClient.post("/optimizations", payload);
    },
    onSuccess: (response) => {
      toast.success(t("submitSuccess"));
      syncCreditBalance();
      queryClient.invalidateQueries({ queryKey: ["optimizations"] });
      router.push(`/optimization/${response.data.id}`);
    },
    onError: (error: any) => {
      // 커스텀 에러 메시지 처리 (예: 파라미터 미선택)
      const message =
        error.message === t("errors.noParametersSelected")
          ? error.message
          : error?.response?.data?.detail || error.message;
      toast.error(t("submitError", { error: message }));
    },
  });

  const onSubmit = (values: FormValues) =>
    createOptimizationMutation.mutate(values);

  if (!isLoaded || isLoadingStrategies) {
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

  const constraintOptions = [
    { value: "mdd", label: t("constraints.mdd") },
    { value: "min_trades", label: t("constraints.min_trades") },
    { value: "win_rate", label: t("constraints.win_rate") },
    { value: "profit_factor", label: t("constraints.profit_factor") },
  ];

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* --- 왼쪽 폼 영역 --- */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. 공통 설정 카드 */}
            <Card>
              <CardHeader>
                <CardTitle>{t("commonSettings.title")}</CardTitle>
                <CardDescription>
                  {t("commonSettings.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={control}
                  name="strategyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("commonSettings.strategyLabel")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingStrategies}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t(
                                "commonSettings.strategyPlaceholder"
                              )}
                            />
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
                                {t("commonSettings.noStrategiesFound")}
                              </p>
                              <Button asChild size="sm">
                                <Link href="/strategies/new">
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  {t("commonSettings.goToCreateStrategy")}
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
                      <FormLabel>
                        {t("commonSettings.dateRangeLabel")}
                      </FormLabel>
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
                          {t("commonSettings.initialCapitalLabel")}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10000" {...field} />
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
                        <FormLabel>
                          {t("commonSettings.leverageLabel")}
                        </FormLabel>
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
                        <FormLabel>{t("commonSettings.feePctLabel")}</FormLabel>
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
                          {t("commonSettings.slippagePctLabel")}
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
              </CardContent>
            </Card>

            {/* 2. 최적화 타입 탭 */}
            <Tabs
              value={currentTab}
              onValueChange={(value) =>
                setValue("currentTab", value as "general" | "wfo")
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">
                  <Zap className="h-4 w-4 mr-2" />
                  {t("tabs.general")}
                </TabsTrigger>
                <TabsTrigger value="wfo">
                  <BarChartHorizontal className="h-4 w-4 mr-2" />
                  {t("tabs.wfo")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="general" className="pt-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("general.title")}</CardTitle>
                    <CardDescription>
                      {t("general.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={control}
                      name="general_trials"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("general.trialsLabel")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="10"
                              placeholder="100"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t("general.trialsDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Alert>
                      <AlertTitle>{t("trainingPeriod.title")}</AlertTitle>
                      <AlertDescription>
                        {trainingPeriodInfo.text}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="wfo" className="pt-6 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("wfo.title")}</CardTitle>
                    <CardDescription>{t("wfo.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={control}
                        name="wfo_folds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("wfo.foldsLabel")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="1"
                                placeholder="5"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {t("wfo.foldsDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name="wfo_trialsPerFold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("wfo.trialsPerFoldLabel")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="10"
                                placeholder="50"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              {t("wfo.trialsPerFoldDescription")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Alert
                      variant={isShortTrainPeriod ? "destructive" : "default"}
                    >
                      {isShortTrainPeriod && (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                      <AlertTitle>{t("trainingPeriod.title")}</AlertTitle>
                      <AlertDescription>
                        {trainingPeriodInfo.text}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* 3. 목표 및 제약 조건 */}
            <Card>
              <CardHeader>
                <CardTitle>{t("objectives.title")}</CardTitle>
                <CardDescription>{t("objectives.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("objectives.primaryLabel")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* 연율화 지표는 훈련 기간이 짧으면 비활성화 */}
                          <SelectItem
                            value="cortexScore"
                            disabled={isShortTrainPeriod}
                          >
                            {t("objectives.cortexScore")}
                          </SelectItem>
                          <SelectItem
                            value="CAGR"
                            disabled={isShortTrainPeriod}
                          >
                            {t("objectives.CAGR")}
                          </SelectItem>
                          <SelectItem
                            value="sortino"
                            disabled={isShortTrainPeriod}
                          >
                            {t("objectives.sortino")}
                          </SelectItem>
                          <SelectItem
                            value="calmar"
                            disabled={isShortTrainPeriod}
                          >
                            {t("objectives.calmar")}
                          </SelectItem>
                          <SelectItem value="totalReturnPct">
                            {t("objectives.totalReturnPct")}
                          </SelectItem>
                          <SelectItem value="profit_factor">
                            {t("objectives.profit_factor")}
                          </SelectItem>
                          <SelectItem value="win_rate">
                            {t("objectives.win_rate")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {isShortTrainPeriod && (
                        <FormDescription className="text-destructive text-xs">
                          {t("objectives.shortPeriodWarning")}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Separator />
                <div>
                  <FormLabel className="block mb-1.5">
                    {t("objectives.constraintsLabel")}
                  </FormLabel>
                  <FormDescription className="mb-4">
                    {t("objectives.constraintsDescription")}
                  </FormDescription>
                  <div className="space-y-3">
                    {constraintFields.map((field, index) => (
                      <div
                        key={field.id}
                        className="flex items-start gap-2 p-3 bg-muted/30 rounded-md border"
                      >
                        <Controller
                          control={control}
                          name={`constraints.${index}.type`}
                          render={({ field: typeField }) => (
                            <Select
                              onValueChange={typeField.onChange}
                              value={typeField.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-[120px] h-9">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {constraintOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <Controller
                          control={control}
                          name={`constraints.${index}.operator`}
                          render={({ field: opField }) => (
                            <Select
                              onValueChange={opField.onChange}
                              value={opField.value}
                            >
                              <FormControl>
                                <SelectTrigger className="w-[60px] h-9 font-mono">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value=">=">&ge;</SelectItem>
                                <SelectItem value="<=">&le;</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <Controller
                          control={control}
                          name={`constraints.${index}.value`}
                          render={({ field: valField }) => (
                            <Input
                              type="number"
                              step="any"
                              className="flex-1 h-9"
                              placeholder="Value"
                              {...valField}
                            />
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeConstraint(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {constraintFields.length < 3 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        onClick={() =>
                          appendConstraint({
                            type: "mdd",
                            operator: "<=",
                            value: 20,
                          })
                        }
                      >
                        <PlusCircle className="mr-2 h-3.5 w-3.5" />
                        {t("objectives.addConstraint")}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. 파라미터 범위 설정 트리 뷰 */}
            {!isLoadingStrategyDetails && selectedStrategy && (
              <OptimizationParameterTreeView
                strategy={selectedStrategy}
                indicatorDefinitions={indicatorDefinitions}
                control={control}
                fields={rangeFields}
                setValue={setValue}
              />
            )}
          </div>

          {/* --- 오른쪽 요약 및 제출 카드 (Sticky) --- */}
          <div className="lg:col-span-1 sticky top-24">
            <Card className="border-l-4 border-l-primary shadow-md">
              <CardHeader className="pb-3">
                <CardTitle>{t("summary.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 min-h-[180px]">
                {isLoadingStrategyDetails && strategyId ? (
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : !selectedStrategy ? (
                  <div className="text-center text-muted-foreground pt-12 pb-8 bg-muted/20 rounded-lg border border-dashed">
                    <p>{t("summary.selectStrategyPrompt")}</p>
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="p-3 bg-muted/30 rounded-md border">
                      <h3 className="font-semibold text-base text-primary break-all">
                        {selectedStrategy.name}
                      </h3>
                      <p className="text-muted-foreground line-clamp-2 text-xs mt-1">
                        {selectedStrategy.description ||
                          t("summary.noDescription")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-4 bg-muted/50 p-5 border-t">
                <h4 className="font-semibold text-sm">
                  {t("summary.preflightCheck.title")}
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center justify-between">
                    <span>{t("summary.preflightCheck.strategy")}</span>
                    <CheckCircle
                      className={cn(
                        "h-4 w-4 transition-colors",
                        formState.dirtyFields.strategyId &&
                          !formState.errors.strategyId
                          ? "text-emerald-500"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </li>
                  <li className="flex items-center justify-between">
                    <span>{t("summary.preflightCheck.objective")}</span>
                    <CheckCircle
                      className={cn(
                        "h-4 w-4 transition-colors",
                        !formState.errors.objective && watchedValues.objective
                          ? "text-emerald-500"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </li>
                  <li className="flex items-center justify-between">
                    <span>
                      {t("summary.preflightCheck.trials", {
                        count: totalEstimatedTrials,
                      })}
                    </span>
                    <CheckCircle
                      className={cn(
                        "h-4 w-4 transition-colors",
                        totalEstimatedTrials > 0
                          ? "text-emerald-500"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </li>
                  <li className="flex items-center justify-between">
                    <span>
                      {t("summary.preflightCheck.paramsSelected", {
                        count: selectedParamsCount,
                      })}
                    </span>
                    <CheckCircle
                      className={cn(
                        "h-4 w-4 transition-colors",
                        selectedParamsCount > 0
                          ? "text-emerald-500"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </li>
                </ul>

                {/* 비용 예측 결과 표시 */}
                <div className="w-full pt-3 mt-2 border-t">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    {t("summary.costDetails.title")}
                  </h4>
                  {isEstimatingCost ? (
                    <div className="flex justify-center items-center h-20">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : estimation ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Tag className="h-3.5 w-3.5" />
                          {t("summary.costDetails.originalCost")}
                        </span>
                        <span className="font-mono">
                          {estimation.originalCost.toLocaleString()} CC
                        </span>
                      </div>
                      {estimation.originalCost !== estimation.finalCost && (
                        <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
                          <span className="flex items-center gap-1.5">
                            <Percent className="h-3.5 w-3.5" />
                            {t("summary.costDetails.planDiscount", {
                              planName: "Pro", // TODO: 실제 사용자 플랜
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
                      )}
                      <Separator className="my-2 opacity-50" />
                      <div className="flex justify-between items-center font-bold">
                        <span>{t("summary.costDetails.finalCost")}</span>
                        <span className="font-mono text-lg text-primary">
                          {estimation.finalCost.toLocaleString()} CC
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-1">
                        <span className="text-muted-foreground">
                          {t("summary.costDetails.yourBalance")}
                        </span>
                        <span
                          className={cn(
                            "font-mono font-medium",
                            !estimation.isSufficient && "text-destructive"
                          )}
                        >
                          {estimation.userBalance.toLocaleString()} CC
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs py-6 bg-muted/20 rounded border border-dashed">
                      {t("summary.costDetails.noEstimation")}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2 font-semibold"
                  disabled={
                    createOptimizationMutation.isPending ||
                    !formState.isValid ||
                    selectedParamsCount === 0 ||
                    !!(estimation && !estimation.isSufficient)
                  }
                >
                  {createOptimizationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("submitButtonLoading")}
                    </>
                  ) : (
                    t("submitButton")
                  )}
                </Button>

                {estimation && !estimation.isSufficient && (
                  <p className="text-center text-xs font-medium text-destructive w-full bg-destructive/10 py-1.5 rounded">
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
