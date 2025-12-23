// file: frontend/src/app/[locale]/(authenticated)/ai-lab/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
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
  const [isRetrainDialogOpen, setIsRetrainDialogOpen] = useState(false);

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
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/ai-lab")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          AI Lab으로 돌아가기
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {model.name}
              </h1>
              <p className="text-muted-foreground">
                {model.modelType.toUpperCase()} · {model.trainingSymbol}
              </p>
            </div>
          </div>

          <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
        </div>
      </div>

      {/* Training Progress (if training) */}
      {(model.status === "training" || model.status === "pending") && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <GlassPane className="p-6 border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                학습 진행 중
              </h2>
              <Button variant="ghost" size="sm" onClick={() => refetchStatus()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {trainingStatus && (
              <>
                <Progress
                  value={trainingStatus.progressPct}
                  className="h-2 mb-2"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {trainingStatus.currentEpoch} / {trainingStatus.totalEpochs}{" "}
                    에폭
                  </span>
                  <span>{trainingStatus.progressPct.toFixed(1)}%</span>
                </div>
                {trainingStatus.errorMessage && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {trainingStatus.errorMessage}
                  </p>
                )}
              </>
            )}
          </GlassPane>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mb-6">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="versions">버전 기록</TabsTrigger>
          <TabsTrigger value="feature-importance">피처 중요도</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6">
            {/* Model Info */}
            <GlassPane className="p-6">
              <h2 className="text-lg font-semibold mb-4">모델 정보</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Target className="h-4 w-4" />
                    <span>타임프레임</span>
                  </div>
                  <span className="font-medium">{model.trainingTimeframe}</span>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Calendar className="h-4 w-4" />
                    <span>학습 기간</span>
                  </div>
                  <span className="font-medium text-sm">
                    {format(new Date(model.trainingStartDate), "yyyy.MM.dd", {
                      locale: ko,
                    })}{" "}
                    -{" "}
                    {format(new Date(model.trainingEndDate), "yyyy.MM.dd", {
                      locale: ko,
                    })}
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Clock className="h-4 w-4" />
                    <span>생성일</span>
                  </div>
                  <span className="font-medium">
                    {format(new Date(model.createdAt), "yyyy.MM.dd HH:mm", {
                      locale: ko,
                    })}
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    {model.isPublic ? (
                      <Globe className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    <span>공개 상태</span>
                  </div>
                  <span className="font-medium">
                    {model.isPublic ? "공개" : "비공개"}
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <RefreshCw className="h-4 w-4" />
                    <span>Auto Retrain</span>
                  </div>
                  <span className="font-medium">
                    {model.isAutoRetrainEnabled
                      ? `${model.retrainIntervalDays}일 주기`
                      : "비활성화"}
                  </span>
                </div>
              </div>
            </GlassPane>

            {/* Feature Configuration */}
            <GlassPane className="p-6">
              <h2 className="text-lg font-semibold mb-4">학습 피처 설정</h2>
              <div className="space-y-4">
                {/* Indicators */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    선택된 지표
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {model.featureConfig?.indicators &&
                    model.featureConfig.indicators.length > 0 ? (
                      model.featureConfig.indicators.map(
                        (
                          ind: { type: string; params?: Record<string, any> },
                          idx: number
                        ) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="font-mono"
                          >
                            {ind.type}
                            {ind.params &&
                              Object.keys(ind.params).length > 0 && (
                                <span className="ml-1 text-xs opacity-70">
                                  (
                                  {Object.entries(ind.params)
                                    .map(([k, v]) => `${k}=${v}`)
                                    .join(", ")}
                                  )
                                </span>
                              )}
                          </Badge>
                        )
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        지표가 설정되지 않았습니다.
                      </span>
                    )}
                  </div>
                </div>

                {/* OHLCV & Returns */}
                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      OHLCV 사용:
                    </span>
                    <Badge
                      variant={
                        model.featureConfig?.useOhlcv ? "default" : "outline"
                      }
                    >
                      {model.featureConfig?.useOhlcv ? "예" : "아니오"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      수익률 피처:
                    </span>
                    <Badge
                      variant={
                        model.featureConfig?.useReturns ? "default" : "outline"
                      }
                    >
                      {model.featureConfig?.useReturns ? "예" : "아니오"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      시퀀스 길이:
                    </span>
                    <span className="font-medium">
                      {model.featureConfig?.sequenceLength || 60}봉
                    </span>
                  </div>
                </div>
              </div>
            </GlassPane>
            {/* Performance Metrics (if completed) */}
            {model.status === "completed" && model.performanceMetrics && (
              <GlassPane className="p-6">
                <h2 className="text-lg font-semibold mb-4">성능 지표</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-emerald-500">
                      {(model.performanceMetrics.accuracy * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      정확도
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-blue-500">
                      {(model.performanceMetrics.f1Score * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      F1 Score
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <div className="text-2xl font-bold text-orange-500">
                      {model.performanceMetrics.validationLoss?.toFixed(4) ||
                        "N/A"}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Validation Loss
                    </div>
                  </div>
                </div>

                {/* Class-wise performance */}
                {model.performanceMetrics.classWiseMetrics && (
                  <div className="mt-6 grid sm:grid-cols-3 gap-4">
                    {["BUY", "HOLD", "SELL"].map((cls) => {
                      const metrics =
                        model.performanceMetrics?.classWiseMetrics?.[
                          cls.toLowerCase()
                        ];
                      if (!metrics) return null;
                      return (
                        <div key={cls} className="p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            {cls === "BUY" && (
                              <TrendingUp className="h-4 w-4 text-emerald-500" />
                            )}
                            {cls === "HOLD" && (
                              <Minus className="h-4 w-4 text-gray-500" />
                            )}
                            {cls === "SELL" && (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className="font-medium">{cls}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Precision
                              </span>
                              <span>
                                {(metrics.precision * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Recall
                              </span>
                              <span>{(metrics.recall * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassPane>
            )}

            {/* Prediction Test (if completed) */}
            {model.status === "completed" && (
              <GlassPane className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">예측 테스트</h2>
                  <Button
                    onClick={handleTestPrediction}
                    disabled={isPredicting}
                  >
                    {isPredicting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    테스트 실행
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  현재 시장 데이터를 기반으로 모델의 예측을 테스트합니다.
                </p>

                {predictionResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={`px-4 py-2 rounded-lg font-bold text-lg ${
                          predictionResult.prediction === "BUY"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : predictionResult.prediction === "SELL"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-gray-500/10 text-gray-600"
                        }`}
                      >
                        {predictionResult.prediction}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        신뢰도: {(predictionResult.confidence * 100).toFixed(1)}
                        %
                      </span>
                    </div>
                    {predictionResult.probabilities && (
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 rounded bg-emerald-500/10">
                          <div className="text-emerald-600 font-medium">
                            BUY
                          </div>
                          <div>
                            {(predictionResult.probabilities.buy * 100).toFixed(
                              1
                            )}
                            %
                          </div>
                        </div>
                        <div className="text-center p-2 rounded bg-gray-500/10">
                          <div className="text-gray-600 font-medium">HOLD</div>
                          <div>
                            {(
                              predictionResult.probabilities.hold * 100
                            ).toFixed(1)}
                            %
                          </div>
                        </div>
                        <div className="text-center p-2 rounded bg-red-500/10">
                          <div className="text-red-600 font-medium">SELL</div>
                          <div>
                            {(
                              predictionResult.probabilities.sell * 100
                            ).toFixed(1)}
                            %
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </GlassPane>
            )}

            {/* Actions */}
            <GlassPane className="p-6">
              <h2 className="text-lg font-semibold mb-4">모델 관리</h2>
              <div className="flex flex-wrap gap-3">
                {model.status === "completed" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        togglePublicMutation.mutate(!model.isPublic)
                      }
                      disabled={togglePublicMutation.isPending}
                    >
                      {model.isPublic ? (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          비공개로 전환
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          공개하기
                        </>
                      )}
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={`/api/ai-models/${modelId}/download`} download>
                        <Download className="h-4 w-4 mr-2" />
                        ONNX 다운로드
                      </a>
                    </Button>
                  </>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      모델 삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>모델 삭제</AlertDialogTitle>
                      <AlertDialogDescription>
                        정말로 이 AI 모델을 삭제하시겠습니까? 이 작업은 되돌릴
                        수 없습니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate()}
                        className="bg-destructive text-destructive-foreground"
                      >
                        삭제
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </GlassPane>
          </div>
        </TabsContent>

        <TabsContent value="versions" className="space-y-6">
          <GlassPane className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">버전 기록</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRetrainDialogOpen(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                재학습 (Manual Retrain)
              </Button>
            </div>
            <AIModelVersionsTable
              modelId={modelId}
              versions={versions || []}
              onVersionActivated={() => {
                refetchVersions();
                queryClient.invalidateQueries({
                  queryKey: ["ai-model", modelId],
                });
              }}
            />
          </GlassPane>
        </TabsContent>

        <AIModelRetrainDialog
          open={isRetrainDialogOpen}
          onOpenChange={setIsRetrainDialogOpen}
          modelId={modelId}
          initialStartDate={model.trainingStartDate}
          initialEndDate={model.trainingEndDate}
          onSuccess={() => {
            refetchStatus();
            // 날짜가 변경되었을 수 있으므로 모델 정보도 갱신
            queryClient.invalidateQueries({ queryKey: ["ai-model", modelId] });
          }}
        />

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
  );
}
