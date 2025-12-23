// file: frontend/src/app/[locale]/(authenticated)/ai-lab/new/page.tsx

"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { createAIModel, estimateAIModelCost } from "@/lib/api/ai";
import { Button } from "@/components/ui/Button";
import { GlassPane } from "@/components/ui/GlassPane";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Slider } from "@/components/ui/Slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Checkbox } from "@/components/ui/Checkbox";
import { Textarea } from "@/components/ui/Textarea";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Settings,
  Settings2,
  Database,
  Target,
  Sparkles,
  Check,
  Loader2,
  Tag,
  Percent,
  Ticket,
  ListFilter,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/Collapsible";

import type {
  AIModelCreateRequest,
  AIArchitectureConfig,
  AIFeatureConfig,
  AILabelingConfig,
  AITrainingConfig,
  CostEstimationResponse,
} from "@/types/ai";
import {
  DEFAULT_ARCHITECTURE_CONFIG,
  DEFAULT_FEATURE_CONFIG,
  DEFAULT_LABELING_CONFIG,
  DEFAULT_TRAINING_CONFIG,
  DEFAULT_OPTIMIZATION_CONFIG,
} from "@/types/ai";
import { useIndicatorStore } from "@/store/indicatorStore";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";

const STEPS = [
  { id: 1, title: "기본 정보", icon: Brain },
  { id: 2, title: "학습 데이터", icon: Database },
  { id: 3, title: "입력 피처", icon: ListFilter },
  { id: 4, title: "라벨링 설정", icon: Target },
  { id: 5, title: "모델 설정", icon: Settings },
  { id: 6, title: "확인 및 시작", icon: Sparkles },
];

const TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"];
const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "MATICUSDT",
  "DOTUSDT",
  "LTCUSDT",
];

