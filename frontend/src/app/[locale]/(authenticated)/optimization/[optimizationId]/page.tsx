// file: frontend/src/app/[locale]/(authenticated)/optimization/[optimizationId]/page.tsx

"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AreaData, UTCTimestamp } from "lightweight-charts";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Loader2,
  Calendar,
  Repeat,
  CheckCircle,
  Zap,
  BarChartHorizontal,
  Target,
  Settings,
  List,
  BarChart,
  ArrowUpRight,
  Download,
  Filter,
  Layers,
  TriangleAlert,
  Clock,
  AlertCircle,
  XCircle,
} from "lucide-react";

import apiClient from "@/lib/apiClient";
import {
  OptimizationJobDetail,
  OptimizationType,
  TrialData,
} from "@/types/optimization";
import { cn } from "@/lib/utils";
import { useExport } from "@/hooks/useExport";

// --- UI Components ---
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Separator } from "@/components/ui/Separator";
import { Label } from "@/components/ui/Label";
import { Slider } from "@/components/ui/Slider";
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

// --- Domain Components (외부 파일로 분리된 경우 임포트) ---
import { OOSPerformanceChart } from "@/components/domain/optimization/OOSPerformanceChart";
import { ParameterStabilityChart } from "@/components/domain/optimization/ParameterStabilityChart";
import { ParameterImportanceChart } from "@/components/domain/optimization/ParameterImportanceChart";
import { ParallelCoordinatesChart } from "@/components/domain/optimization/ParallelCoordinatesChart";
import { TrialsTable } from "@/components/domain/optimization/TrialsTable";

// ============================================================================
// 하위 컴포넌트 정의 (파일 내 포함)
// ============================================================================

// --- 1. 페이지 헤더 ---
const PageHeader = ({ job }: { job: OptimizationJobDetail }) => {
  const t = useTranslations("OptimizationDetailPage.Header");
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleRerun = () => {
    router.push(`/optimization/new?rerun_id=${job.id}`);
  };

  const applyStrategyMutation = useMutation({
    mutationFn: async () => {
      if (!job.bestTrial) throw new Error(t("errorNoBestTrial"));
      await apiClient.patch(`/strategies/${job.strategy.id}/parameters`, {
        optimizationId: job.id,
        trialId: job.bestTrial.trialId,
      });
    },
    onSuccess: () => {
      toast.success(t("applySuccess"), {
        description: t("applySuccessDescription", {
          strategyName: job.strategy.name,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: ["strategyDetail", job.strategy.id],
      });
    },
    onError: (err: any) => {
      toast.error(t("applyError"), {
        description: err?.response?.data?.detail || err.message,
      });
    },
  });

  const typeConfig = {
    general: {
      label: t("typeGeneral"),
      Icon: Zap,
      className:
        "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
    },
    wfo: {
      label: t("typeWfo"),
      Icon: BarChartHorizontal,
      className:
        "bg-teal-500/20 text-teal-700 dark:text-teal-400 border-teal-500/30",
    },
  };

  const statusConfig = {
    running: {
      icon: Loader2,
      text: t("statusRunning"),
      className: "text-blue-500 animate-spin",
    },
    pending: {
      icon: Clock,
      text: t("statusPending"),
      className: "text-yellow-500",
    },
    completed: {
      icon: CheckCircle,
      text: t("statusCompleted"),
      className: "text-emerald-500",
    },
    failed: {
      icon: AlertCircle,
      text: t("statusFailed"),
      className: "text-destructive",
    },
    canceled: {
      icon: XCircle,
      text: t("statusCanceled"),
      className: "text-muted-foreground",
    },
  };

  const currentType = typeConfig[job.type as OptimizationType];
  const currentStatus = statusConfig[job.status];
  const isRunning = job.status === "running" || job.status === "pending";
  const canApply = job.status === "completed" && !!job.bestTrial;

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {job.strategy?.name || t("unknownStrategy")}
          </h1>
          <Badge
            variant="outline"
            className={cn("flex items-center gap-1.5", currentType.className)}
          >
            <currentType.Icon className="h-3.5 w-3.5" />
            {currentType.label}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(job.createdAt), "yyyy-MM-dd HH:mm")}
          </div>
          <div
            className={cn("flex items-center gap-1.5", currentStatus.className)}
          >
            <currentStatus.icon className="h-4 w-4" />
            <span>{currentStatus.text}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRerun}
          disabled={isRunning}
        >
          <Repeat className="mr-2 h-4 w-4" />
          {t("rerun")}
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => applyStrategyMutation.mutate()}
                  disabled={!canApply || applyStrategyMutation.isPending}
                >
                  {applyStrategyMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Target className="mr-2 h-4 w-4" />
                  )}
                  {t("applyToStrategy")}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {!canApply
                  ? t("applyDisabledTooltip")
                  : t("applyEnabledTooltip")}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

