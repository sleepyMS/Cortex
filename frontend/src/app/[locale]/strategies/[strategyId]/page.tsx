// file: frontend/src/app/[locale]]/strategies/[strategyId]/page.tsx

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { CandlestickData, UTCTimestamp } from "lightweight-charts";

// --- 커스텀 훅, 타입, 유틸리티 임포트 ---
import { useStrategyState } from "@/hooks/useStrategyState";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { IndicatorMetadata } from "@/lib/indicators";
import {
  StrategyType,
  LogicBlock,
  TpslLogic,
  TargetCoin,
  PositionRules,
  TargetSlot,
  IndicatorValue,
  LogicOperator,
  Strategy,
} from "@/types/strategy";
import { OHLCVData, SignalData } from "@/types/market";
import { parseRulesForIndicators, createLogicBlock } from "@/lib/strategyUtils";
import apiClient from "@/lib/apiClient";

// --- UI 및 도메인 컴포넌트 임포트 ---
import { AuthGuard } from "@/components/auth/AuthGuard";
import DynamicStrategyChart from "@/components/domain/strategy/DynamicStrategyChart";
import { IndicatorHub } from "@/components/domain/strategy/IndicatorHub";
import { StrategyBuilderCanvas } from "@/components/domain/strategy/StrategyBuilderCanvas";
import { TpslForm, TpslMode } from "@/components/domain/strategy/TpslForm";
import { TargetCoinForm } from "@/components/domain/strategy/TargetCoinForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Separator } from "@/components/ui/Separator";
import { Switch } from "@/components/ui/Switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/Form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";

// --- Zod 폼 스키마 정의 ---
const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: "전략 이름은 최소 3글자 이상이어야 합니다." })
    .max(100, { message: "전략 이름은 100자 이내여야 합니다." }),
  description: z
    .string()
    .max(500, { message: "설명은 500자 이내여야 합니다." })
    .optional()
    .nullable(),
  isPublic: z.boolean().default(false),
  takeProfitPct: z.number().min(0.1).optional().nullable(),
  stopLossPct: z.number().min(0.1).optional().nullable(),
  atrStopLossMultiplier: z.number().min(0.1).optional().nullable(),
  atrTakeProfitMultiplier: z.number().min(0.1).optional().nullable(),
  atrPeriod: z.number().int().min(1).optional().nullable(),
});

type StrategyFormValues = z.infer<typeof formSchema>;

// --- API 페이로드 타입 정의 ---
interface StrategyPayload {
  name: string;
  description: string | null | undefined;
  isPublic: boolean;
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  tpslLogic: TpslLogic | null;
  targetCoins: TargetCoin[];
}

// --- API 호출 헬퍼 함수 ---
const fetchStrategy = async (id: string): Promise<Strategy> => {
  const { data } = await apiClient.get(`/strategies/${id}`);
  return data;
};

const fetchOHLCVData = async (
  ticker: string,
  timeframe: string
): Promise<CandlestickData<UTCTimestamp>[]> => {
  const { data } = await apiClient.get<OHLCVData[]>("/market/ohlcv", {
    params: { ticker, timeframe, limit: 500 },
  });
  return data.map((d) => ({ ...d, time: d.time as UTCTimestamp }));
};

const fetchIndicatorData = async (
  ticker: string,
  timeframe: string,
  indicatorConfigs: any[]
) => {
  if (indicatorConfigs.length === 0) return null;
  const { data } = await apiClient.post("/strategies/calculate-indicators", {
    ticker,
    timeframe,
    indicators: indicatorConfigs,
  });
  return data.results;
};

const fetchSignalData = async (
  ticker: string,
  timeframe: string,
  rules: any
): Promise<SignalData> => {
  if (!rules.longEntryRules && !rules.shortEntryRules) {
    return { signals: [] };
  }
  const { data } = await apiClient.post("/strategies/calculate-signals", {
    ticker,
    timeframe,
    ...rules,
  });
  return data;
};