export default function NewAIModelPage() {
  const t = useTranslations("AILabPage");
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modelType, setModelType] = useState("lstm");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [featureConfig, setFeatureConfig] = useState<AIFeatureConfig>(
    DEFAULT_FEATURE_CONFIG
  );
  const [labelingConfig, setLabelingConfig] = useState<AILabelingConfig>(
    DEFAULT_LABELING_CONFIG
  );
  const [architectureConfig, setArchitectureConfig] =
    useState<AIArchitectureConfig>(DEFAULT_ARCHITECTURE_CONFIG);
  const [trainingConfig, setTrainingConfig] = useState<AITrainingConfig>(
    DEFAULT_TRAINING_CONFIG
  );
  const [optimizationConfig, setOptimizationConfig] = useState(
    DEFAULT_OPTIMIZATION_CONFIG
  );

  const [costData, setCostData] = useState<CostEstimationResponse | null>(null);
  const [isCheckingCost, setIsCheckingCost] = useState(false);
  const [indicatorSearch, setIndicatorSearch] = useState("");

  // Load indicator metadata from store
  const indicatorMetadata = useIndicatorStore((state) => state.metadata);

  // Group indicators by category
  const indicatorCategories = React.useMemo(() => {
    if (!indicatorMetadata) return [];
    const categories = new Set(indicatorMetadata.map((ind) => ind.category));
    return ["All", ...Array.from(categories).sort()];
  }, [indicatorMetadata]);

  // Filter indicators by search term
  const filteredIndicators = React.useMemo(() => {
    if (!indicatorMetadata) return [];
    if (!indicatorSearch) return indicatorMetadata;
    return indicatorMetadata.filter(
      (ind) =>
        ind.label.toLowerCase().includes(indicatorSearch.toLowerCase()) ||
        ind.key.toLowerCase().includes(indicatorSearch.toLowerCase())
    );
  }, [indicatorMetadata, indicatorSearch]);

  // Helper to get default params for an indicator
  const getDefaultParams = (indicatorKey: string): Record<string, any> => {
    const indicator = indicatorMetadata?.find(
      (ind) => ind.key === indicatorKey
    );
    if (!indicator) return {};
    const params: Record<string, any> = {};
    if (indicator.parameters) {
      Object.entries(indicator.parameters).forEach(([key, def]) => {
        params[key] = def.default;
      });
    }
    return params;
  };

  // Check cost on step 5
  React.useEffect(() => {
    if (step === 6) {
      const fetchCost = async () => {
        setIsCheckingCost(true);
        try {
          const res = await estimateAIModelCost({
            trainingType: "new",
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString(),
            timeframe,
            epochs: trainingConfig.epochs,
            hiddenSize: architectureConfig.hiddenSize,
            numLayers: architectureConfig.numLayers,
          });
          if (optimizationConfig.isEnabled && res) {
            const multiplier = optimizationConfig.nTrials;
            setCostData({
              ...res,
              originalCost: res.originalCost * multiplier,
              finalCost: res.finalCost * multiplier,
              isSufficient: res.userBalance >= res.finalCost * multiplier,
            });
          } else {
            setCostData(res);
          }
        } catch (e) {
          console.error(e);
          toast.error("비용 견적을 불러오는데 실패했습니다.");
        } finally {
          setIsCheckingCost(false);
        }
      };
      fetchCost();
    }
  }, [
    step,
    startDate,
    endDate,
    timeframe,
    trainingConfig.epochs,
    architectureConfig.hiddenSize,
    architectureConfig.numLayers,
    optimizationConfig.isEnabled,
    optimizationConfig.nTrials,
  ]);

  // Set default dates (1 year period)
  React.useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, []);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createAIModel,
    onSuccess: (response) => {
      toast.success("AI 모델 학습이 시작되었습니다!");
      router.push(`/ai-lab/${response.model.id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || "모델 생성에 실패했습니다.");
    },
  });

  const handleSubmit = () => {
    const payload: AIModelCreateRequest = {
      name,
      description: description || undefined,
      modelType,
      trainingSymbol: symbol,
      trainingTimeframe: timeframe,
      trainingStartDate: new Date(startDate).toISOString(),
      trainingEndDate: new Date(endDate).toISOString(),
      architectureConfig,
      featureConfig,
      labelingConfig,
      trainingConfig,
      optimizationConfig,
    };
    createMutation.mutate(payload);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim().length >= 3;
      case 2:
        return symbol && timeframe && startDate && endDate;
      case 3:
        return featureConfig.indicators.length > 0;
      case 4:
        return labelingConfig.profitTarget > 0 && labelingConfig.stopLoss > 0;
      case 5:
        return optimizationConfig.isEnabled
          ? optimizationConfig.nTrials > 0 &&
              optimizationConfig.maximizeMetric.length > 0
          : architectureConfig.hiddenSize > 0;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">모델 이름</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: BTC 1시간봉 LSTM 모델"
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-base font-medium">설명 (선택)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="모델에 대한 간단한 설명..."
                className="mt-2"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-base font-medium">모델 타입</Label>
              <Select value={modelType} onValueChange={setModelType}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lstm">
                    LSTM (Long Short-Term Memory)
                  </SelectItem>
                  <SelectItem value="gru">
                    GRU (Gated Recurrent Unit)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                {modelType === "lstm"
                  ? "LSTM은 장기 패턴을 학습하는 데 효과적입니다."
                  : "GRU는 LSTM보다 빠르고 가벼우며 유사한 성능을 제공합니다."}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">학습 심볼</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYMBOLS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-base font-medium">타임프레임</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((tf) => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                1시간봉(1h)은 노이즈를 줄이면서 충분한 데이터 양을 제공합니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-base font-medium">시작일</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-base font-medium">종료일</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-medium">기본 데이터</Label>
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-base">OHLCV 데이터</Label>
                  <p className="text-sm text-muted-foreground">
                    시가, 고가, 저가, 종가, 거래량 데이터를 학습에 사용합니다.
                  </p>
                </div>
                <Switch
                  checked={featureConfig.useOhlcv}
                  onCheckedChange={(c) =>
                    setFeatureConfig({ ...featureConfig, useOhlcv: c })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-base">수익률(Returns)</Label>
                  <p className="text-sm text-muted-foreground">
                    가격 변화율 및 로그 수익률을 피처로 추가합니다.
                  </p>
                </div>
                <Switch
                  checked={featureConfig.useReturns}
                  onCheckedChange={(c) =>
                    setFeatureConfig({
                      ...featureConfig,
                      useReturns: c,
                      useLogReturns: c,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">기술적 지표</Label>
                <span className="text-sm text-muted-foreground">
                  {featureConfig.indicators.length}개 선택됨
                </span>
              </div>

              {/* Search */}
              <Input
                placeholder="지표 검색..."
                value={indicatorSearch}
                onChange={(e) => setIndicatorSearch(e.target.value)}
                className="h-9"
              />

              {/* Category Tabs */}
              {indicatorMetadata && indicatorMetadata.length > 0 ? (
                <Tabs defaultValue="All" className="w-full">
                  <TabsList className="w-full flex-wrap h-auto gap-1">
                    {indicatorCategories.map((cat) => (
                      <TabsTrigger
                        key={cat}
                        value={cat}
                        className="text-xs px-3 py-1"
                      >
                        {cat}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {indicatorCategories.map((cat) => (
                    <TabsContent key={cat} value={cat} className="mt-4">
                      <ScrollArea className="h-[280px] pr-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {filteredIndicators
                            .filter(
                              (ind) => cat === "All" || ind.category === cat
                            )
                            .filter(
                              (ind) =>
                                ![
                                  "Close",
                                  "Open",
                                  "High",
                                  "Low",
                                  "Volume",
                                ].includes(ind.key)
                            )
                            .map((indicator) => {
                              const isChecked = featureConfig.indicators.some(
                                (i) =>
                                  i.type.toUpperCase() ===
                                  indicator.key.toUpperCase()
                              );
                              return (
                                <div
                                  key={indicator.key}
                                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                    isChecked
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  onClick={() => {
                                    if (isChecked) {
                                      setFeatureConfig({
                                        ...featureConfig,
                                        indicators:
                                          featureConfig.indicators.filter(
                                            (i) =>
                                              i.type.toUpperCase() !==
                                              indicator.key.toUpperCase()
                                          ),
                                      });
                                    } else {
                                      setFeatureConfig({
                                        ...featureConfig,
                                        indicators: [
                                          ...featureConfig.indicators,
                                          {
                                            type: indicator.key,
                                            params: getDefaultParams(
                                              indicator.key
                                            ),
                                          },
                                        ],
                                      });
                                    }
                                  }}
                                >
                                  <Checkbox
                                    checked={isChecked}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {indicator.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {indicator.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  지표 목록 로딩 중...
                </div>
              )}
            </div>

            {/* Selected Indicators Parameter Configuration */}
            {featureConfig.indicators.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    선택된 지표 파라미터 설정
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    각 지표의 파라미터를 조정할 수 있습니다
                  </span>
                </div>
                <div className="space-y-2">
                  {featureConfig.indicators.map((indicator, idx) => {
                    const meta = indicatorMetadata?.find(
                      (m) =>
                        m.key.toUpperCase() === indicator.type.toUpperCase()
                    );
                    const hasParams =
                      meta?.parameters &&
                      Object.keys(meta.parameters).length > 0;

                    return (
                      <Collapsible key={indicator.type}>
                        <CollapsibleTrigger asChild>
                          <div className="p-3 bg-card rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="font-mono text-xs"
                                >
                                  {indicator.type}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {meta?.label || indicator.type}
                                </span>
                              </div>
                              {hasParams && (
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        {hasParams && (
                          <CollapsibleContent>
                            <div className="p-3 mt-1 bg-muted/30 rounded-lg border border-dashed">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {Object.entries(meta.parameters).map(
                                  ([paramKey, paramDef]: [string, any]) => (
                                    <div key={paramKey} className="space-y-1">
                                      <Label className="text-xs text-muted-foreground">
                                        {paramKey}
                                        {paramDef.min !== undefined &&
                                          paramDef.max !== undefined && (
                                            <span className="ml-1 opacity-60">
                                              ({paramDef.min}-{paramDef.max})
                                            </span>
                                          )}
                                      </Label>
                                      <Input
                                        type="number"
                                        value={
                                          indicator.params?.[paramKey] ??
                                          paramDef.default
                                        }
                                        min={paramDef.min}
                                        max={paramDef.max}
                                        step={paramDef.step || 1}
                                        className="h-8 text-sm"
                                        onChange={(e) => {
                                          const value = parseFloat(
                                            e.target.value
                                          );
                                          setFeatureConfig({
                                            ...featureConfig,
                                            indicators:
                                              featureConfig.indicators.map(
                                                (ind, i) =>
                                                  i === idx
                                                    ? {
                                                        ...ind,
                                                        params: {
                                                          ...ind.params,
                                                          [paramKey]: isNaN(
                                                            value
                                                          )
                                                            ? paramDef.default
                                                            : value,
                                                        },
                                                      }
                                                    : ind
                                              ),
                                          });
                                        }}
                                      />
                                    </div>
                                  )
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-7 text-xs"
                                onClick={() => {
                                  setFeatureConfig({
                                    ...featureConfig,
                                    indicators: featureConfig.indicators.map(
                                      (ind, i) =>
                                        i === idx
                                          ? {
                                              ...ind,
                                              params: getDefaultParams(
                                                indicator.type
                                              ),
                                            }
                                          : ind
                                    ),
                                  });
                                }}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                기본값으로 초기화
                              </Button>
                            </div>
                          </CollapsibleContent>
                        )}
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
              <p className="font-medium text-blue-600 dark:text-blue-400">
                Triple Barrier 라벨링
              </p>
              <p className="mt-1 text-muted-foreground">
                각 시점에서 목표 수익률(TP)에 먼저 도달하면 BUY, 손절선(SL)에
                먼저 도달하면 SELL, 제한 시간 내에 둘 다 도달하지 못하면 HOLD로
                라벨링합니다.
              </p>
            </div>
            <div>
              <Label className="text-base font-medium">
                Take Profit (TP):{" "}
                {(labelingConfig.profitTarget * 100).toFixed(1)}%
              </Label>
              <Slider
                value={[labelingConfig.profitTarget * 100]}
                onValueChange={([v]) =>
                  setLabelingConfig((prev) => ({
                    ...prev,
                    profitTarget: v / 100,
                  }))
                }
                min={0.5}
                max={10}
                step={0.1}
                className="mt-4"
              />
            </div>
            <div>
              <Label className="text-base font-medium">
                Stop Loss (SL): {(labelingConfig.stopLoss * 100).toFixed(1)}%
              </Label>
              <Slider
                value={[labelingConfig.stopLoss * 100]}
                onValueChange={([v]) =>
                  setLabelingConfig((prev) => ({ ...prev, stopLoss: v / 100 }))
                }
                min={0.5}
                max={10}
                step={0.1}
                className="mt-4"
              />
            </div>
            <div>
              <Label className="text-base font-medium">
                시간 제한 (Horizon): {labelingConfig.horizon} 봉
              </Label>
              <Slider
                value={[labelingConfig.horizon]}
                onValueChange={([v]) =>
                  setLabelingConfig((prev) => ({ ...prev, horizon: v }))
                }
                min={6}
                max={72}
                step={1}
                className="mt-4"
              />
              <p className="text-sm text-muted-foreground mt-2">
                {timeframe}봉 기준 약{" "}
                {Math.round(
                  labelingConfig.horizon * (timeframe === "1h" ? 1 : 0.5)
                )}
                시간
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <Tabs
              defaultValue={optimizationConfig.isEnabled ? "auto" : "manual"}
              className="w-full"
              onValueChange={(v) =>
                setOptimizationConfig((prev) => ({
                  ...prev,
                  isEnabled: v === "auto",
                }))
              }
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  수동 설정
                </TabsTrigger>
                <TabsTrigger value="auto" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  Optuna 자동 최적화
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-6">
                <div>
                  <Label className="text-base font-medium">
                    Hidden Size: {architectureConfig.hiddenSize}
                  </Label>
                  <Slider
                    value={[architectureConfig.hiddenSize]}
                    onValueChange={([v]) =>
                      setArchitectureConfig((prev) => ({
                        ...prev,
                        hiddenSize: v,
                      }))
                    }
                    min={32}
                    max={256}
                    step={16}
                    className="mt-4"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    LSTM 레이어의 은닉 상태 차원입니다. 크면 복잡한 패턴을
                    학습하지만 과적합 위험이 있습니다.
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">
                    레이어 수: {architectureConfig.numLayers}
                  </Label>
                  <Slider
                    value={[architectureConfig.numLayers]}
                    onValueChange={([v]) =>
                      setArchitectureConfig((prev) => ({
                        ...prev,
                        numLayers: v,
                      }))
                    }
                    min={1}
                    max={4}
                    step={1}
                    className="mt-4"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    모델의 깊이를 결정합니다. 레이어가 많을수록 복잡한 시계열
                    패턴을 더 잘 포착할 수 있지만, 학습 시간이 길어지고 과적합의
                    가능성이 높아집니다.
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">
                    Dropout: {(architectureConfig.dropout * 100).toFixed(0)}%
                  </Label>
                  <Slider
                    value={[architectureConfig.dropout * 100]}
                    onValueChange={([v]) =>
                      setArchitectureConfig((prev) => ({
                        ...prev,
                        dropout: v / 100,
                      }))
                    }
                    min={0}
                    max={50}
                    step={5}
                    className="mt-4"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    과적합 방지를 위해 학습 중 일부 뉴런을 무작위로
                    비활성화합니다.
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">
                    Learning Rate (학습률): {trainingConfig.learningRate}
                  </Label>
                  <Select
                    value={trainingConfig.learningRate.toString()}
                    onValueChange={(v) =>
                      setTrainingConfig((prev) => ({
                        ...prev,
                        learningRate: parseFloat(v),
                      }))
                    }
                  >
                    <SelectTrigger className="mt-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">
                        0.01 (빠름 / 저정밀도)
                      </SelectItem>
                      <SelectItem value="0.005">0.005</SelectItem>
                      <SelectItem value="0.001">0.001 (권장값)</SelectItem>
                      <SelectItem value="0.0005">0.0005</SelectItem>
                      <SelectItem value="0.0001">
                        0.0001 (느림 / 고정밀도)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    가중치 업데이트 보폭을 조절합니다. 너무 크면 최적점을 찾지
                    못하고 요동칠 수 있으며, 너무 작으면 학습 속도가 매우
                    느려집니다.
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">
                    에폭 수: {trainingConfig.epochs}
                  </Label>
                  <Slider
                    value={[trainingConfig.epochs]}
                    onValueChange={([v]) =>
                      setTrainingConfig((prev) => ({ ...prev, epochs: v }))
                    }
                    min={30}
                    max={300}
                    step={10}
                    className="mt-4"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    전체 데이터를 반복해서 학습하는 횟수입니다. 충분히 학습해야
                    하지만, 너무 많으면 과거 데이터에만 최적화되어 실제 미래
                    성능이 떨어질 수 있습니다.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="auto" className="space-y-8 py-4">
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium text-violet-200">
                      Optuna 자동 최적화 모드
                    </h4>
                    <p className="text-sm text-violet-300/80 leading-relaxed">
                      인공지능이 수십 번 이상의 실험을 통해 당신의 전략과
                      데이터에 가장 적합한 아키텍처와 학습률을 자동으로
                      찾아냅니다. 최적의 성능을 끌어내기 위한 미세 조정을
                      자동화합니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <Label className="text-base font-medium">
                      Trial 수 (시도 횟수): {optimizationConfig.nTrials}회
                    </Label>
                    <Badge
                      variant="outline"
                      className="text-violet-400 border-violet-400/30"
                    >
                      예상 {optimizationConfig.nTrials}배 크레딧 소모
                    </Badge>
                  </div>
                  <Slider
                    value={[optimizationConfig.nTrials]}
                    onValueChange={([v]) =>
                      setOptimizationConfig((prev) => ({ ...prev, nTrials: v }))
                    }
                    min={10}
                    max={100}
                    step={10}
                    className="mt-4"
                  />
                  <p className="text-sm text-muted-foreground">
                    시도 횟수가 많을수록 더 정밀한 최적화가 가능하지만, 그만큼
                    더 많은 시간과 크레딧이 소요됩니다. 보통 20~50회 정도를
                    권장합니다.
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    최적화 목표 지표
                  </Label>
                  <Select
                    value={optimizationConfig.maximizeMetric}
                    onValueChange={(v: any) =>
                      setOptimizationConfig((prev) => ({
                        ...prev,
                        maximizeMetric: v,
                      }))
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accuracy">
                        Validation Accuracy (정확도 극대화)
                      </SelectItem>
                      <SelectItem value="f1">
                        F1-Score (정밀도/재현율 균형)
                      </SelectItem>
                      <SelectItem value="return">
                        Expected Return (기대 수익률 극대화)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    어떤 기준이 가장 높은 모델을 찾을지 결정합니다. 일반적인
                    트레이딩에는 F1-Score나 Accuracy가 추천됩니다.
                  </p>
                </div>

                <Collapsible className="space-y-2">
                  <CollapsibleTrigger asChild>
                    <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 cursor-pointer hover:bg-violet-500/10 transition-all">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium flex items-center gap-2">
                          <Settings className="w-4 h-4 text-violet-400" />
                          하이퍼파라미터 탐색 범위 세부 설정
                        </h5>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-6 p-4 rounded-xl border border-muted/20 bg-muted/5">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-muted/20">
                      <p className="text-xs text-muted-foreground">
                        설정된 범위를 기본값으로 되돌립니다.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[10px] gap-1.5 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                        onClick={(e) => {
                          e.preventDefault();
                          setOptimizationConfig((prev) => ({
                            ...prev,
                            searchSpace:
                              DEFAULT_OPTIMIZATION_CONFIG.searchSpace,
                          }));
                          toast.success(
                            "탐색 범위가 기본값으로 초기화되었습니다."
                          );
                        }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        기본값으로 초기화
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <Label>Hidden Size 범위</Label>
                        <span className="font-mono text-violet-400">
                          {optimizationConfig.searchSpace.hiddenSize.min} ~{" "}
                          {optimizationConfig.searchSpace.hiddenSize.max}
                        </span>
                      </div>
                      <Slider
                        value={[
                          optimizationConfig.searchSpace.hiddenSize.min,
                          optimizationConfig.searchSpace.hiddenSize.max,
                        ]}
                        onValueChange={([min, max]) =>
                          setOptimizationConfig((prev) => ({
                            ...prev,
                            searchSpace: {
                              ...prev.searchSpace,
                              hiddenSize: { min, max },
                            },
                          }))
                        }
                        min={16}
                        max={512}
                        step={16}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <Label>Layers 범위</Label>
                        <span className="font-mono text-violet-400">
                          {optimizationConfig.searchSpace.numLayers.min} ~{" "}
                          {optimizationConfig.searchSpace.numLayers.max}
                        </span>
                      </div>
                      <Slider
                        value={[
                          optimizationConfig.searchSpace.numLayers.min,
                          optimizationConfig.searchSpace.numLayers.max,
                        ]}
                        onValueChange={([min, max]) =>
                          setOptimizationConfig((prev) => ({
                            ...prev,
                            searchSpace: {
                              ...prev.searchSpace,
                              numLayers: { min, max },
                            },
                          }))
                        }
                        min={1}
                        max={8}
                        step={1}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <Label>Dropout 범위</Label>
                        <span className="font-mono text-violet-400">
                          {(
                            optimizationConfig.searchSpace.dropout.min * 100
                          ).toFixed(0)}
                          % ~{" "}
                          {(
                            optimizationConfig.searchSpace.dropout.max * 100
                          ).toFixed(0)}
                          %
                        </span>
                      </div>
                      <Slider
                        value={[
                          optimizationConfig.searchSpace.dropout.min * 100,
                          optimizationConfig.searchSpace.dropout.max * 100,
                        ]}
                        onValueChange={([min, max]) =>
                          setOptimizationConfig((prev) => ({
                            ...prev,
                            searchSpace: {
                              ...prev.searchSpace,
                              dropout: { min: min / 100, max: max / 100 },
                            },
                          }))
                        }
                        min={0}
                        max={80}
                        step={5}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <Label>Learning Rate 범위</Label>
                        <span className="font-mono text-violet-400">
                          {optimizationConfig.searchSpace.learningRate.min} ~{" "}
                          {optimizationConfig.searchSpace.learningRate.max}
                        </span>
                      </div>
                      <Slider
                        value={[
                          Math.log10(
                            optimizationConfig.searchSpace.learningRate.min
                          ),
                          Math.log10(
                            optimizationConfig.searchSpace.learningRate.max
                          ),
                        ]}
                        onValueChange={([min, max]) =>
                          setOptimizationConfig((prev) => ({
                            ...prev,
                            searchSpace: {
                              ...prev.searchSpace,
                              learningRate: {
                                min: Math.pow(10, min),
                                max: Math.pow(10, max),
                              },
                            },
                          }))
                        }
                        min={-5}
                        max={-1}
                        step={0.1}
                      />
                      <p className="text-[10px] text-muted-foreground text-center">
                        LR은 로그 스케일로 조정됩니다 (1e-5 ~ 1e-1)
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <Label>Batch Size 범위</Label>
                        <span className="font-mono text-violet-400">
                          {optimizationConfig.searchSpace.batchSize.min} ~{" "}
                          {optimizationConfig.searchSpace.batchSize.max}
                        </span>
                      </div>
                      <Slider
                        value={[
                          optimizationConfig.searchSpace.batchSize.min,
                          optimizationConfig.searchSpace.batchSize.max,
                        ]}
                        onValueChange={([min, max]) =>
                          setOptimizationConfig((prev) => ({
                            ...prev,
                            searchSpace: {
                              ...prev.searchSpace,
                              batchSize: { min, max },
                            },
                          }))
                        }
                        min={16}
                        max={512}
                        step={16}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </TabsContent>
            </Tabs>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mt-4">
                모델 학습 준비 완료
              </h3>
              <p className="text-muted-foreground mt-2">
                설정을 확인하고 학습을 시작하세요.
              </p>
            </div>
            <div className="grid gap-4">
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">모델 이름</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">모델 타입</span>
                <span className="font-medium">{modelType.toUpperCase()}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">학습 심볼</span>
                <span className="font-medium">{symbol}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">타임프레임</span>
                <span className="font-medium">{timeframe}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">학습 기간</span>
                <span className="font-medium">
                  {startDate} ~ {endDate}
                </span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">TP / SL</span>
                <span className="font-medium">
                  {(labelingConfig.profitTarget * 100).toFixed(1)}% /{" "}
                  {(labelingConfig.stopLoss * 100).toFixed(1)}%
                </span>
              </div>
              <div className="rounded-lg bg-card/50 border border-border p-4 space-y-4">
                <h4 className="font-semibold text-sm">비용 상세정보</h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>정가 (Basic 기준)</span>
                    </div>
                    <span>
                      {costData && !isCheckingCost
                        ? `${costData.originalCost.toLocaleString()} CC`
                        : "..."}
                    </span>
                  </div>

                  {costData && costData.discountPct > 0 && (
                    <div className="flex justify-between text-sm text-blue-400">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        <span>
                          플랜 할인 ({(costData.discountPct * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <span>
                        -
                        {Math.ceil(
                          costData.originalCost - costData.finalCost
                        ).toLocaleString()}{" "}
                        CC
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-border" />

                <div className="flex justify-between items-center text-violet-400">
                  <div className="flex items-center gap-2 font-semibold">
                    <Ticket className="h-5 w-5" />
                    <span>최종 필요 크레딧</span>
                  </div>
                  <span className="text-xl font-bold">
                    {isCheckingCost ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      `${costData?.finalCost.toLocaleString() ?? 0} CC`
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground pt-2">
                  <span>내 크레딧 잔액</span>
                  <span
                    className={
                      costData && !costData.isSufficient
                        ? "text-red-500 font-medium"
                        : ""
                    }
                  >
                    {costData?.userBalance.toLocaleString()} CC
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          돌아가기
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">새 AI 모델 생성</h1>
        <p className="text-muted-foreground mt-2">
          단계별로 설정을 완료하여 AI 모델을 학습시킵니다.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <div
                  className={`flex flex-col items-center cursor-pointer transition-all ${
                    isActive ? "scale-110" : ""
                  }`}
                  onClick={() => s.id < step && setStep(s.id)}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 hidden sm:block ${
                      isActive
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded ${
                      step > s.id ? "bg-emerald-500" : "bg-muted"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <GlassPane className="p-6 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            이전
          </Button>
          {step < 6 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              다음
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || isCheckingCost || !costData}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : isCheckingCost ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  비용 계산 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  학습 시작 ({costData?.finalCost?.toLocaleString() ?? 0}{" "}
                  Credits)
                </>
              )}
            </Button>
          )}
        </div>
      </GlassPane>
    </div>
  );
}