// --- 2. 설정 요약 카드 ---
const ConfigSummaryCard = ({
  config,
  type,
}: {
  config: OptimizationJobDetail["config"];
  type: OptimizationType;
}) => {
  const t = useTranslations("OptimizationDetailPage.ConfigSummary");
  const tObj = useTranslations("OptimizationSetupForm.objectives");

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("objective")}</span>
          <span className="font-medium text-primary">
            {tObj.has(config.objective)
              ? tObj(config.objective)
              : config.objective}
          </span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("period")}</span>
          <span className="font-mono text-xs">
            {format(new Date(config.dateRange.from), "yy.MM.dd")} ~{" "}
            {format(new Date(config.dateRange.to), "yy.MM.dd")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("initialCapital")}</span>
          <span className="font-mono">
            ${config.initialCapital.toLocaleString()}
          </span>
        </div>
        {type === "wfo" && config.wfoSettings && (
          <>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("wfoFolds")}</span>
              <span className="font-medium">
                {config.wfoSettings.folds} {t("foldsUnit")}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// --- 3. 최고의 결과 카드 ---
const BestResultCard = ({
  bestTrial,
}: {
  bestTrial: OptimizationJobDetail["bestTrial"];
}) => {
  const t = useTranslations("OptimizationDetailPage.BestResult");

  if (!bestTrial) {
    return (
      <Card className="h-full flex flex-col items-center justify-center p-6 bg-muted/30 border-dashed">
        <Target className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm font-medium">
          {t("noResultYet")}
        </p>
      </Card>
    );
  }

  const { metrics, params, trialId } = bestTrial;

  const getScoreColor = (score?: number | null) => {
    if (score == null) return "text-muted-foreground";
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <Card className="h-full flex flex-col border-primary/20 shadow-sm">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <Target className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <Badge variant="outline" className="bg-background font-mono">
            Trial #{trialId}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-6 items-center">
          <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-xl border">
            <span className="text-sm font-medium text-muted-foreground mb-1">
              Cortex Score
            </span>
            <span
              className={cn(
                "text-4xl font-extrabold flex items-baseline gap-1",
                getScoreColor(metrics.backtestScore)
              )}
            >
              {metrics.backtestScore?.toFixed(0) ?? "N/A"}
              <span className="text-base font-normal text-muted-foreground/70">
                /100
              </span>
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {t("totalReturn")}
              </span>
              <span className="font-bold font-mono text-base text-emerald-500">
                {metrics.totalReturnPct?.toFixed(2) ?? "-"}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("mdd")}</span>
              <span className="font-medium font-mono text-rose-500">
                {metrics.mddPct?.toFixed(2) ?? "-"}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                {t("winRate")}
              </span>
              <span className="font-medium font-mono">
                {metrics.winRatePct?.toFixed(1) ?? "-"}%
              </span>
            </div>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col flex-grow min-h-0">
          <h4 className="text-sm font-semibold mb-3">{t("foundParameters")}</h4>
          <ScrollArea className="h-[150px] rounded-md border bg-muted/30 p-3">
            <div className="space-y-2 text-xs">
              {Object.entries(params).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between items-center py-1 border-b border-dashed last:border-0"
                >
                  <span
                    className="text-muted-foreground truncate mr-2 max-w-[180px]"
                    title={key}
                  >
                    {key.split(".").slice(-2).join(".")}
                  </span>
                  <Badge variant="secondary" className="font-mono shrink-0">
                    {String(value)}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 py-3">
        <Button variant="primary" className="w-full" asChild>
          <Link href={`/backtester/${trialId}`} target="_blank">
            {t("viewDetails")}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

// ============================================================================
// 메인 페이지 컴포넌트
// ============================================================================

export default function OptimizationDetailPage({
  params,
}: {
  params: { optimizationId: string };
}) {
  const t = useTranslations("OptimizationDetailPage");
  const { optimizationId } = params;
  const queryClient = useQueryClient();
  const { downloadCSV } = useExport();

  // --- 상태 관리 ---
  const [minScore, setMinScore] = useState([0]);
  const [hoveredTrialId, setHoveredTrialId] = useState<number | null>(null);

  // 1. 데이터 페칭
  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useQuery<OptimizationJobDetail>({
    queryKey: ["optimizationDetail", optimizationId],
    queryFn: async () =>
      (await apiClient.get(`/optimizations/${optimizationId}`)).data,
    refetchOnWindowFocus: false,
  });

  // 2. 실시간 업데이트 (WebSocket)
  useEffect(() => {
    if (job && (job.status === "running" || job.status === "pending")) {
      const wsUrl = process.env.NEXT_PUBLIC_API_URL!.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsUrl}/ws/optimization/${optimizationId}`);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          queryClient.setQueryData(
            ["optimizationDetail", optimizationId],
            (old: any) => {
              if (!old) return old;
              const updated = { ...old, ...message };
              if (
                message.status === "completed" &&
                old.status !== "completed"
              ) {
                queryClient.invalidateQueries({
                  queryKey: ["optimizationDetail", optimizationId],
                });
              }
              return updated;
            }
          );
        } catch (e) {
          console.error("WS message parse error", e);
        }
      };

      return () => ws.close();
    }
  }, [job?.status, optimizationId, queryClient]);

  // 3. 더미 데이터 생성 (API 연동 전 테스트용 - 실제 배포 시 제거 또는 주석 처리)
  const mockTrials = useMemo(() => {
    if (!job?.bestTrial) return [];
    return Array.from({ length: 300 }).map((_, i) => ({
      ...job.bestTrial!,
      trialId: i + 1,
      metrics: {
        ...job.bestTrial!.metrics,
        backtestScore: Math.random() * 100,
        totalReturnPct: (Math.random() - 0.2) * 100,
        mddPct: Math.random() * -30,
      },
      params: {
        "rsi.period": Math.floor(Math.random() * 20) + 10,
        stopLossPct: +(Math.random() * 5 + 1).toFixed(1),
        "ema.length": Math.floor(Math.random() * 50) + 10,
      },
      state: Math.random() > 0.8 ? "PRUNED" : "COMPLETE",
      createdAt: new Date().toISOString(),
    })) as any[];
  }, [job]);

  // 4. 데이터 필터링
  // TODO: 실제 배포 시에는 'job?.trials || []' 로 변경해야 합니다.
  const allTrials: TrialData[] = useMemo(
    () => job?.trials || [],
    [job?.trials]
  );

  const filteredTrials = useMemo(() => {
    if (minScore[0] === 0) return allTrials;
    // 이제 trial은 자동으로 TrialData 타입으로 추론됩니다.
    return allTrials.filter(
      (trial) => (trial.metrics.backtestScore ?? 0) >= minScore[0]
    );
  }, [allTrials, minScore]);

  // 5. 내보내기 핸들러
  const handleExport = () => {
    if (filteredTrials.length === 0) {
      toast.error(t("DetailedAnalysis.noDataToExport"));
      return;
    }
    downloadCSV(
      filteredTrials,
      `optimization_${optimizationId}_${format(new Date(), "yyyyMMdd_HHmm")}`
    );
    toast.success(
      t("DetailedAnalysis.exportSuccess", { count: filteredTrials.length })
    );
  };

  // --- 렌더링: 로딩 및 에러 ---
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8 max-w-screen-xl">
        <div className="flex justify-between">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] col-span-1" />
          <Skeleton className="h-[400px] col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="container mx-auto py-8 max-w-screen-xl">
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>
            {(error as any)?.message || t("errorMessage")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 space-y-8">
      {/* 1. 헤더 */}
      <PageHeader job={job} />

      {/* 2. 진행률 */}
      {(job.status === "running" || job.status === "pending") &&
        job.progress && (
          <Card className="bg-primary/5 border-primary/20 animate-pulse-subtle">
            <CardContent className="py-4 flex items-center justify-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="space-y-0.5 text-center">
                <p className="font-medium text-primary">
                  {job.status === "pending"
                    ? t("statusPending")
                    : t("processingTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {job.progress.current_step} / {job.progress.total_steps}{" "}
                  {t("trialsCompleted")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {/* 3. 요약 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ConfigSummaryCard config={job.config} type={job.type} />
        </div>
        <div className="lg:col-span-2">
          <BestResultCard bestTrial={job.bestTrial} />
        </div>
      </div>

      {/* 4. WFO 전용 섹션 (Tier 1) */}
      {job.type === "wfo" && job.status === "completed" && job.wfoResult && (
        <>
          <Separator className="my-2" />
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-teal-500" />
              <h2 className="text-2xl font-bold">
                {t("WfoAnalysis.sectionTitle")}
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[400px]">
                <OOSPerformanceChart
                  oosCurveData={
                    job.wfoResult.oosCurveJson as AreaData<UTCTimestamp>[]
                  }
                />
              </div>
              <div className="h-[400px]">
                <ParameterStabilityChart folds={job.wfoResult.folds} />
              </div>
            </div>
          </section>
        </>
      )}

      {/* 5. 상세 분석 섹션 (Tier 2) */}
      {job.status === "completed" && (
        <>
          <Separator className="my-2" />
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <BarChart className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">
                  {t("DetailedAnalysis.sectionTitle")}
                </h2>
              </div>

              {/* 필터링 및 내보내기 컨트롤 */}
              <div className="flex flex-wrap items-center gap-4 bg-muted/40 p-2 pl-4 pr-2 rounded-lg border w-full md:w-auto">
                <div className="flex items-center gap-3 flex-1 md:flex-none min-w-[240px]">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Label className="text-sm whitespace-nowrap flex-1 flex justify-between">
                    <span>{t("DetailedAnalysis.minScoreFilter")}</span>
                    <span className="font-mono font-bold text-primary ml-2 w-8 text-right">
                      {minScore[0]}
                    </span>
                  </Label>
                  <Slider
                    value={minScore}
                    onValueChange={setMinScore}
                    max={90}
                    step={5}
                    className="w-[100px] shrink-0"
                  />
                </div>
                <Separator
                  orientation="vertical"
                  className="h-6 hidden md:block"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="h-9 gap-1.5 flex-1 md:flex-none"
                  disabled={filteredTrials.length === 0}
                >
                  <Download className="h-4 w-4" />
                  <span>CSV ({filteredTrials.length})</span>
                </Button>
              </div>
            </div>

            {/* 분석 탭 (차트 / 테이블) */}
            <Tabs defaultValue="charts" className="w-full">
              <TabsList className="grid w-full md:w-auto grid-cols-2 md:inline-grid">
                <TabsTrigger value="charts" className="gap-2">
                  <BarChartHorizontal className="h-4 w-4" />
                  {t("DetailedAnalysis.tabs.charts")}
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-2">
                  <List className="h-4 w-4" />
                  {t("DetailedAnalysis.tabs.trials")}
                </TabsTrigger>
              </TabsList>

              {/* 탭 1: 차트 */}
              <TabsContent
                value="charts"
                className="mt-6 space-y-8 animate-in fade-in-50"
              >
                <div className="h-[500px]">
                  <ParallelCoordinatesChart
                    trials={filteredTrials}
                    hoveredTrialId={hoveredTrialId}
                    onHoverTrial={setHoveredTrialId}
                  />
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="h-[500px]">
                    <ParameterImportanceChart data={job.parameterImportance} />
                  </div>
                </div>
              </TabsContent>

              {/* 탭 2: 데이터 테이블 */}
              <TabsContent value="table" className="mt-6 animate-in fade-in-50">
                <div className="h-[800px]">
                  <TrialsTable
                    trials={filteredTrials}
                    hoveredTrialId={hoveredTrialId}
                    onHoverTrial={setHoveredTrialId}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </section>
        </>
      )}
    </div>
  );
}