// --- 메인 페이지 컴포넌트 ---
export default function StrategyEditorPage({
  params,
}: {
  params: { strategyId: string };
}) {
  const t = useTranslations("StrategyBuilder");
  const router = useRouter();
  const queryClient = useQueryClient();

  const strategyId = params.strategyId === "new" ? null : params.strategyId;
  const isEditMode = !!strategyId;

  const strategyState = useStrategyState();
  const { allowedTimeframes } = useUserSubscription();
  const [tpslMode, setTpslMode] = useState<TpslMode>("percentage");
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot | null>(null);
  const [hubSelectionMode, setHubSelectionMode] = useState<
    "full" | "indicatorOnly"
  >("full");
  const [chartTicker, setChartTicker] = useState("BTC/USDT");
  const [chartTimeframe, setChartTimeframe] = useState("1h");

  const { data: existingStrategy, isLoading: isLoadingStrategy } = useQuery({
    queryKey: ["strategy", strategyId],
    queryFn: () => fetchStrategy(strategyId!),
    enabled: isEditMode,
  });

  const formMethods = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      isPublic: false,
    },
  });

  // Effect 1: '수정 모드'일 때, 서버에서 받아온 데이터로 폼과 상태를 '한 번만' 채웁니다.
  useEffect(() => {
    if (isEditMode && existingStrategy) {
      formMethods.reset({
        name: existingStrategy.name,
        description: existingStrategy.description,
        isPublic: existingStrategy.isPublic,
        takeProfitPct: existingStrategy.tpslLogic?.takeProfitPct,
        stopLossPct: existingStrategy.tpslLogic?.stopLossPct,
        atrStopLossMultiplier:
          existingStrategy.tpslLogic?.atrStopLossMultiplier,
        atrTakeProfitMultiplier:
          existingStrategy.tpslLogic?.atrTakeProfitMultiplier,
        atrPeriod: existingStrategy.tpslLogic?.atrPeriod,
      });
      strategyState.setStrategy({
        longEntryRules: existingStrategy.longEntryRules,
        longExitRules: existingStrategy.longExitRules,
        shortEntryRules: existingStrategy.shortEntryRules,
        shortExitRules: existingStrategy.shortExitRules,
        targetCoins: existingStrategy.targetCoins,
      });

      if (existingStrategy.tpslLogic?.atrPeriod) {
        setTpslMode("atr");
      }
    }
  }, [
    isEditMode,
    existingStrategy,
    formMethods.reset,
    strategyState.setStrategy,
  ]);

  // Effect 2: '생성 모드'일 때, 폼과 상태를 '한 번만' 초기화합니다.
  useEffect(() => {
    if (!isEditMode) {
      strategyState.reset();
      formMethods.reset({
        // react-hook-form의 상태도 명시적으로 초기화합니다.
        name: "",
        description: "",
        isPublic: false,
      });
    }
  }, [isEditMode, strategyState.reset, formMethods.reset]);

  useEffect(() => {
    if (
      strategyState.targetCoins.length > 0 &&
      strategyState.targetCoins[0].ticker !== chartTicker
    ) {
      setChartTicker(strategyState.targetCoins[0].ticker);
    } else if (
      strategyState.targetCoins.length === 0 &&
      chartTicker !== "BTC/USDT"
    ) {
      setChartTicker("BTC/USDT");
    }
  }, [strategyState.targetCoins, chartTicker]);

  const {
    data: ohlcvData,
    isLoading: isLoadingOHLCV,
    isError,
    error,
  } = useQuery({
    queryKey: ["ohlcv", chartTicker, chartTimeframe],
    queryFn: () => fetchOHLCVData(chartTicker, chartTimeframe),
    staleTime: 5 * 60 * 1000,
  });

  const indicatorConfigs = useMemo(
    () =>
      parseRulesForIndicators({
        longEntry: strategyState.longEntryRules,
        longExit: strategyState.longExitRules,
        shortEntry: strategyState.shortEntryRules,
        shortExit: strategyState.shortExitRules,
      }),
    [
      strategyState.longEntryRules,
      strategyState.longExitRules,
      strategyState.shortEntryRules,
      strategyState.shortExitRules,
    ]
  );

  const { data: indicatorData, isLoading: isLoadingIndicators } = useQuery({
    queryKey: ["indicators", chartTicker, chartTimeframe, indicatorConfigs],
    queryFn: () =>
      fetchIndicatorData(chartTicker, chartTimeframe, indicatorConfigs),
    enabled: !!ohlcvData && indicatorConfigs.length > 0,
  });

  // 1. 현재 규칙 상태를 useMemo로 메모이제이션합니다. (이전과 동일)
  const currentRules = useMemo(
    () => ({
      longEntryRules: strategyState.longEntryRules,
      longExitRules: strategyState.longExitRules,
      shortEntryRules: strategyState.shortEntryRules,
      shortExitRules: strategyState.shortExitRules,
    }),
    [
      strategyState.longEntryRules,
      strategyState.longExitRules,
      strategyState.shortEntryRules,
      strategyState.shortExitRules,
    ]
  );

  // 2. 디바운싱된 규칙을 저장할 새로운 state를 만듭니다.
  const [debouncedRules, setDebouncedRules] = useState(currentRules);

  // 3. useEffect를 사용해 currentRules가 변경될 때마다 타이머를 설정합니다.
  useEffect(() => {
    // 500ms 후에 debouncedRules 상태를 업데이트합니다.
    const timer = setTimeout(() => {
      setDebouncedRules(currentRules);
    }, 500);

    // 클린업 함수: currentRules가 변경되면 이전 타이머를 취소하여 마지막 변경만 반영되도록 합니다.
    return () => {
      clearTimeout(timer);
    };
  }, [currentRules]); // currentRules가 변경될 때만 이 effect를 실행합니다.

  // 4. useQuery에서는 디바운싱된 상태(debouncedRules)를 queryKey로 사용합니다.
  const { data: signalData, isLoading: isLoadingSignals } = useQuery({
    queryKey: ["signals", chartTicker, chartTimeframe, debouncedRules],
    queryFn: () => fetchSignalData(chartTicker, chartTimeframe, debouncedRules),
    enabled: !!ohlcvData && !!debouncedRules,
  });

  const handleAddTopLevelRule = (ruleType: StrategyType) => {
    setCurrentTarget({ type: "top-level", ruleType });
    setHubSelectionMode("full");
    setIsHubOpen(true);
  };

  const handleTriggerNestedAddRule = (
    ruleType: StrategyType,
    parentId: string,
    as: LogicOperator
  ) => {
    setCurrentTarget({ type: "nested-add", ruleType, parentId, as });
    setHubSelectionMode("full");
    setIsHubOpen(true);
  };

  const handleTriggerOperandHub = (
    ruleType: StrategyType,
    blockId: string,
    operandKey: string
  ) => {
    setCurrentTarget({ type: "operand", ruleType, blockId, operandKey });
    setHubSelectionMode("indicatorOnly");
    setIsHubOpen(true);
  };

  const handleIndicatorSelect = (
    indicator: IndicatorMetadata,
    logicType: string
  ) => {
    if (!currentTarget) return;
    const newBlock = createLogicBlock(indicator, logicType, allowedTimeframes);
    if (currentTarget.type === "operand") {
      const newIndicatorValue =
        (newBlock as any).operandA ||
        (newBlock as any).indicator ||
        (newBlock as any).mainLine;
      strategyState.updateRuleLogic(
        currentTarget.ruleType,
        currentTarget.blockId,
        currentTarget.operandKey,
        newIndicatorValue
      );
    } else if (currentTarget.type === "top-level") {
      strategyState.addRule(currentTarget.ruleType, newBlock, null);
    } else if (currentTarget.type === "nested-add") {
      strategyState.addRule(
        currentTarget.ruleType,
        newBlock,
        currentTarget.parentId,
        currentTarget.as
      );
    }
    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  const buildPayload = (values: StrategyFormValues): StrategyPayload => {
    let tpslLogic: TpslLogic | null = null;
    if (
      tpslMode === "percentage" &&
      (values.takeProfitPct || values.stopLossPct)
    ) {
      tpslLogic = {
        takeProfitPct: values.takeProfitPct || null,
        stopLossPct: values.stopLossPct || null,
        atrStopLossMultiplier: null,
        atrTakeProfitMultiplier: null,
        atrPeriod: null,
      };
    } else if (
      tpslMode === "atr" &&
      (values.atrPeriod ||
        values.atrStopLossMultiplier ||
        values.atrTakeProfitMultiplier)
    ) {
      tpslLogic = {
        takeProfitPct: null,
        stopLossPct: null,
        atrStopLossMultiplier: values.atrStopLossMultiplier || null,
        atrTakeProfitMultiplier: values.atrTakeProfitMultiplier || null,
        atrPeriod: values.atrPeriod || null,
      };
    }
    return {
      name: values.name,
      description: values.description,
      isPublic: values.isPublic,
      longEntryRules: strategyState.longEntryRules,
      longExitRules: strategyState.longExitRules,
      shortEntryRules: strategyState.shortEntryRules,
      shortExitRules: strategyState.shortExitRules,
      tpslLogic: tpslLogic,
      targetCoins: strategyState.targetCoins,
    };
  };

  const saveMutation = useMutation({
    mutationFn: async (values: StrategyFormValues) => {
      const payload = buildPayload(values);
      if (isEditMode) {
        const { data } = await apiClient.put(
          `/strategies/${strategyId}`,
          payload
        );
        return data;
      } else {
        const { data } = await apiClient.post("/strategies", payload);
        return data;
      }
    },
    onSuccess: (data: any) => {
      toast.success(
        t(isEditMode ? "form.updateSuccess" : "form.saveSuccess", {
          strategyName: data.name,
        })
      );
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy", strategyId] });
      router.push("/strategies");
    },
    onError: (error: any) => {
      toast.error(
        t(isEditMode ? "form.updateError" : "form.saveError", {
          error: error?.response?.data?.detail || "Unknown error",
        })
      );
    },
  });

  const onSubmit = (values: StrategyFormValues) => {
    if (!strategyState.longEntryRules && !strategyState.shortEntryRules) {
      return toast.error(t("form.rulesRequired"));
    }
    if (strategyState.targetCoins.length === 0) {
      return toast.error(t("targetCoinForm.noTickerError"));
    }
    saveMutation.mutate(values);
  };

  if (isEditMode && isLoadingStrategy) {
    return (
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading strategy data...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
        selectionMode={hubSelectionMode}
      />
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <FormProvider {...formMethods}>
          <form
            onSubmit={formMethods.handleSubmit(onSubmit)}
            className="space-y-8"
          >
            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={saveMutation.isPending}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("form.goBackButton")}
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center">
                {isEditMode ? t("editTitle") : t("title")}
              </h1>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="min-w-[120px]"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("form.saveButton")}
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
              <div className="flex flex-col gap-8 lg:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("form.basicInfoTitle")}</CardTitle>
                    <CardDescription>
                      {t("form.basicInfoDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={formMethods.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.nameLabel")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("form.namePlaceholder")}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={formMethods.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("form.descriptionLabel")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("form.descriptionPlaceholder")}
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={formMethods.control}
                      name="isPublic"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>{t("form.isPublicLabel")}</FormLabel>
                            <FormDescription>
                              {t("form.isPublicDescription")}
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
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-col gap-8 lg:col-span-2">
                <TargetCoinForm
                  targetCoins={strategyState.targetCoins}
                  setTargetCoins={strategyState.setTargetCoins}
                />
                <TpslForm form={formMethods} onModeChange={setTpslMode} />
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-2xl font-bold text-foreground">
                  {t("chartTitle")}
                </h2>
                <div className="flex items-center gap-2">
                  <Select
                    value={chartTicker}
                    onValueChange={setChartTicker}
                    disabled={strategyState.targetCoins.length === 0}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select a coin" />
                    </SelectTrigger>
                    <SelectContent>
                      {strategyState.targetCoins.map((coin) => (
                        <SelectItem key={coin.ticker} value={coin.ticker}>
                          {coin.ticker}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center p-1 rounded-md bg-muted">
                    {["15m", "1h", "4h", "1d"].map((tf) => (
                      <Button
                        key={tf}
                        type="button"
                        variant={chartTimeframe === tf ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setChartTimeframe(tf)}
                        className="h-8 px-3"
                      >
                        {tf}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative">
                {isLoadingOHLCV ? (
                  <Skeleton className="w-full h-[400px] rounded-lg" />
                ) : isError ? (
                  <div className="w-full h-[400px] rounded-lg border bg-destructive/10 flex items-center justify-center text-destructive font-semibold">
                    Chart data could not be loaded. ({(error as Error).message})
                  </div>
                ) : (
                  <DynamicStrategyChart
                    rules={{
                      longEntry: strategyState.longEntryRules,
                      longExit: strategyState.longExitRules,
                      shortEntry: strategyState.shortEntryRules,
                      shortExit: strategyState.shortExitRules,
                    }}
                    ohlcvData={ohlcvData}
                    indicatorData={indicatorData}
                    isLoadingIndicators={isLoadingIndicators}
                    signalData={signalData}
                    isLoadingSignals={isLoadingSignals}
                  />
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                {t("rulesTitle")}
              </h2>
              <StrategyBuilderCanvas
                longEntryRules={strategyState.longEntryRules}
                longExitRules={strategyState.longExitRules}
                shortEntryRules={strategyState.shortEntryRules}
                shortExitRules={strategyState.shortExitRules}
                onAddTopLevelRule={handleAddTopLevelRule}
                onTriggerNestedAddRule={handleTriggerNestedAddRule}
                onTriggerOperandHub={handleTriggerOperandHub}
                onUpdateRule={(ruleType, id, newBlock) =>
                  strategyState.updateRule(ruleType, id, newBlock)
                }
                onDeleteRule={(ruleType, id) =>
                  strategyState.deleteRule(ruleType, id)
                }
              />
            </div>
          </form>
        </FormProvider>
      </div>
    </AuthGuard>
  );
}
