// file: src/app/[locale]/strategies/new/page.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { CandlestickData, UTCTimestamp } from "lightweight-charts";

// --- 커스텀 훅 및 타입 임포트 ---
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
} from "@/types/strategy";
import { OHLCVData } from "@/types/market";
import { parseRulesForIndicators } from "@/lib/strategyUtils";
import apiClient from "@/lib/apiClient";

// --- UI 및 도메인 컴포넌트 임포트 ---
import { AuthGuard } from "@/components/auth/AuthGuard";
import DynamicStrategyChart from "@/components/domain/strategy/DynamicStrategyChart";
import { IndicatorHub } from "@/components/domain/strategy/IndicatorHub";
import { StrategyBuilderCanvas } from "@/components/domain/strategy/StrategyBuilderCanvas";
import { TpslForm } from "@/components/domain/strategy/TpslForm";
import { TargetCoinForm } from "@/components/domain/strategy/TargetCoinForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Separator } from "@/components/ui/Separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Spinner } from "@/components/ui/Spinner";

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
});

type StrategyFormValues = z.infer<typeof formSchema>;

// --- API 페이로드 타입 정의 ---
interface StrategyCreatePayload {
  name: string;
  description: string | null | undefined;
  longEntryRules: PositionRules | null;
  longExitRules: PositionRules | null;
  shortEntryRules: PositionRules | null;
  shortExitRules: PositionRules | null;
  tpslLogic: TpslLogic | null;
  targetCoins: TargetCoin[];
  isPublic: boolean;
}

// --- 헬퍼 함수 ---
const createLogicBlock = (
  indicator: IndicatorMetadata,
  logicType: string,
  allowedTimeframes: string[]
): LogicBlock => {
  const availableTimeframes = indicator.supportedTimeframes.filter((tf) =>
    allowedTimeframes.includes(tf)
  );
  const baseIndicatorValue: IndicatorValue = {
    indicatorKey: indicator.key,
    outputs: [indicator.outputs[0].key],
    values: indicator.parameters.reduce(
      (acc, param) => ({ ...acc, [param.key]: param.default }),
      {}
    ),
    timeframe: availableTimeframes.length > 0 ? availableTimeframes[0] : "1h",
  };
  const newBlockId = nanoid();

  switch (logicType) {
    case "comparison":
      return {
        id: newBlockId,
        type: "comparison",
        operandA: baseIndicatorValue,
        operator: ">",
        operandB: 0,
      };
    case "crossover":
      return {
        id: newBlockId,
        type: "crossover",
        mainLine: baseIndicatorValue,
        signalLine: 0,
        crossDirection: "above",
      };
    default:
      return {
        id: newBlockId,
        type: "comparison",
        operandA: baseIndicatorValue,
        operator: ">",
        operandB: 0,
      };
  }
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
  const { data } = await apiClient.post("/market/calculate-indicators", {
    ticker,
    timeframe,
    indicators: indicatorConfigs,
  });
  return data.results;
};

// --- 메인 페이지 컴포넌트 ---
export default function NewStrategyPage() {
  const t = useTranslations("StrategyBuilder");
  const router = useRouter();
  const queryClient = useQueryClient();

  const strategyState = useStrategyState();
  const { allowedTimeframes } = useUserSubscription();
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [currentTarget, setCurrentTarget] = useState<TargetSlot>(null);
  const [hubSelectionMode, setHubSelectionMode] = useState<
    "full" | "indicatorOnly"
  >("full");
  const [chartTicker, setChartTicker] = useState("BTC/USDT");
  const [chartTimeframe, setChartTimeframe] = useState("1h");

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

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", description: "" },
  });

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
    () => parseRulesForIndicators(strategyState),
    [strategyState]
  );
  const { data: indicatorData, isLoading: isLoadingIndicators } = useQuery({
    queryKey: ["indicators", chartTicker, chartTimeframe, indicatorConfigs],
    queryFn: () =>
      fetchIndicatorData(chartTicker, chartTimeframe, indicatorConfigs),
    enabled: !!ohlcvData && indicatorConfigs.length > 0,
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
    if (currentTarget.type === "operand") {
      const newIndicatorValue: IndicatorValue = {
        /* ... */
      };
      strategyState.updateRuleLogic(
        currentTarget.ruleType,
        currentTarget.blockId,
        currentTarget.operandKey,
        newIndicatorValue
      );
    } else {
      const newBlock = createLogicBlock(
        indicator,
        logicType,
        allowedTimeframes
      );
      if (currentTarget.type === "top-level") {
        strategyState.addRule(currentTarget.ruleType, newBlock, null);
      } else if (currentTarget.type === "nested-add") {
        strategyState.addRule(
          currentTarget.ruleType,
          newBlock,
          currentTarget.parentId,
          currentTarget.as
        );
      }
    }
    setIsHubOpen(false);
    setCurrentTarget(null);
  };

  const createStrategyMutation = useMutation({
    mutationFn: async (values: StrategyFormValues) => {
      const payload: StrategyCreatePayload = {
        name: values.name,
        description: values.description,
        longEntryRules: strategyState.longEntryRules,
        longExitRules: strategyState.longExitRules,
        shortEntryRules: strategyState.shortEntryRules,
        shortExitRules: strategyState.shortExitRules,
        tpslLogic: strategyState.tpslLogic,
        targetCoins: strategyState.targetCoins,
        isPublic: false,
      };
      const { data } = await apiClient.post("/strategies", payload);
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(t("form.saveSuccess", { strategyName: data.name }));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
      router.push("/strategies");
    },
    onError: (error: any) => {
      toast.error(
        t("form.saveError", {
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
    createStrategyMutation.mutate(values);
  };

  return (
    <AuthGuard>
      <IndicatorHub
        isOpen={isHubOpen}
        onOpenChange={setIsHubOpen}
        onSelect={handleIndicatorSelect}
        selectionMode={hubSelectionMode}
      />
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={createStrategyMutation.isPending}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("form.goBackButton")}
              </Button>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground text-center">
                {t("title")}
              </h1>
              <Button
                type="submit"
                disabled={createStrategyMutation.isPending}
                className="min-w-[120px]"
              >
                {createStrategyMutation.isPending ? (
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
                      control={form.control}
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
                      control={form.control}
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
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-col gap-8 lg:col-span-2">
                <TargetCoinForm
                  targetCoins={strategyState.targetCoins}
                  setTargetCoins={strategyState.setTargetCoins}
                />
                <TpslForm form={form} />
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
                        variant={chartTimeframe === tf ? "default" : "ghost"}
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
                    ohlcvData={ohlcvData}
                    indicatorData={indicatorData}
                  />
                )}
                {isLoadingIndicators && !isLoadingOHLCV && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 rounded-lg">
                    <Spinner />
                  </div>
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
                onUpdateRule={strategyState.updateRule}
                onDeleteRule={strategyState.deleteRule}
              />
            </div>
          </form>
        </Form>
      </div>
    </AuthGuard>
  );
}
