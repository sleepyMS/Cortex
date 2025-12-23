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
  { id: 1, title: "new.steps.basicInfo", icon: Brain },
  { id: 2, title: "new.steps.trainingData", icon: Database },
  { id: 3, title: "new.steps.features", icon: ListFilter },
  { id: 4, title: "new.steps.labeling", icon: Target },
  { id: 5, title: "new.steps.modelConfig", icon: Settings },
  { id: 6, title: "new.steps.confirmation", icon: Sparkles },
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
          toast.error(t("new.step6.costError"));
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
      toast.success(t("new.step6.startSuccess"));
      router.push(`/ai-lab/${response.model.id}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || t("new.step6.createError"));
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
              <Label className="text-base font-medium">
                {t("new.step1.modelName")}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("new.step1.modelNamePlaceholder")}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-base font-medium">
                {t("new.step1.description")}
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("new.step1.descriptionPlaceholder")}
                className="mt-2"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-base font-medium">
                {t("new.step1.modelType")}
              </Label>
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
                  ? t("new.step1.lstmDesc")
                  : t("new.step1.gruDesc")}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">
                {t("new.step2.symbol")}
              </Label>
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
              <Label className="text-base font-medium">
                {t("new.step2.timeframe")}
              </Label>
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
                {t("new.step2.timeframeDesc")}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-base font-medium">
                  {t("new.step2.startDate")}
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-base font-medium">
                  {t("new.step2.endDate")}
                </Label>
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
              <Label className="text-base font-medium">
                {t("new.step3.basicData")}
              </Label>
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border">
                <div className="space-y-0.5">
                  <Label className="text-base">{t("new.step3.ohlcv")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("new.step3.ohlcvDesc")}
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
                  <Label className="text-base">{t("new.step3.returns")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("new.step3.returnsDesc")}
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
                <Label className="text-base font-medium">
                  {t("new.step3.technicalIndicators")}
                </Label>
                <span className="text-sm text-muted-foreground">
                  {t("new.step3.selectedCount", {
                    count: featureConfig.indicators.length,
                  })}
                </span>
              </div>

              {/* Search */}
              <Input
                placeholder={t("new.step3.searchPlaceholder")}
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
                  {t("new.step3.loadingIndicators")}
                </div>
              )}
            </div>

            {/* Selected Indicators Parameter Configuration */}
            {featureConfig.indicators.length > 0 && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    {t("new.step3.paramSettings")}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {t("new.step3.paramSettingsDesc")}
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
                                {t("new.step3.resetToDefault")}
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
                {t("new.step4.tripleBarrierTitle")}
              </p>
              <p className="mt-1 text-muted-foreground">
                {t("new.step4.tripleBarrierDesc")}
              </p>
            </div>
            <div>
              <Label className="text-base font-medium">
                {t("new.step4.takeProfit")}
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
                {t("new.step4.stopLoss")}{" "}
                {(labelingConfig.stopLoss * 100).toFixed(1)}%
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
                {t("new.step4.horizon", { value: labelingConfig.horizon })}
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
                {t("new.step4.horizonDesc", {
                  timeframe,
                  hours: Math.round(
                    labelingConfig.horizon * (timeframe === "1h" ? 1 : 0.5)
                  ),
                })}
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
                  {t("new.step5.manual")}
                </TabsTrigger>
                <TabsTrigger value="auto" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  {t("new.step5.auto")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-6">
                <div>
                  <Label className="text-base font-medium">
                    {t("new.step5.manualTab.hiddenSize", {
                      value: architectureConfig.hiddenSize,
                    })}
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
                    {t("new.step5.manualTab.hiddenSizeDesc")}
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">
                    {t("new.step5.manualTab.numLayers", {
                      value: architectureConfig.numLayers,
                    })}
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
                    {t("new.step5.manualTab.numLayersDesc")}
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">
                    {t("new.step5.manualTab.dropout", {
                      value: (architectureConfig.dropout * 100).toFixed(0),
                    })}
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
                    {t("new.step5.manualTab.dropoutDesc")}
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">
                    {t("new.step5.manualTab.learningRate", {
                      value: trainingConfig.learningRate,
                    })}
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
                        0.01 ({t("new.step5.manualTab.fastLowPrecision")})
                      </SelectItem>
                      <SelectItem value="0.005">0.005</SelectItem>
                      <SelectItem value="0.001">
                        0.001 ({t("new.step5.manualTab.recommended")})
                      </SelectItem>
                      <SelectItem value="0.0005">0.0005</SelectItem>
                      <SelectItem value="0.0001">
                        0.0001 ({t("new.step5.manualTab.slowHighPrecision")})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("new.step5.manualTab.learningRateDesc")}
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">
                    {t("new.step5.manualTab.epochs", {
                      value: trainingConfig.epochs,
                    })}
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
                    {t("new.step5.manualTab.epochsDesc")}
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
                      {t("new.step5.autoTab.title")}
                    </h4>
                    <p className="text-sm text-violet-300/80 leading-relaxed">
                      {t("new.step5.autoTab.desc")}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <Label className="text-base font-medium">
                      {t("new.step5.autoTab.nTrials", {
                        value: optimizationConfig.nTrials,
                      })}
                    </Label>
                    <Badge
                      variant="outline"
                      className="text-violet-400 border-violet-400/30"
                    >
                      {t("new.step5.autoTab.creditEst", {
                        value: optimizationConfig.nTrials,
                      })}
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
                    {t("new.step5.autoTab.nTrialsDesc")}
                  </p>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-medium">
                    {t("new.step5.autoTab.targetMetric")}
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
                        {t("new.step5.autoTab.metrics.accuracy")}
                      </SelectItem>
                      <SelectItem value="f1">
                        {t("new.step5.autoTab.metrics.f1")}
                      </SelectItem>
                      <SelectItem value="return">
                        {t("new.step5.autoTab.metrics.return")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {t("new.step5.autoTab.targetMetricDesc")}
                  </p>
                </div>

                <Collapsible className="space-y-2">
                  <CollapsibleTrigger asChild>
                    <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 cursor-pointer hover:bg-violet-500/10 transition-all">
                      <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium flex items-center gap-2">
                          <Settings className="w-4 h-4 text-violet-400" />
                          {t("new.step5.autoTab.searchSpace")}
                        </h5>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-6 p-4 rounded-xl border border-muted/20 bg-muted/5">
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-muted/20">
                      <p className="text-xs text-muted-foreground">
                        {t("new.step5.autoTab.resetRange")}
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
                          toast.success(t("new.step5.autoTab.resetSuccess"));
                        }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        {t("new.step3.resetToDefault")}
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <Label>
                          {t("new.step5.autoTab.ranges.hiddenSize")}
                        </Label>
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
                        <Label>{t("new.step5.autoTab.ranges.layers")}</Label>
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
                        <Label>{t("new.step5.autoTab.ranges.dropout")}</Label>
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
                        <Label>{t("new.step5.autoTab.ranges.lr")}</Label>
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
                        {t("new.step5.autoTab.ranges.logScale", {
                          min: "1e-5",
                          max: "1e-1",
                        })}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <Label>{t("new.step5.autoTab.ranges.batchSize")}</Label>
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
                {t("new.step6.readyTitle")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("new.step6.readyDesc")}
              </p>
            </div>
            <div className="grid gap-4">
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">
                  {t("new.step1.modelName")}
                </span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">
                  {t("new.step1.modelType")}
                </span>
                <span className="font-medium">{modelType.toUpperCase()}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">
                  {t("new.step2.symbol")}
                </span>
                <span className="font-medium">{symbol}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">
                  {t("new.step2.timeframe")}
                </span>
                <span className="font-medium">{timeframe}</span>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-muted-foreground">
                  {t("card.period")}
                </span>
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
                <h4 className="font-semibold text-sm">
                  {t("new.step6.costDetails")}
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>{t("new.step6.originalCost")}</span>
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
                          {t("new.step6.planDiscount", {
                            value: (costData.discountPct * 100).toFixed(0),
                          })}
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
                    <span>{t("new.step6.finalCost")}</span>
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
                  <span>{t("new.step6.balance")}</span>
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
          {t("new.back")}
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{t("new.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("new.subtitle")}</p>
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
                    {t(s.title as any)}
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
            {t("new.prev")}
          </Button>
          {step < 6 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              {t("new.next")}
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
                  {t("new.step6.creating")}
                </>
              ) : isCheckingCost ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("new.step6.calculating")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t("new.step6.startTraining", {
                    value: costData?.finalCost?.toLocaleString() ?? 0,
                  })}
                </>
              )}
            </Button>
          )}
        </div>
      </GlassPane>
    </div>
  );
}
