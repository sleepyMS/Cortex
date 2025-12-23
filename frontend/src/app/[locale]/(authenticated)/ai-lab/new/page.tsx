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
import { Textarea } from "@/components/ui/Textarea";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Settings,
  Database,
  Target,
  Sparkles,
  Check,
  Loader2,
  Tag,
  Percent,
  Ticket,
} from "lucide-react";

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
} from "@/types/ai";

const STEPS = [
  { id: 1, title: "기본 정보", icon: Brain },
  { id: 2, title: "학습 데이터", icon: Database },
  { id: 3, title: "라벨링 설정", icon: Target },
  { id: 4, title: "모델 설정", icon: Settings },
  { id: 5, title: "확인 및 시작", icon: Sparkles },
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

  const [labelingConfig, setLabelingConfig] = useState<AILabelingConfig>(
    DEFAULT_LABELING_CONFIG
  );
  const [architectureConfig, setArchitectureConfig] =
    useState<AIArchitectureConfig>(DEFAULT_ARCHITECTURE_CONFIG);
  const [trainingConfig, setTrainingConfig] = useState<AITrainingConfig>(
    DEFAULT_TRAINING_CONFIG
  );

  const [costData, setCostData] = useState<CostEstimationResponse | null>(null);
  const [isCheckingCost, setIsCheckingCost] = useState(false);

  // Check cost on step 5
  React.useEffect(() => {
    if (step === 5) {
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
          setCostData(res);
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
      featureConfig: DEFAULT_FEATURE_CONFIG,
      labelingConfig,
      trainingConfig,
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
        return labelingConfig.profitTarget > 0 && labelingConfig.stopLoss > 0;
      case 4:
        return architectureConfig.hiddenSize > 0;
      case 5:
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

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">
                Hidden Size: {architectureConfig.hiddenSize}
              </Label>
              <Slider
                value={[architectureConfig.hiddenSize]}
                onValueChange={([v]) =>
                  setArchitectureConfig((prev) => ({ ...prev, hiddenSize: v }))
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
                  setArchitectureConfig((prev) => ({ ...prev, numLayers: v }))
                }
                min={1}
                max={4}
                step={1}
                className="mt-4"
              />
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
                과적합 방지를 위해 학습 중 일부 뉴런을 무작위로 비활성화합니다.
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
            </div>
          </div>
        );

      case 5:
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
          {step < 5 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
            >
              다음
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  학습 시작 ({costData?.finalCost ?? "..."} Credits)
                </>
              )}
            </Button>
          )}
        </div>
      </GlassPane>
    </div>
  );
}
