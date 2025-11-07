// file: frontend/src/app/[locale]/(authenticated)/optimization/[optimizationId]/page.tsx

"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Loader2,
  Info,
  TriangleAlert,
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
} from "lucide-react";

import apiClient from "@/lib/apiClient";
import { Strategy } from "@/types/strategy";
import { cn } from "@/lib/utils";

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
import { BacktestResultSummary } from "@/components/domain/backtesting/BacktestResultSummary"; // 기존 컴포넌트 재사용

// --- (임시) 타입 정의: 실제 프로젝트에서는 @/types/optimization.ts 등으로 분리 권장 ---
interface OptimizationJobDetail {
  id: string;
  status: "completed" | "running" | "pending" | "failed" | "canceled";
  type: "general" | "wfo";
  strategy: Strategy;
  config: {
    objective: string;
    dateRange: { from: string; to: string };
    initialCapital: number;
    // ... 기타 설정
  };
  progress?: { current_step: number; total_steps: number };
  bestTrial?: {
    trialId: number;
    params: Record<string, any>;
    metrics: any; // BacktestResult 타입
  };
  wfoResult?: {
    oosCurveJson: any[];
    // ... 기타 WFO 데이터
  };
  createdAt: string;
  completedAt?: string;
  usedCredits?: number;
}

// --- 하위 컴포넌트: 페이지 헤더 ---
const PageHeader = ({ job }: { job: OptimizationJobDetail }) => {
  const t = useTranslations("OptimizationDetailPage.Header");
  const router = useRouter();
  const queryClient = useQueryClient();

  // 재실행 핸들러
  const handleRerun = () => {
    router.push(`/optimization/new?rerun_id=${job.id}`);
  };

  // '전략에 적용' 뮤테이션
  const applyStrategyMutation = useMutation({
    mutationFn: async () => {
      if (!job.bestTrial) throw new Error("No best trial to apply");
      // 백엔드 API: 최적 파라미터로 전략 업데이트 요청
      return apiClient.patch(`/strategies/${job.strategy.id}/parameters`, {
        optimizationId: job.id,
        trialId: job.bestTrial.trialId,
      });
    },
    onSuccess: () => {
      toast.success(t("applySuccess"));
      queryClient.invalidateQueries({
        queryKey: ["strategyDetail", job.strategy.id],
      });
    },
    onError: (err) => {
      toast.error(t("applyError", { error: (err as any).message }));
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
  const currentType = typeConfig[job.type];

  const isRunning = job.status === "running" || job.status === "pending";

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {job.strategy?.name || t("unknownStrategy")}
          </h1>
          <Badge
            variant="outline"
            className={cn("flex items-center gap-1", currentType.className)}
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
          {job.status === "completed" && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              {t("statusCompleted")}
            </div>
          )}
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
        <Button
          variant="primary"
          size="sm"
          onClick={() => applyStrategyMutation.mutate()}
          disabled={
            isRunning || !job.bestTrial || applyStrategyMutation.isPending
          }
        >
          {applyStrategyMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Target className="mr-2 h-4 w-4" />
          )}
          {t("applyToStrategy")}
        </Button>
      </div>
    </div>
  );
};

