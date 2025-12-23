// file: frontend/src/app/[locale]/(authenticated)/ai-lab/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";

import {
  getAIModelDetail,
  getTrainingStatus,
  setModelPublic,
  testPrediction,
  deleteAIModel,
  getAIModelVersions,
} from "@/lib/api/ai";
import { Button } from "@/components/ui/Button";
import { GlassPane } from "@/components/ui/GlassPane";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Progress } from "@/components/ui/Progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/AlertDialog";
import {
  ArrowLeft,
  Brain,
  Clock,
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Trash2,
  Globe,
  Lock,
  RefreshCw,
  Play,
  Download,
  ChevronRight,
  Activity,
  History as HistoryIcon,
  AlertCircle,
  Cpu,
  Zap,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Separator } from "@/components/ui/Separator";
import { cn } from "@/lib/utils";
import { AIModelFeatureImportance } from "@/components/domain/ai-lab/AIModelFeatureImportance";
import { AIModelVersionsTable } from "@/components/domain/ai-lab/AIModelVersionsTable";
import { AIModelRetrainDialog } from "@/components/domain/ai-lab/AIModelRetrainDialog";

import type { AIModelDetail, AITrainingJob } from "@/types/ai";

const STATUS_CONFIG = {
  pending: {
    label: "대기 중",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  training: {
    label: "학습 중",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  completed: {
    label: "완료",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  failed: {
    label: "실패",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

interface PageProps {
  params: { id: string };
}

export default function AIModelDetailPage({ params }: PageProps) {
  const modelId = params.id;
  const t = useTranslations("AILabPage");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const searchParams = useSearchParams();
  const [isRetrainDialogOpen, setIsRetrainDialogOpen] = useState(false);
  const [hasAutoTested, setHasAutoTested] = useState(false);

  // Fetch model data
  const {
    data: model,
    isLoading,
    refetch: refetchModel,
  } = useQuery({
    queryKey: ["ai-model", modelId],
    queryFn: () => getAIModelDetail(modelId),
  });

  // Fetch training status (only if model is training)
  const { data: trainingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["ai-model-status", modelId],
    queryFn: () => getTrainingStatus(modelId),
    enabled: model?.status === "training" || model?.status === "pending",
    refetchInterval: model?.status === "training" ? 5000 : false,
  });

  // Effect to detect training completion and refresh model data
  useEffect(() => {
    if (
      trainingStatus?.status === "completed" ||
      trainingStatus?.status === "failed"
    ) {
      // Training finished, refresh model data to update UI
      refetchModel();
      queryClient.invalidateQueries({
        queryKey: ["ai-model-versions", modelId],
      });
    }
  }, [trainingStatus?.status, refetchModel, queryClient, modelId]);

  // Fetch model versions
  const { data: versions, refetch: refetchVersions } = useQuery({
    queryKey: ["ai-model-versions", modelId],
    queryFn: () => getAIModelVersions(modelId),
    enabled: !!model,
  });

  // Auto-run test if requested via query param
  useEffect(() => {
    const testParam = searchParams.get("test");
    if (
      testParam === "true" &&
      model?.status === "completed" &&
      !hasAutoTested &&
      !isPredicting
    ) {
      setHasAutoTested(true);
      handleTestPrediction();
    }
  }, [searchParams, model?.status, hasAutoTested, isPredicting]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteAIModel(modelId),
    onSuccess: () => {
      toast.success("AI 모델이 삭제되었습니다.");
      router.push("/ai-lab");
    },
    onError: () => {
      toast.error("모델 삭제에 실패했습니다.");
    },
  });

  // Toggle public mutation
  const togglePublicMutation = useMutation({
    mutationFn: (isPublic: boolean) => setModelPublic(modelId, isPublic),
    onSuccess: (_, isPublic) => {
      queryClient.invalidateQueries({ queryKey: ["ai-model", modelId] });
      toast.success(
        isPublic ? "모델이 공개되었습니다." : "모델이 비공개로 전환되었습니다."
      );
    },
    onError: () => {
      toast.error("설정 변경에 실패했습니다.");
    },
  });

  // Test prediction
  const handleTestPrediction = async () => {
    setIsPredicting(true);
    try {
      const result = await testPrediction(modelId, {
        symbol: model?.trainingSymbol || "BTCUSDT",
        timeframe: model?.trainingTimeframe || "1h",
      });
      setPredictionResult(result);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail || "예측 테스트에 실패했습니다."
      );
    } finally {
      setIsPredicting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-8 w-48 mb-8" />
        <GlassPane className="p-6">
          <Skeleton className="h-6 w-64 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </GlassPane>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">모델을 찾을 수 없습니다</h1>
        <Button onClick={() => router.push("/ai-lab")}>
          AI Lab으로 돌아가기
        </Button>
      </div>
    );
  }

  const statusConfig =
    STATUS_CONFIG[model.status as keyof typeof STATUS_CONFIG];

  return (
    <>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link
                href="/ai-lab"
                className="hover:text-primary transition-colors"
              >
                AI Lab
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground font-medium">{model.name}</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  {model.name}
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge
                    variant="secondary"
                    className="bg-primary/5 text-primary border-primary/10"
                  >
                    {model.modelType.toUpperCase()}
                  </Badge>
                  <span>·</span>
                  <span className="font-mono">{model.trainingSymbol}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "px-3 py-1 text-sm font-semibold shadow-sm",
                statusConfig.color
              )}
            >
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {/* Hero Metrics (Top Grid) */}
        {model.status === "completed" && model.performanceMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <GlassPane className="p-4 border-emerald-500/10 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    모델 정확도
                  </span>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Target className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-emerald-500">
                  {(model.performanceMetrics.accuracy * 100).toFixed(1)}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Validation Set Accuracy
                </p>
              </GlassPane>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <GlassPane className="p-4 border-blue-500/10 hover:border-blue-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    F1 Score
                  </span>
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-500">
                  {(model.performanceMetrics.f1Score * 100).toFixed(1)}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Weighted Average Score
                </p>
              </GlassPane>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <GlassPane className="p-4 border-violet-500/10 hover:border-violet-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Validation Loss
                  </span>
                  <div className="p-2 bg-violet-500/10 rounded-lg">
                    <Activity className="h-4 w-4 text-violet-500" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-violet-500">
                  {model.performanceMetrics.validationLoss?.toFixed(4) || "N/A"}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Final Loss Value
                </p>
              </GlassPane>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <GlassPane className="p-4 border-muted hover:border-muted-foreground/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Versions
                  </span>
                  <div className="p-2 bg-muted rounded-lg">
                    <HistoryIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {(versions || []).length}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Checkpoints Available
                </p>
              </GlassPane>
            </motion.div>
          </div>
        )}

        {/* Main Content Area (Split View) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (Main) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Training Progress (Prominent) */}
            {(model.status === "training" || model.status === "pending") && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <GlassPane className="p-6 border-blue-500/20 bg-blue-500/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <RefreshCw className="h-24 w-24 animate-spin-slow" />
                  </div>
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      Model Training in Progress
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchStatus()}
                      className="bg-background/50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> 새로고침
                    </Button>
                  </div>
                  {trainingStatus && (
                    <div className="space-y-6 relative z-10">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">Progress</span>
                          <span className="font-mono">
                            {trainingStatus.progressPct.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={trainingStatus.progressPct}
                          className="h-3 bg-blue-500/20"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-background/40 p-3 rounded-lg border border-white/5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                            Current Epoch
                          </span>
                          <span className="text-lg font-bold">
                            {trainingStatus.currentEpoch} /{" "}
                            {trainingStatus.totalEpochs}
                          </span>
                        </div>
                        <div className="bg-background/40 p-3 rounded-lg border border-white/5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                            Time Elapsed
                          </span>
                          <span className="text-lg font-bold">--:--</span>
                        </div>
                      </div>
                      {trainingStatus.errorMessage && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 text-sm">
                          <AlertCircle className="h-4 w-4" />{" "}
                          {trainingStatus.errorMessage}
                        </div>
                      )}
                    </div>
                  )}
                </GlassPane>
              </motion.div>
            )}

            {/* Feature Configuration & Feature Importance */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/30">
                <TabsTrigger value="overview">모델 개요</TabsTrigger>
                <TabsTrigger value="versions">버전 기록</TabsTrigger>
                <TabsTrigger value="feature-importance">피처 분석</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Prediction Playground */}
                {model.status === "completed" && (
                  <GlassPane className="p-0 border-primary/20 bg-primary/5 overflow-hidden">
                    <div className="p-6 border-b border-primary/20 bg-muted/20 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          Prediction Playground
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          Live market data prediction simulation
                        </p>
                      </div>
                      <Button
                        onClick={handleTestPrediction}
                        disabled={isPredicting}
                        className="shadow-violet-500/40 shadow-lg"
                      >
                        {isPredicting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-2 fill-current" />
                        )}
                        Run Prediction
                      </Button>
                    </div>

                    <div className="p-6 min-h-[200px] flex items-center justify-center">
                      {!predictionResult && !isPredicting ? (
                        <div className="text-center space-y-3 opacity-50">
                          <Play className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-sm">
                            Click the button above to test the model with
                            current data
                          </p>
                        </div>
                      ) : isPredicting ? (
                        <div className="text-center space-y-4">
                          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                          <p className="text-sm font-medium animate-pulse">
                            Analyzing market patterns...
                          </p>
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-full"
                        >
                          <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    "h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-black shadow-2xl",
                                    predictionResult.predictedLabel === "BUY"
                                      ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                      : predictionResult.predictedLabel ===
                                        "SELL"
                                      ? "bg-red-500 text-white shadow-red-500/20"
                                      : "bg-slate-500 text-white shadow-slate-500/20"
                                  )}
                                >
                                  {predictionResult.predictedLabel}
                                </div>
                                <div>
                                  <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                                    Verdict Confidence
                                  </span>
                                  <div className="text-3xl font-black tabular-nums">
                                    {(
                                      Math.max(
                                        predictionResult.buyProbability || 0,
                                        predictionResult.holdProbability || 0,
                                        predictionResult.sellProbability || 0
                                      ) * 100
                                    ).toFixed(1)}
                                    %
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3 pt-4">
                                {["BUY", "HOLD", "SELL"].map((label) => {
                                  const prob =
                                    predictionResult[
                                      `${label.toLowerCase()}Probability`
                                    ] || 0;
                                  return (
                                    <div key={label} className="space-y-1">
                                      <div className="flex justify-between text-[10px] font-bold">
                                        <span>{label}</span>
                                        <span>{(prob * 100).toFixed(1)}%</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-muted rounded-full">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${prob * 100}%` }}
                                          className={cn(
                                            "h-full rounded-full transition-all duration-1000",
                                            label === "BUY"
                                              ? "bg-emerald-500"
                                              : label === "SELL"
                                              ? "bg-red-500"
                                              : "bg-slate-400"
                                          )}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="bg-background/60 p-5 rounded-xl border border-white/5 space-y-4 font-mono text-xs">
                              <h4 className="text-[10px] uppercase text-muted-foreground font-black mb-2 flex items-center gap-2">
                                <TrendingUp className="h-3 w-3" /> Market
                                Context
                              </h4>
                              <div className="flex justify-between pb-2 border-b border-white/5">
                                <span className="text-muted-foreground">
                                  Symbol
                                </span>
                                <span>{model.trainingSymbol}</span>
                              </div>
                              <div className="flex justify-between pb-2 border-b border-white/5">
                                <span className="text-muted-foreground">
                                  Timeframe
                                </span>
                                <span>{model.trainingTimeframe}</span>
                              </div>
                              <div className="flex justify-between pb-2 border-b border-white/5">
                                <span className="text-muted-foreground">
                                  Source
                                </span>
                                <span className="text-emerald-500">
                                  Real-time WebSocket
                                </span>
                              </div>
                              <div className="flex justify-between pt-2">
                                <span className="text-muted-foreground">
                                  Timestamp
                                </span>
                                <span>{format(new Date(), "HH:mm:ss")}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </GlassPane>
                )}

                {/* Feature Statistics Summary (Detailed View) */}
                <GlassPane className="p-6 mt-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      학습 데이터셋 설정 (Dataset Config)
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {/* OHLCV & Sequence Info */}
                    <div className="grid md:grid-cols-3 gap-6 pb-6 border-b border-white/5">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Base Features (OHLCV)
                        </span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge
                            variant={
                              model.featureConfig?.useOhlcv
                                ? "default"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            OHLCV{" "}
                            {model.featureConfig?.useOhlcv
                              ? "Enabled"
                              : "Disabled"}
                          </Badge>
                          <Badge
                            variant={
                              model.featureConfig?.useReturns
                                ? "default"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            Returns{" "}
                            {model.featureConfig?.useReturns
                              ? "Enabled"
                              : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Sequence Length
                        </span>
                        <div className="text-xl font-mono font-bold">
                          {model.featureConfig?.sequenceLength || 60}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            Candles
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Label Strategy
                        </span>
                        <div className="text-xl font-bold">
                          Standard 3-Class{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            (B/H/S)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Indicators Table-like View */}
                    <div className="space-y-4">
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">
                        Techncial Indicators & Parameters
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {model.featureConfig?.indicators &&
                        model.featureConfig.indicators.length > 0 ? (
                          model.featureConfig.indicators.map(
                            (ind: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-white/5 group hover:border-primary/20 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                                  <span className="font-mono font-bold text-sm uppercase">
                                    {ind.type}
                                  </span>
                                </div>
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  {ind.params &&
                                    Object.entries(ind.params).map(
                                      ([key, value]) => (
                                        <Badge
                                          key={key}
                                          variant="secondary"
                                          className="px-1.5 py-0 h-5 text-[9px] bg-background/50 border-white/5 font-mono"
                                        >
                                          <span className="text-muted-foreground mr-1">
                                            {key}:
                                          </span>
                                          {String(value)}
                                        </Badge>
                                      )
                                    )}
                                  {(!ind.params ||
                                    Object.keys(ind.params).length === 0) && (
                                    <span className="text-[10px] text-muted-foreground italic">
                                      Default Params
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          )
                        ) : (
                          <div className="col-span-2 text-center py-8 bg-muted/10 rounded-xl border border-dashed text-sm text-muted-foreground">
                            No technical indicators used for this model.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassPane>

                {/* Training & Architecture Config (Hyperparameters) */}
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  {/* Architecture Config */}
                  <GlassPane className="p-6 border-blue-500/10 hover:border-blue-500/20 transition-all">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                      <Cpu className="h-5 w-5 text-blue-400" />
                      모델 아키텍처 (Architecture)
                    </h3>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Hidden Size
                        </span>
                        <div className="text-xl font-mono font-bold text-blue-400">
                          {model.architectureConfig?.hiddenSize || 64}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Layers
                        </span>
                        <div className="text-xl font-mono font-bold text-blue-400">
                          {model.architectureConfig?.numLayers || 2}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Dropout
                        </span>
                        <div className="text-xl font-mono font-bold text-blue-400">
                          {(model.architectureConfig?.dropout || 0) * 100}%
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Bidirectional
                        </span>
                        <div className="text-lg font-bold">
                          {model.architectureConfig?.bidirectional
                            ? "Enabled"
                            : "Disabled"}
                        </div>
                      </div>
                    </div>
                  </GlassPane>

                  {/* Hyperparameters Config */}
                  <GlassPane className="p-6 border-amber-500/10 hover:border-amber-500/20 transition-all">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                      <Zap className="h-5 w-5 text-amber-400" />
                      학습 하이퍼파라미터
                    </h3>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Epochs / Batch
                        </span>
                        <div className="text-xl font-mono font-bold text-amber-400">
                          {model.trainingConfig?.epochs}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            /
                          </span>{" "}
                          {model.trainingConfig?.batchSize}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Learning Rate
                        </span>
                        <div className="text-xl font-mono font-bold text-amber-400">
                          {model.trainingConfig?.learningRate}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Patience
                        </span>
                        <div className="text-xl font-mono font-bold text-amber-400">
                          {model.trainingConfig?.earlyStoppingPatience}{" "}
                          <span className="text-xs font-normal text-muted-foreground text-amber-400/70">
                            eps
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          Val Split
                        </span>
                        <div className="text-xl font-mono font-bold text-amber-400">
                          {(model.trainingConfig?.validationSplit || 0.2) * 100}
                          %
                        </div>
                      </div>
                    </div>
                  </GlassPane>
                </div>
              </TabsContent>

              <TabsContent value="versions">
                <GlassPane className="p-0 overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center bg-muted/10">
                    <h2 className="text-lg font-bold">Version History</h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRetrainDialogOpen(true)}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" /> Manual Retrain
                    </Button>
                  </div>
                  <AIModelVersionsTable
                    modelId={modelId}
                    versions={versions || []}
                    onVersionActivated={() => {
                      refetchVersions();
                      refetchModel();
                    }}
                  />
                </GlassPane>
              </TabsContent>

              <TabsContent value="feature-importance">
                <AIModelFeatureImportance
                  featureImportance={
                    model.validationMetrics?.featureImportance ||
                    (model.validationMetrics as any)?.feature_importance
                  }
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-6 sticky top-24 self-start">
            {/* Configuration Card */}
            <GlassPane className="p-6 space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Model Configuration
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Training Period
                    </span>
                    <span className="text-sm font-medium">
                      {format(new Date(model.trainingStartDate), "yy.MM.dd")} -{" "}
                      {format(new Date(model.trainingEndDate), "yy.MM.dd")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Created On
                    </span>
                    <span className="text-sm font-medium">
                      {format(new Date(model.createdAt), "yyyy.MM.dd HH:mm")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <RefreshCw className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      Auto Retraining
                    </span>
                    <span className="text-sm font-medium">
                      {model.isAutoRetrainEnabled
                        ? `${model.retrainIntervalDays}d Interval`
                        : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-foreground">Features</h4>
                <div className="flex flex-wrap gap-2">
                  {model.featureConfig?.useOhlcv && (
                    <Badge
                      variant="secondary"
                      className="px-2 py-0 h-5 text-[10px]"
                    >
                      OHLCV
                    </Badge>
                  )}
                  {model.featureConfig?.useReturns && (
                    <Badge
                      variant="secondary"
                      className="px-2 py-0 h-5 text-[10px]"
                    >
                      RETURNS
                    </Badge>
                  )}
                  {model.featureConfig?.indicators?.map(
                    (i: any, idx: number) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="px-2 py-0 h-5 text-[10px] font-mono"
                      >
                        {i.type}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </GlassPane>

            {/* Management Actions */}
            <GlassPane className="p-6 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Management
              </h3>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-11"
                  onClick={() => togglePublicMutation.mutate(!model.isPublic)}
                  disabled={togglePublicMutation.isPending}
                >
                  {model.isPublic ? (
                    <>
                      <Lock className="h-4 w-4 text-violet-500" /> Switch to
                      Private
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 text-emerald-500" /> Make Public
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-11"
                  asChild
                >
                  <a href={`/api/ai-models/${modelId}/download`} download>
                    <Download className="h-4 w-4 text-blue-500" /> Download ONNX
                    Weight
                  </a>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-11 text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Model
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete AI Model</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete{" "}
                        <span className="font-bold text-foreground">
                          {model.name}
                        </span>
                        ? This action is permanent and cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-red-500 text-white hover:bg-red-600"
                      >
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </GlassPane>
          </div>
        </div>
      </div>
      <AIModelRetrainDialog
        open={isRetrainDialogOpen}
        onOpenChange={setIsRetrainDialogOpen}
        modelId={modelId}
        initialStartDate={model.trainingStartDate}
        initialEndDate={model.trainingEndDate}
        onSuccess={() => {
          refetchStatus();
          refetchModel();
        }}
      />
    </>
  );
}
