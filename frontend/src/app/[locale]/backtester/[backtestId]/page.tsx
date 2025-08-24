// file: src/app/[locale]/backtester/[backtestId]/page.tsx

"use client";

import * as React from "react";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import { format, isValid } from "date-fns";
import { toast } from "sonner";
import {
  Loader2,
  Info,
  TriangleAlert,
  Calendar,
  DollarSign,
  Repeat,
  Share2,
} from "lucide-react";

import apiClient from "@/lib/apiClient";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Backtest } from "@/types/backtest";
import { TradeLog } from "@/types/tradelog";

// --- 최종 분석 컴포넌트 임포트 ---
import { BacktestResultSummary } from "@/components/domain/backtesting/BacktestResultSummary";
import { DynamicEquityChart } from "@/components/domain/backtesting/DynamicEquityChart";
import { MonthlyPerformance } from "@/components/domain/backtesting/MonthlyPerformance";
import { TradeLogTable } from "@/components/domain/backtesting/TradeLogTable";

// --- UI 컴포넌트 ---
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

// --- 페이지 헤더 ---
const PageHeader = ({ backtest }: { backtest: Backtest }) => {
  const t = useTranslations("BacktestDetailPage.Header");
  const router = useRouter();

  const handleRerun = () => {
    const params = new URLSearchParams({
      strategyId: backtest.strategy.id.toString(),
      startDate: backtest.parameters.startDate,
      endDate: backtest.parameters.endDate,
      initialCapital: backtest.parameters.initialCapital.toString(),
    });
    router.push(`/backtester/new?${params.toString()}`);
  };
  const handleShare = () => {
    toast.info(t("shareWip"));
  };

  // --- 날짜 유효성 검사 ---
  const startDate = backtest.parameters?.startDate
    ? new Date(backtest.parameters.startDate)
    : null;
  const endDate = backtest.parameters?.endDate
    ? new Date(backtest.parameters.endDate)
    : null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <p className="text-sm font-medium text-primary">{t("strategy")}</p>
            <CardTitle className="text-2xl font-bold text-foreground">
              <Link
                href={`/strategies/${backtest.strategy.id}`}
                className="hover:underline"
              >
                {backtest.strategy.name}
              </Link>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRerun}>
              <Repeat className="mr-2 h-4 w-4" />
              {t("rerun")}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleShare}
              disabled={backtest.status !== "completed"}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {t("share")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-4 border-t">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>
            {startDate && isValid(startDate) && endDate && isValid(endDate) ? (
              <>
                {format(startDate, "yyyy.MM.dd")} ~{" "}
                {format(endDate, "yyyy.MM.dd")}
              </>
            ) : (
              t("loadingDate")
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span>
            {t("initialCapital", {
              amount: (
                backtest.parameters?.initialCapital ?? 0
              ).toLocaleString(),
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// --- 로딩 상태 스켈레톤 UI ---
const LoadingSkeleton = () => (
  <div className="space-y-8">
    <Skeleton className="h-36 w-full" />
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
    <Skeleton className="h-96 w-full" />
  </div>
);

// --- 메인 페이지 컴포넌트 ---
export default function BacktestDetailPage({
  params,
}: {
  params: { backtestId: string };
}) {
  const t = useTranslations("BacktestDetailPage");
  const { backtestId } = params;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<{
    backtest: Backtest;
    tradeLogs: TradeLog[];
  }>({
    queryKey: ["backtestDetail", backtestId],
    queryFn: async () => {
      // trade_logs는 백테스트 완료 후에만 필요하므로, 초기 로드 시에는 기본 정보만 가져옵니다.
      const backtestRes = await apiClient.get(`/backtests/${backtestId}`);
      let tradeLogs: TradeLog[] = [];
      if (backtestRes.data.status === "completed") {
        const tradeLogsRes = await apiClient.get(
          `/backtests/${backtestId}/trade_logs`
        );
        tradeLogs = tradeLogsRes.data;
      }
      return {
        backtest: backtestRes.data as Backtest,
        tradeLogs: tradeLogs,
      };
    },
    // [개선] refetchInterval을 제거하고 WebSocket으로 실시간 업데이트를 처리합니다.
    refetchOnWindowFocus: false,
    retry: false,
  });

  // --- [신규] WebSocket을 통한 실시간 업데이트 로직 ---
  useEffect(() => {
    // 데이터가 로드되었고, 상태가 '진행중'일 때만 웹소켓 연결
    if (
      data?.backtest &&
      (data.backtest.status === "running" || data.backtest.status === "pending")
    ) {
      const wsUrl = process.env.NEXT_PUBLIC_API_URL!.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsUrl}/ws/backtest/${backtestId}`);

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        // React Query의 캐시를 직접 업데이트하여 UI를 다시 렌더링합니다.
        queryClient.setQueryData(
          ["backtestDetail", backtestId],
          (oldData: any) => {
            if (!oldData) return;
            const updatedBacktest = { ...oldData.backtest, ...message };

            // 상태가 'completed'로 바뀌면, 전체 데이터를 다시 불러와 최종 결과를 반영합니다.
            if (
              message.status === "completed" &&
              oldData.backtest.status !== "completed"
            ) {
              queryClient.invalidateQueries({
                queryKey: ["backtestDetail", backtestId],
              });
            }

            return { ...oldData, backtest: updatedBacktest };
          }
        );
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      // 컴포넌트가 언마운트되거나 상태가 바뀌면 웹소켓 연결을 정리합니다.
      return () => {
        ws.close();
      };
    }
  }, [data?.backtest?.status, backtestId, queryClient]);

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton />;
    }

    if (isError) {
      return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>
            {t("errorMessage", {
              error: (error as any)?.response?.data?.detail || error.message,
            })}
          </AlertDescription>
        </Alert>
      );
    }

    if (!data) {
      return (
        <Alert variant="default" className="max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("noDataTitle")}</AlertTitle>
          <AlertDescription>{t("noDataMessage")}</AlertDescription>
        </Alert>
      );
    }

    const { backtest, tradeLogs } = data;

    switch (backtest.status) {
      case "pending":
      case "running":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] bg-card border rounded-lg p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-2xl font-semibold mt-6">
              {t("processingTitle")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("processingMessage")}
            </p>
          </div>
        );
      case "completed":
        if (!backtest.result) {
          return <Alert variant="destructive">{t("noResultData")}</Alert>;
        }
        return (
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="summary">{t("Tabs.summary")}</TabsTrigger>
              <TabsTrigger value="chart">{t("Tabs.chart")}</TabsTrigger>
              <TabsTrigger value="monthly">{t("Tabs.monthly")}</TabsTrigger>
              <TabsTrigger value="logs">{t("Tabs.logs")}</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
              <BacktestResultSummary result={backtest.result} />
            </TabsContent>
            <TabsContent value="chart">
              <DynamicEquityChart
                pnlData={backtest.result.pnlCurveJson || []}
              />
            </TabsContent>
            <TabsContent value="monthly">
              <MonthlyPerformance
                pnlData={backtest.result.pnlCurveJson || []}
              />
            </TabsContent>
            <TabsContent value="logs">
              <TradeLogTable tradeLogs={tradeLogs} />
            </TabsContent>
          </Tabs>
        );
      case "failed":
      case "canceled":
        return (
          <Alert variant="default" className="max-w-2xl mx-auto">
            <Info className="h-4 w-4" />
            <AlertTitle>
              {t("jobNotCompletedTitle", { status: backtest.status })}
            </AlertTitle>
            <AlertDescription>
              {t("jobNotCompletedMessage", { status: backtest.status })}
            </AlertDescription>
          </Alert>
        );
      default:
        return <Alert variant="destructive">{t("unknownStatus")}</Alert>;
    }
  };

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        {data?.backtest && <PageHeader backtest={data.backtest} />}
        {renderContent()}
      </div>
    </AuthGuard>
  );
}
