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
  BarChart2,
  ListChecks,
  Sparkles,
  Cpu,
  Zap,
  Trophy,
  Layout,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Separator } from "@/components/ui/Separator";
import { cn } from "@/lib/utils";
import { AIModelFeatureImportance } from "@/components/domain/ai-lab/AIModelFeatureImportance";
import { AIModelVersionsTable } from "@/components/domain/ai-lab/AIModelVersionsTable";
import { AIModelRetrainDialog } from "@/components/domain/ai-lab/AIModelRetrainDialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

import type { AIModelDetail, AITrainingJob } from "@/types/ai";

const STATUS_CONFIG = {
  pending: {
    label: "detail.status.pending",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  training: {
    label: "detail.status.training",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  completed: {
    label: "detail.status.completed",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  failed: {
    label: "detail.status.failed",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

interface PageProps {
  params: { id: string };
}

// --- Training Analysis Components ---

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/90 backdrop-blur-md border border-white/10 p-3 rounded-lg shadow-xl text-xs font-mono">
        <p className="font-bold text-muted-foreground mb-2">Epoch {label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4"
            >
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-bold">
                {entry.name.includes("Accuracy")
                  ? (entry.value * 100).toFixed(2) + "%"
                  : entry.value.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function TrainingAnalysis({ logs }: { logs: any[] }) {
  const t = useTranslations("AILabPage");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  if (!logs || logs.length === 0) {
    return (
      <GlassPane className="p-12 mt-8 text-center bg-muted/5 border-dashed">
        <div className="opacity-40 space-y-3">
          <BarChart2 className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-sm">{t("detail.analysis.noLogs")}</p>
        </div>
      </GlassPane>
    );
  }

  return (
    <GlassPane className="p-6 mt-8 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-violet-400" />
            {t("detail.analysis.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("detail.analysis.subtitle")}
          </p>
        </div>
        <div className="flex bg-muted/30 p-1 rounded-lg self-start">
          <Button
            variant={viewMode === "chart" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("chart")}
            className="h-8 text-[11px] gap-2"
          >
            <BarChart2 className="h-3 w-3" /> {t("detail.analysis.chart")}
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 text-[11px] gap-2"
          >
            <ListChecks className="h-3 w-3" /> {t("detail.analysis.table")}
          </Button>
        </div>
      </div>

      {viewMode === "chart" ? (
        <div className="h-[350px] w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={logs}>
              <defs>
                <linearGradient id="colorTrain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#ffffff10"
              />
              <XAxis
                dataKey="epoch"
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Epoch",
                  position: "insideBottom",
                  offset: -5,
                  fontSize: 10,
                  fill: "#888888",
                }}
              />
              <YAxis
                yAxisId="left"
                stroke="#888888"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 1]}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: "10px", paddingBottom: "20px" }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="trainLoss"
                name="Train Loss"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTrain)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="valLoss"
                name="Val Loss"
                stroke="#ec4899"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVal)"
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              {logs[0]?.accuracy !== undefined && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="accuracy"
                  name="Val Accuracy"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 text-muted-foreground uppercase text-[10px]">
                <th className="text-left py-3 px-4 font-black">Epoch</th>
                <th className="text-right py-3 px-4 font-black">Train Loss</th>
                <th className="text-right py-3 px-4 font-black">Val Loss</th>
                <th className="text-right py-3 px-4 font-black">Accuracy</th>
                <th className="text-right py-3 px-4 font-black">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                >
                  <td className="py-3 px-4 font-bold text-primary">
                    {log.epoch}
                  </td>
                  <td className="text-right py-3 px-4 text-violet-400">
                    {log.trainLoss?.toFixed(6) || "-"}
                  </td>
                  <td className="text-right py-3 px-4 text-fuchsia-400 font-medium">
                    {log.valLoss?.toFixed(6) || "-"}
                  </td>
                  <td className="text-right py-3 px-4">
                    {log.accuracy !== undefined ? (
                      <span className="text-emerald-400 font-bold">
                        {(log.accuracy * 100).toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="text-right py-3 px-4 text-muted-foreground opacity-50 text-[10px]">
                    {format(new Date(log.timestamp), "HH:mm:ss", {
                      locale: ko,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassPane>
  );
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
      toast.success(t("detail.actions.deleteSuccess"));
      router.push("/ai-lab");
    },
    onError: () => {
      toast.error(t("detail.actions.deleteFail"));
    },
  });

  // Toggle public mutation
  const togglePublicMutation = useMutation({
    mutationFn: (isPublic: boolean) => setModelPublic(modelId, isPublic),
    onSuccess: (_, isPublic) => {
      queryClient.invalidateQueries({ queryKey: ["ai-model", modelId] });
      toast.success(
        isPublic
          ? t("detail.actions.publicSuccess")
          : t("detail.actions.privateSuccess")
      );
    },
    onError: () => {
      toast.error(t("detail.actions.updateFail"));
    },
  });

  // Time estimation logic
  const [elapsedTime, setElapsedTime] = useState<string>("--:--");

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (
      (model?.status === "training" || model?.status === "pending") &&
      trainingStatus?.startedAt
    ) {
      const startTime = new Date(trainingStatus.startedAt).getTime();

      interval = setInterval(() => {
        const now = new Date().getTime();
        const diff = Math.max(0, now - startTime);
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setElapsedTime(
          `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`
        );
      }, 1000);
    } else {
      setElapsedTime("--:--");
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [model?.status, trainingStatus?.startedAt]);

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
        error?.response?.data?.detail || t("detail.actions.predictionFail")
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
        <h1 className="text-2xl font-bold mb-4">{t("detail.notFound")}</h1>
        <Button onClick={() => router.push("/ai-lab")}>
          {t("detail.backToLab")}
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
              {t(statusConfig.label as any)}
            </Badge>
            {model.optimizationConfig?.isEnabled && (
              <Badge
                variant="outline"
                className="bg-violet-500/10 text-violet-400 border-violet-500/20 px-3 py-1 flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t("detail.status.optunaOptimized")}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="bg-muted/30 text-muted-foreground border-muted/50 px-3 py-1 flex items-center gap-1.5"
            >
              <Cpu className="h-3.5 w-3.5" />
              {model.trainingSymbol}
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
                    {t("detail.metrics.accuracy")}
                  </span>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Target className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-emerald-500">
                  {(model.performanceMetrics.accuracy * 100).toFixed(1)}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t("detail.metrics.accuracyDesc")}
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
                    {t("detail.metrics.f1Score")}
                  </span>
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-500">
                  {(model.performanceMetrics.f1Score * 100).toFixed(1)}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t("detail.metrics.f1ScoreDesc")}
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
                    {t("detail.metrics.valLoss")}
                  </span>
                  <div className="p-2 bg-violet-500/10 rounded-lg">
                    <Activity className="h-4 w-4 text-violet-500" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-violet-500">
                  {model.performanceMetrics.validationLoss?.toFixed(4) || "N/A"}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t("detail.metrics.valLossDesc")}
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
                    {t("detail.metrics.versions")}
                  </span>
                  <div className="p-2 bg-muted rounded-lg">
                    <HistoryIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {(versions || []).length}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t("detail.metrics.versionsDesc")}
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
            {/* Training Progress (Prominent) */}
            {(model.status === "training" || model.status === "pending") && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <GlassPane
                  className={cn(
                    "p-6 border-blue-500/20 bg-blue-500/5 relative overflow-hidden",
                    trainingStatus?.currentMetrics?.phase === "optimization" &&
                      "border-purple-500/20 bg-purple-500/5"
                  )}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <RefreshCw className="h-24 w-24 animate-spin-slow" />
                  </div>
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Loader2
                        className={cn(
                          "h-5 w-5 animate-spin",
                          trainingStatus?.currentMetrics?.phase ===
                            "optimization" ||
                            (model.optimizationConfig?.isEnabled &&
                              (trainingStatus?.progressPct ?? 0) < 80)
                            ? "text-purple-500"
                            : "text-blue-500"
                        )}
                      />
                      {trainingStatus?.currentMetrics?.phase ===
                        "optimization" ||
                      (model.optimizationConfig?.isEnabled &&
                        trainingStatus &&
                        (trainingStatus.progressPct ?? 0) < 80)
                        ? t("detail.training.optimizationInProgress")
                        : trainingStatus?.currentMetrics?.phase ===
                          "final_training"
                        ? t("detail.training.finalTraining")
                        : t("detail.training.trainingInProgress")}
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchStatus()}
                      className="bg-background/50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />{" "}
                      {t("detail.training.refresh")}
                    </Button>
                  </div>
                  {trainingStatus && (
                    <div className="space-y-6 relative z-10">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {t("detail.training.totalProgress")}
                          </span>
                          <span className="font-mono">
                            {trainingStatus.progressPct.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={trainingStatus.progressPct}
                          className={cn(
                            "h-3",
                            trainingStatus?.currentMetrics?.phase ===
                              "optimization"
                              ? "bg-purple-500/20"
                              : "bg-blue-500/20"
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {trainingStatus.currentMetrics?.phase ===
                          "optimization" ||
                        (model.optimizationConfig?.isEnabled &&
                          (trainingStatus.progressPct ?? 0) < 80) ? (
                          <>
                            <div className="bg-background/40 p-3 rounded-lg border border-purple-500/20">
                              <span className="text-[10px] text-purple-400 uppercase font-bold block mb-1">
                                {t("detail.training.currentTrial")}
                              </span>
                              <span className="text-xl font-bold font-mono">
                                #{trainingStatus.currentMetrics?.trial || 1}{" "}
                                <span className="text-xs text-muted-foreground">
                                  /{" "}
                                  {trainingStatus.currentMetrics?.totalTrials ||
                                    model.optimizationConfig?.nTrials ||
                                    20}
                                </span>
                              </span>
                            </div>
                            <div className="bg-background/40 p-3 rounded-lg border border-purple-500/20">
                              <span className="text-[10px] text-purple-400 uppercase font-bold block mb-1">
                                {t("detail.training.bestMetric", {
                                  metric:
                                    model.optimizationConfig?.maximizeMetric,
                                })}
                              </span>
                              <span className="text-xl font-bold font-mono text-purple-400">
                                {trainingStatus.currentMetrics?.bestValue?.toFixed(
                                  4
                                ) || "0.0000"}
                              </span>
                            </div>
                            <div className="bg-background/40 p-3 rounded-lg border border-purple-500/20">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                                {t("detail.training.elapsedTime")}
                              </span>
                              <span className="text-lg font-bold">
                                {elapsedTime}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-background/40 p-3 rounded-lg border border-white/5">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                                {t("detail.training.currentEpoch")}
                              </span>
                              <span className="text-lg font-bold">
                                {trainingStatus.currentEpoch} /{" "}
                                {trainingStatus.totalEpochs}
                              </span>
                            </div>
                            <div className="bg-background/40 p-3 rounded-lg border border-white/5 md:col-span-2">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                                {t("detail.training.timeElapsed")}
                              </span>
                              <span className="text-lg font-bold">
                                {elapsedTime}
                              </span>
                            </div>
                          </>
                        )}
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
                <TabsTrigger value="overview">
                  {t("detail.tabLabels.overview")}
                </TabsTrigger>
                <TabsTrigger value="versions">
                  {model.optimizationConfig?.isEnabled
                    ? t("detail.tabLabels.trials")
                    : t("detail.tabLabels.versions")}
                </TabsTrigger>
                <TabsTrigger value="feature-importance">
                  {t("detail.tabLabels.featureImportance")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Prediction Playground */}
                {model.status === "completed" && (
                  <GlassPane className="p-0 border-primary/20 bg-primary/5 overflow-hidden">
                    <div className="p-6 border-b border-primary/20 bg-muted/20 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">
                          {t("detail.prediction.title")}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("detail.prediction.subtitle")}
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
                        {t("detail.prediction.run")}
                      </Button>
                    </div>

                    <div className="p-6 min-h-[200px] flex items-center justify-center">
                      {!predictionResult && !isPredicting ? (
                        <div className="text-center space-y-3 opacity-50">
                          <Play className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-sm">
                            {t("detail.prediction.emptyTitle")}
                          </p>
                        </div>
                      ) : isPredicting ? (
                        <div className="text-center space-y-4">
                          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                          <p className="text-sm font-medium animate-pulse">
                            {t("detail.prediction.analyzing")}
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
                                    {t("detail.prediction.confidence")}
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
                                        <span>
                                          {t(
                                            `detail.prediction.${label.toLowerCase()}` as any
                                          )}
                                        </span>
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
                                <TrendingUp className="h-3 w-3" />{" "}
                                {t("detail.prediction.marketContext")}
                              </h4>
                              <div className="flex justify-between pb-2 border-b border-white/5">
                                <span className="text-muted-foreground">
                                  {t("detail.prediction.symbol")}
                                </span>
                                <span>{model.trainingSymbol}</span>
                              </div>
                              <div className="flex justify-between pb-2 border-b border-white/5">
                                <span className="text-muted-foreground">
                                  {t("detail.prediction.timeframe")}
                                </span>
                                <span>{model.trainingTimeframe}</span>
                              </div>
                              <div className="flex justify-between pb-2 border-b border-white/5">
                                <span className="text-muted-foreground">
                                  {t("detail.prediction.source")}
                                </span>
                                <span className="text-emerald-500">
                                  {t("detail.prediction.sourceValue")}
                                </span>
                              </div>
                              <div className="flex justify-between pt-2">
                                <span className="text-muted-foreground">
                                  {t("detail.prediction.timestamp")}
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
                      {t("detail.configDetails.datasetTitle")}
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {/* OHLCV & Sequence Info */}
                    <div className="grid md:grid-cols-3 gap-6 pb-6 border-b border-white/5">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.baseFeatures")}
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
                              ? t("detail.configDetails.enabled")
                              : t("detail.configDetails.disabled")}
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
                              ? t("detail.configDetails.enabled")
                              : t("detail.configDetails.disabled")}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.sequenceLength")}
                        </span>
                        <div className="text-xl font-mono font-bold">
                          {model.featureConfig?.sequenceLength || 60}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {t("detail.configDetails.candles")}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.labelStrategy")}
                        </span>
                        <div className="text-xl font-bold">
                          {t("detail.configDetails.labelStrategyValue")}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            (B/H/S)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Indicators Table-like View */}
                    <div className="space-y-4">
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">
                        {t("detail.configDetails.technicalIndicators")}
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
                            {t("detail.configDetails.noIndicators")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassPane>

                {/* Training & Architecture Config (Hyperparameters) */}
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  {/* Architecture Overview */}
                  <GlassPane className="p-6 border-blue-500/10 hover:border-blue-500/20 transition-all">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                      <Layout className="h-5 w-5 text-blue-400" />
                      {t("detail.configDetails.architectureTitle")}
                    </h3>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.hiddenSize")}
                        </span>
                        <div className="text-xl font-mono font-bold text-blue-400">
                          {model.status !== "completed" &&
                          model.optimizationConfig?.isEnabled ? (
                            <span className="text-sm animate-pulse text-purple-400 italic">
                              {t("detail.configDetails.searching")}
                            </span>
                          ) : (
                            model.architectureConfig?.hiddenSize || 64
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.layers")}
                        </span>
                        <div className="text-xl font-mono font-bold text-blue-400">
                          {model.status !== "completed" &&
                          model.optimizationConfig?.isEnabled ? (
                            <span className="text-sm animate-pulse text-purple-400 italic">
                              {t("detail.configDetails.searching")}
                            </span>
                          ) : (
                            model.architectureConfig?.numLayers || 2
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.dropout")}
                        </span>
                        <div className="text-xl font-mono font-bold text-blue-400">
                          {model.status !== "completed" &&
                          model.optimizationConfig?.isEnabled ? (
                            <span className="text-sm animate-pulse text-purple-400 italic">
                              {t("detail.configDetails.searching")}
                            </span>
                          ) : (
                            `${(
                              (model.architectureConfig?.dropout || 0) * 100
                            ).toFixed(2)}%`
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.bidirectional")}
                        </span>
                        <div className="text-lg font-bold">
                          {model.status !== "completed" &&
                          model.optimizationConfig?.isEnabled ? (
                            <span className="text-sm animate-pulse text-purple-400 italic">
                              {t("detail.configDetails.searching")}
                            </span>
                          ) : model.architectureConfig?.bidirectional ? (
                            t("detail.configDetails.enabled")
                          ) : (
                            t("detail.configDetails.disabled")
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassPane>

                  {/* Hyperparameters Config */}
                  <GlassPane className="p-6 border-amber-500/10 hover:border-amber-500/20 transition-all">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                      <Zap className="h-5 w-5 text-amber-400" />
                      {t("detail.configDetails.hyperparametersTitle")}
                    </h3>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.epochsBatch")}
                        </span>
                        <div className="text-xl font-mono font-bold text-amber-400">
                          {model.status !== "completed" &&
                          model.optimizationConfig?.isEnabled ? (
                            <>
                              {model.optimizationConfig?.maxEpochsPerTrial ||
                                30}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                /
                              </span>{" "}
                              <span className="text-sm animate-pulse text-purple-400 italic">
                                ...
                              </span>
                            </>
                          ) : (
                            <>
                              {model.trainingConfig?.epochs}{" "}
                              <span className="text-xs font-normal text-muted-foreground">
                                /
                              </span>{" "}
                              {model.trainingConfig?.batchSize}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.learningRate")}
                        </span>
                        <div className="text-xl font-mono font-bold text-amber-400">
                          {model.status !== "completed" &&
                          model.optimizationConfig?.isEnabled ? (
                            <span className="text-sm animate-pulse text-purple-400 italic font-sans font-normal">
                              {t("detail.configDetails.autoTuning")}
                            </span>
                          ) : (
                            model.trainingConfig?.learningRate?.toFixed(6)
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.patience")}
                        </span>
                        <div className="text-xl font-mono font-bold text-amber-400">
                          {model.status !== "completed" &&
                          model.optimizationConfig?.isEnabled ? (
                            <>
                              5{" "}
                              <span className="text-xs font-normal text-muted-foreground text-amber-400/70">
                                eps
                              </span>
                            </>
                          ) : (
                            <>
                              {model.trainingConfig?.earlyStoppingPatience}{" "}
                              <span className="text-xs font-normal text-muted-foreground text-amber-400/70">
                                eps
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                          {t("detail.configDetails.valSplit")}
                        </span>
                        <div className="text-xl font-mono font-bold text-amber-400">
                          {(model.trainingConfig?.validationSplit || 0.2) * 100}
                          %
                        </div>
                      </div>
                    </div>
                  </GlassPane>
                </div>

                {/* Training Analysis (Epoch Logs) */}
                <TrainingAnalysis
                  logs={
                    (model.status === "training" || model.status === "pending"
                      ? trainingStatus?.epochLogs
                      : model.latestTrainingJob?.epochLogs) || []
                  }
                />
              </TabsContent>

              <TabsContent value="versions" className="space-y-8">
                {/* Optimization Trials (if available) */}
                {model.optimizationConfig?.isEnabled && (
                  <GlassPane className="p-0 overflow-hidden border-purple-500/20 bg-purple-500/5">
                    <div className="p-6 border-b border-purple-500/20 flex justify-between items-center bg-purple-500/10">
                      <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-500" />
                          {t("detail.optimizationResults.title")}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("detail.optimizationResults.desc")}
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground border-b">
                          <tr>
                            <th className="px-6 py-3">
                              {t("detail.optimizationResults.rank")}
                            </th>
                            <th className="px-6 py-3">
                              {t("detail.optimizationResults.hiddenLayers")}
                            </th>
                            <th className="px-6 py-3">
                              {t("detail.optimizationResults.learningRate")}
                            </th>
                            <th className="px-6 py-3">
                              {t("detail.optimizationResults.batchSize")}
                            </th>
                            <th className="px-6 py-3">
                              {t("detail.optimizationResults.value")} (
                              {model.optimizationConfig?.maximizeMetric ||
                                "Metric"}
                              )
                            </th>
                            <th className="px-6 py-3">
                              {t("detail.optimizationResults.status")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {(
                            trainingStatus?.optimizationResult?.all_trials ||
                            model.latestTrainingJob?.optimizationResult
                              ?.all_trials ||
                            []
                          )
                            .filter((t: any) => t.state === "COMPLETE")
                            .sort((a: any, b: any) => b.value - a.value)
                            .slice(0, 5)
                            .map((trial: any, idx: number) => (
                              <tr
                                key={trial.number}
                                className={cn(
                                  "hover:bg-white/5 transition-colors",
                                  idx === 0 && "bg-yellow-500/5"
                                )}
                              >
                                <td className="px-6 py-4 font-bold">
                                  {idx === 0 ? "🏆 #1" : `#${idx + 1}`}
                                </td>
                                <td className="px-6 py-4 font-mono">
                                  {trial.params?.hidden_size} /{" "}
                                  {trial.params?.num_layers}
                                </td>
                                <td className="px-6 py-4 font-mono text-xs">
                                  {trial.params?.learning_rate?.toFixed(6)}
                                </td>
                                <td className="px-6 py-4 font-mono">
                                  {trial.params?.batch_size}
                                </td>
                                <td className="px-6 py-4 font-bold text-purple-400">
                                  {trial.value?.toFixed(4)}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-[10px] font-bold">
                                    {trial.state}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          {!trainingStatus?.optimizationResult?.all_trials &&
                            !model.latestTrainingJob?.optimizationResult
                              ?.all_trials && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="px-6 py-12 text-center text-muted-foreground italic"
                                >
                                  {model.status === "training"
                                    ? t("detail.optimizationResults.exploring")
                                    : t("detail.optimizationResults.noTrials")}
                                </td>
                              </tr>
                            )}
                        </tbody>
                      </table>
                    </div>
                  </GlassPane>
                )}

                {/* Version History - Hide when optimization is enabled (showing trial results instead) */}
                {!model.optimizationConfig?.isEnabled && (
                  <GlassPane className="p-0 overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center bg-muted/10">
                      <h2 className="text-lg font-bold">
                        {t("detail.versions.history")}
                      </h2>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRetrainDialogOpen(true)}
                        className="gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />{" "}
                        {t("detail.versions.manualRetrain")}
                      </Button>
                    </div>
                    {versions && (
                      <div className="p-6">
                        <AIModelVersionsTable
                          modelId={modelId}
                          versions={versions}
                          onVersionActivated={() => {
                            refetchModel();
                            queryClient.invalidateQueries({
                              queryKey: ["ai-model-versions", modelId],
                            });
                          }}
                          isOptimized={model.optimizationConfig?.isEnabled}
                        />
                      </div>
                    )}
                  </GlassPane>
                )}
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
                {t("detail.config.title")}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                      {t("detail.config.trainingPeriod")}
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
                      {t("detail.config.createdOn")}
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
                      {t("detail.config.autoRetraining")}
                    </span>
                    <span className="text-sm font-medium">
                      {model.isAutoRetrainEnabled
                        ? t("detail.config.intervalDays", {
                            days: model.retrainIntervalDays,
                          })
                        : t("detail.config.disabled")}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-foreground">
                  {t("detail.config.features")}
                </h4>
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
                {t("detail.management.title")}
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
                      <Lock className="h-4 w-4 text-violet-500" />{" "}
                      {t("detail.management.switchToPrivate")}
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 text-emerald-500" />{" "}
                      {t("detail.management.makePublic")}
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-11"
                  asChild
                >
                  <a href={`/api/ai-models/${modelId}/download`} download>
                    <Download className="h-4 w-4 text-blue-500" />{" "}
                    {t("detail.management.downloadOnnx")}
                  </a>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-3 h-11 text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />{" "}
                      {t("detail.management.deleteModel")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("detail.management.deleteDialog.title")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("detail.management.deleteDialog.description", {
                          name: model.name,
                        })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("detail.management.deleteDialog.cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-red-500 text-white hover:bg-red-600"
                      >
                        {t("detail.management.deleteDialog.confirm")}
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
