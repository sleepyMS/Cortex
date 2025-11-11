// file: frontend/src/app/[locale]/(authenticated)/optimization/[optimizationId]/page.tsx

"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  TriangleAlert,
  BarChartHorizontal,
  BarChart,
  List,
  Filter,
  Download,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import apiClient from "@/lib/apiClient";
import { OptimizationJobDetail, TrialData } from "@/types/optimization";
import { useExport } from "@/hooks/useExport";

// --- UI Components ---
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Separator } from "@/components/ui/Separator";
import { Label } from "@/components/ui/Label";
import { Slider } from "@/components/ui/Slider";
import { Badge } from "@/components/ui/Badge";

// --- Domain Components ---
import { OptimizationHeader } from "@/components/domain/optimization/OptimizationHeader";
import { ConfigSummaryCard } from "@/components/domain/optimization/ConfigSummaryCard";
import { BestResultCard } from "@/components/domain/optimization/BestResultCard";
import { OOSPerformanceChart } from "@/components/domain/optimization/OOSPerformanceChart";
import { ParameterStabilityChart } from "@/components/domain/optimization/ParameterStabilityChart";
import { ParameterImportanceChart } from "@/components/domain/optimization/ParameterImportanceChart";
import { ParallelCoordinatesChart } from "@/components/domain/optimization/ParallelCoordinatesChart";
import { TrialsTable } from "@/components/domain/optimization/TrialsTable";
import { WFOPerformanceSummary } from "@/components/domain/optimization/WFOPerformanceSummary";

interface OptimizationDetailPageProps {
  params: { optimizationId: string };
}

export default function OptimizationDetailPage({
  params,
}: OptimizationDetailPageProps) {
  const t = useTranslations("OptimizationDetailPage");
  const { optimizationId } = params;
  const queryClient = useQueryClient();
  const { downloadCSV } = useExport();

  // --- 상태 관리 ---
  // 필터링을 위한 최소 점수 (Slider용)
  const [minScore, setMinScore] = useState([0]);
  // 크로스 하이라이팅을 위한 현재 호버된 Trial ID
  const [hoveredTrialId, setHoveredTrialId] = useState<number | null>(null);
  // 내보내기 로딩 상태
  const [isExporting, setIsExporting] = useState(false);

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
            (old: OptimizationJobDetail | undefined) => {
              if (!old) return old;
              const updated = {
                ...old,
                status: message.status || old.status,
                progress: message.progress
                  ? { ...old.progress, ...message.progress }
                  : old.progress,
              };

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

  // 3. 데이터 필터링 로직 (차트 및 내보내기용)
  // job.trials가 존재한다고 가정합니다. (백엔드 서비스에서 selectinload로 로드됨)
  const allTrials = useMemo(() => job?.trials || [], [job?.trials]);

  // [중요] 이 부분이 누락되어 에러가 발생했었습니다. 다시 추가합니다.
  const filteredTrials = useMemo(() => {
    if (minScore[0] === 0) return allTrials;
    return allTrials.filter(
      (trial) => (trial.metrics?.backtestScore ?? 0) >= minScore[0]
    );
  }, [allTrials, minScore]);

  // 4. 데이터 내보내기 핸들러 (온디맨드 방식)
  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.info(t("DetailedAnalysis.exportStarted"));

      // 현재 필터 조건으로 서버에 '전체' 데이터 요청 (대용량 대응)
      const response = await apiClient.get(
        `/optimizations/${optimizationId}/trials`,
        {
          params: {
            page: 1,
            limit: 100000, // 충분히 큰 수로 설정하여 전체 데이터를 한 번에 요청
            min_score: minScore[0] > 0 ? minScore[0] : undefined,
          },
        }
      );

      const trialsToExport = response.data.items;

      if (!trialsToExport || trialsToExport.length === 0) {
        toast.warning(t("DetailedAnalysis.noDataToExport"));
        return;
      }

      const timestamp = format(new Date(), "yyyyMMdd_HHmm");
      downloadCSV(
        trialsToExport,
        `optimization_${optimizationId}_${timestamp}`
      );
      toast.success(
        t("DetailedAnalysis.exportSuccess", { count: trialsToExport.length })
      );
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(t("DetailedAnalysis.exportFailed"));
    } finally {
      setIsExporting(false);
    }
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
          <Skeleton className="h-[300px] col-span-1" />
          <Skeleton className="h-[300px] col-span-2" />
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

  const strategyForLabels = job.strategySnapshot || job.strategy;

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 space-y-8">
      {/* 1. 헤더 */}
      <OptimizationHeader job={job} />

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
                  {job.progress.currentStep} / {job.progress.totalSteps}{" "}
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
          {job.type === "wfo" ? (
            // WFO일 때는 구간별 요약 표시
            <WFOPerformanceSummary folds={job.wfoResult?.folds} />
          ) : (
            // 일반 최적화일 때는 기존 Best Trial 표시
            <BestResultCard
              bestTrial={job.bestTrial}
              strategy={strategyForLabels}
            />
          )}
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
                  oosCurveData={job.wfoResult.oosCurveJson as any}
                />
              </div>
              <div className="h-[400px]">
                <ParameterStabilityChart
                  folds={job.wfoResult.folds}
                  strategy={strategyForLabels}
                />
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
                  disabled={isExporting || allTrials.length === 0}
                >
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>CSV</span>
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
                  {/* 필터링된 데이터를 차트에 전달 */}
                  <ParallelCoordinatesChart
                    trials={filteredTrials}
                    hoveredTrialId={hoveredTrialId}
                    onHoverTrial={setHoveredTrialId}
                    strategy={strategyForLabels}
                  />
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div className="h-[500px]">
                    <ParameterImportanceChart
                      data={job.parameterImportance}
                      strategy={strategyForLabels}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* 탭 2: 데이터 테이블 */}
              <TabsContent value="table" className="mt-6 animate-in fade-in-50">
                <Card className="h-[800px]">
                  <CardContent className="p-0 h-full">
                    {/* 테이블은 서버 사이드 페이지네이션을 사용하되, 필터 조건(minScore)은 전달 */}
                    <TrialsTable
                      jobId={optimizationId}
                      hoveredTrialId={hoveredTrialId}
                      onHoverTrial={setHoveredTrialId}
                      minScore={minScore[0]}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>
        </>
      )}
    </div>
  );
}