// --- 하위 컴포넌트: 설정 요약 카드 ---
const ConfigSummaryCard = ({
  config,
}: {
  config: OptimizationJobDetail["config"];
}) => {
  const t = useTranslations("OptimizationDetailPage.ConfigSummary");
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("objective")}</span>
          <span className="font-medium">{config.objective}</span>
        </div>
        <Separator />
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("period")}</span>
          <span className="font-medium">
            {format(new Date(config.dateRange.from), "yy.MM.dd")} -{" "}
            {format(new Date(config.dateRange.to), "yy.MM.dd")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("initialCapital")}</span>
          <span className="font-medium">
            ${config.initialCapital.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// --- 하위 컴포넌트: 최고의 결과 카드 ---
const BestResultCard = ({
  bestTrial,
}: {
  bestTrial: OptimizationJobDetail["bestTrial"];
}) => {
  const t = useTranslations("OptimizationDetailPage.BestResult");

  if (!bestTrial) {
    return (
      <Card className="h-full flex items-center justify-center p-6 bg-muted/30 border-dashed">
        <p className="text-muted-foreground text-sm">{t("noResultYet")}</p>
      </Card>
    );
  }

  return (
    <Card className="h-full border-primary/50 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <Target className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <Badge variant="secondary">Trial #{bestTrial.trialId}</Badge>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* 핵심 지표 요약 (기존 BacktestResultSummary 재사용 가능하거나 간소화) */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {t("totalReturn")}
            </p>
            <p className="text-lg font-bold text-emerald-500">
              {bestTrial.metrics.totalReturnPct?.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("mdd")}</p>
            <p className="text-lg font-bold">
              {bestTrial.metrics.mddPct?.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("winRate")}</p>
            <p className="text-lg font-bold">
              {bestTrial.metrics.winRatePct?.toFixed(1)}%
            </p>
          </div>
        </div>

        <Separator />

        {/* 발견된 파라미터 */}
        <div>
          <h4 className="text-sm font-medium mb-2">{t("foundParameters")}</h4>
          <div className="bg-muted/50 rounded-md p-3 text-xs font-mono space-y-1 max-h-[150px] overflow-y-auto">
            {Object.entries(bestTrial.params).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span
                  className="text-muted-foreground truncate mr-4"
                  title={key}
                >
                  {key.split(".").pop()} {/* 경로의 마지막 부분만 표시 */}
                </span>
                <span className="font-semibold text-primary">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" size="sm" asChild>
          {/* 실제로는 해당 Trial ID로 상세 백테스트 페이지를 열 수 있어야 함 */}
          <Link href={`/backtester/trial/${bestTrial.trialId}`} target="_blank">
            {t("viewDetails")} <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

// --- WFO 전용 섹션 (플레이스홀더) ---
const WfoAnalysisSection = ({ result }: { result: any }) => {
  const t = useTranslations("OptimizationDetailPage.WfoAnalysis");
  // TODO: 실제 차트 컴포넌트 (OOSPerformanceChart, ParameterStabilityChart) 구현 필요
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("oosPerformanceTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center bg-muted/20">
          <p className="text-muted-foreground">
            OOS Performance Chart Placeholder
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("parameterStabilityTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center bg-muted/20">
          <p className="text-muted-foreground">
            Parameter Stability Chart Placeholder
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// --- 메인 페이지 컴포넌트 ---
export default function OptimizationDetailPage({
  params,
}: {
  params: { optimizationId: string };
}) {
  const t = useTranslations("OptimizationDetailPage");
  const { optimizationId } = params;
  const queryClient = useQueryClient();

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
        const message = JSON.parse(event.data);
        queryClient.setQueryData(
          ["optimizationDetail", optimizationId],
          (old: any) => {
            if (!old) return old;
            const updated = { ...old, ...message };
            // 완료 시 전체 데이터 재요청
            if (message.status === "completed" && old.status !== "completed") {
              queryClient.invalidateQueries({
                queryKey: ["optimizationDetail", optimizationId],
              });
            }
            return updated;
          }
        );
      };

      return () => ws.close();
    }
  }, [job?.status, optimizationId, queryClient]);

  // 3. 렌더링 로직
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-[400px] col-span-1" />
          <Skeleton className="h-[400px] col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <Alert variant="destructive" className="container mx-auto mt-8 max-w-2xl">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>
          {(error as any)?.message || t("errorMessage")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 space-y-8">
      {/* 1. 헤더 */}
      <PageHeader job={job} />

      {/* 2. 진행률 (실행 중일 때만) */}
      {(job.status === "running" || job.status === "pending") &&
        job.progress && (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="py-4 flex items-center justify-center gap-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="space-y-1 text-center">
                <p className="font-medium">{t("processingTitle")}</p>
                <p className="text-sm text-muted-foreground">
                  {job.progress.current_step} / {job.progress.total_steps}{" "}
                  {t("trialsCompleted")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

      {/* 3. 요약 섹션 (Config & Best Result) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <ConfigSummaryCard config={job.config} />
        </div>
        <div className="lg:col-span-2">
          <BestResultCard bestTrial={job.bestTrial} />
        </div>
      </div>

      {/* 4. WFO 전용 섹션 (Tier 1) */}
      {job.type === "wfo" && job.status === "completed" && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChartHorizontal className="h-5 w-5 text-teal-500" />
              {t("WfoAnalysis.sectionTitle")}
            </h2>
            <WfoAnalysisSection result={job.wfoResult} />
          </div>
        </>
      )}

      {/* 5. 상세 분석 섹션 (Tier 2) - 탭으로 구분 */}
      {job.status === "completed" && (
        <>
          <Separator />
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              {t("DetailedAnalysis.sectionTitle")}
            </h2>
            <Tabs defaultValue="importance" className="w-full">
              <TabsList>
                <TabsTrigger value="importance">
                  {t("DetailedAnalysis.tabs.importance")}
                </TabsTrigger>
                <TabsTrigger value="trials">
                  <List className="h-4 w-4 mr-2" />
                  {t("DetailedAnalysis.tabs.trials")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="importance" className="mt-4">
                <Card>
                  <CardContent className="h-[400px] flex items-center justify-center bg-muted/20">
                    <p className="text-muted-foreground">
                      Parameter Importance Chart Placeholder
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="trials" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    {/* TODO: TradeLogTable과 유사한 TrialsTable 구현 필요 */}
                    <div className="p-8 text-center text-muted-foreground">
                      Trials Table Placeholder (Use TanStack Table)
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
    </div>
  );
}
