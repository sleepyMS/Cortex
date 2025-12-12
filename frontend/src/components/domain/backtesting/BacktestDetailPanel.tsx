// file: frontend/src/components/domain/backtesting/BacktestDetailPanel.tsx
"use client";

import * as React from "react";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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
  BarChartHorizontal,
  ArrowLeft,
  X,
} from "lucide-react";
import { UTCTimestamp } from "lightweight-charts";
import { useRouter } from "@/i18n/navigation";

import apiClient from "@/lib/apiClient";
import { Backtest } from "@/types/backtest";
import { TradeLog } from "@/types/tradelog";

// --- Analysis components ---
import { BacktestResultSummary } from "@/components/domain/backtesting/BacktestResultSummary";
import { DetailedMetrics } from "@/components/domain/backtesting/DetailedMetrics";
import { BacktestParameters } from "@/components/domain/backtesting/BacktestParameters";
import { DynamicEquityChart } from "@/components/domain/backtesting/DynamicEquityChart";
import { DynamicDrawdownChart } from "@/components/domain/backtesting/DynamicDrawdownChart";
import { MonthlyPerformance } from "@/components/domain/backtesting/MonthlyPerformance";
import { TradeLogTable } from "@/components/domain/backtesting/TradeLogTable";

// --- UI components ---
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

interface BacktestDetailPanelProps {
  backtestId: string;
  onClose: () => void;
}

// --- Page Header Component ---
const PageHeader = ({
  backtest,
  totalTrades,
  onClose,
}: {
  backtest: Backtest;
  totalTrades: number | null | undefined;
  onClose: () => void;
}) => {
  const tHeader = useTranslations("BacktestDetailPage.Header");
  const tPage = useTranslations("BacktestDetailPage");
  const router = useRouter();

  const handleRerun = () => {
    if (!backtest.strategy) {
      toast.error(tPage("errorNoStrategyInfo"));
      console.error(
        "Rerun failed: Strategy information is missing in backtest data."
      );
      return;
    }

    const params = new URLSearchParams({
      sourceBacktestId: backtest.id,
    });
    router.push(`/backtester/new?${params.toString()}`);
  };

  const handleShare = () => {
    toast.info(tHeader("shareWip"));
  };

  const startDate = backtest.parameters?.startDate
    ? new Date(backtest.parameters.startDate)
    : null;
  const endDate = backtest.parameters?.endDate
    ? new Date(backtest.parameters.endDate)
    : null;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4 mb-6">
      {/* Top row: Close button + Strategy name + Actions */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {tHeader("strategy")}
            </p>
            <h1 className="text-lg font-bold text-foreground truncate">
              {backtest.strategy ? (
                <Link
                  href={`/strategies/${backtest.strategy.id}`}
                  className="hover:underline hover:text-primary transition-colors"
                >
                  {backtest.strategy.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  {tHeader("unknownStrategy")}
                </span>
              )}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleRerun}>
            <Repeat className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tHeader("rerun")}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleShare}
            disabled={backtest.status !== "completed"}
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">{tHeader("share")}</span>
          </Button>
        </div>
      </div>

      {/* Bottom row: Metadata */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {startDate && isValid(startDate) && endDate && isValid(endDate) ? (
              <>
                {format(startDate, "yyyy.MM.dd")} ~{" "}
                {format(endDate, "yyyy.MM.dd")}
              </>
            ) : (
              tHeader("loadingDate")
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5" />
          <span>
            {tHeader("initialCapital", {
              amount: (
                backtest.parameters?.initialCapital ?? 0
              ).toLocaleString(),
            })}
          </span>
        </div>
        {totalTrades !== null && typeof totalTrades !== "undefined" && (
          <div className="flex items-center gap-1.5">
            <BarChartHorizontal className="h-3.5 w-3.5" />
            <span>{tHeader("totalTrades", { count: totalTrades })}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Loading Skeleton ---
const LoadingSkeleton = () => (
  <div className="space-y-6">
    {/* Header skeleton */}
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-4 mb-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>

    {/* Summary cards skeleton (6 cards) */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2 p-4 border rounded-lg">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>

    {/* Detailed metrics skeleton */}
    <div className="border rounded-lg p-6">
      <Skeleton className="h-6 w-32 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Overall Score skeleton (left side) */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-16 w-20 mb-2" />
          <Skeleton className="h-5 w-12" />
        </div>
        {/* Metrics table skeleton (right side) */}
        <div className="lg:col-span-3 space-y-3">
          {/* Table header */}
          <div className="flex gap-4 pb-3 border-b">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
          {/* Table rows */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex gap-4 items-center">
              {i === 0 || i === 3 || i === 5 ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                <div className="w-24" />
              )}
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Charts skeleton (2 columns) */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3 border rounded-lg p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-[280px] w-full rounded" />
      </div>
      <div className="space-y-3 border rounded-lg p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-[280px] w-full rounded" />
      </div>
    </div>

    {/* Monthly performance skeleton */}
    <div className="space-y-3 border rounded-lg p-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-64 w-full rounded" />
    </div>

    {/* Parameters skeleton */}
    <div className="space-y-3 border rounded-lg p-4">
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>

    {/* Trade log table skeleton */}
    <div className="space-y-3 border rounded-lg p-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-96 w-full rounded" />
    </div>
  </div>
);

// --- Main Component ---
export function BacktestDetailPanel({
  backtestId,
  onClose,
}: BacktestDetailPanelProps) {
  const t = useTranslations("BacktestDetailPage");
  const queryClient = useQueryClient();

  // --- [성능 최적화] 3개의 병렬 쿼리로 분리 ---

  // 1. 핵심 백테스트 정보
  const {
    data: backtest,
    isLoading: isLoadingCore,
    isFetching: isFetchingCore,
    isError: isErrorCore,
    error: errorCore,
  } = useQuery<Backtest>({
    queryKey: ["backtestCore", backtestId],
    queryFn: async () => {
      const res = await apiClient.get(`/backtests/${backtestId}`);
      return res.data as Backtest;
    },
    refetchOnWindowFocus: false,
    retry: false,
  });

  // 2. 차트 데이터 (백테스트 완료 시에만 로드)
  const { data: chartData, isLoading: isLoadingCharts } = useQuery<{
    pnlCurveJson: { time: number; value: number }[];
    drawdownCurveJson: { time: number; value: number }[];
  }>({
    queryKey: ["backtestCharts", backtestId],
    queryFn: async () => {
      const res = await apiClient.get(`/backtests/${backtestId}/charts`);
      return res.data;
    },
    enabled: backtest?.status === "completed",
    refetchOnWindowFocus: false,
  });

  // 3. 거래 로그 - 페이지네이션 + 정렬 상태
  const [tradePage, setTradePage] = React.useState(1);
  const [tradeLimit, setTradeLimit] = React.useState(10);
  const [tradeSortBy, setTradeSortBy] = React.useState("timestamp");
  const [tradeSortOrder, setTradeSortOrder] = React.useState<"asc" | "desc">(
    "desc"
  );

  const { data: tradeLogsData, isLoading: isLoadingTrades } = useQuery<{
    items: TradeLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>({
    queryKey: [
      "backtestTradeLogs",
      backtestId,
      tradePage,
      tradeLimit,
      tradeSortBy,
      tradeSortOrder,
    ],
    queryFn: async () => {
      const res = await apiClient.get(
        `/backtests/${backtestId}/trade_logs?page=${tradePage}&limit=${tradeLimit}&sort_by=${tradeSortBy}&sort_order=${tradeSortOrder}`
      );
      return res.data;
    },
    enabled: backtest?.status === "completed",
    refetchOnWindowFocus: false,
  });

  // WebSocket for real-time updates
  useEffect(() => {
    if (
      backtest &&
      (backtest.status === "running" || backtest.status === "pending")
    ) {
      const wsUrl = process.env.NEXT_PUBLIC_API_URL!.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsUrl}/ws/backtest/${backtestId}`);

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        queryClient.setQueryData(
          ["backtestCore", backtestId],
          (oldData: Backtest | undefined) => {
            if (!oldData) return oldData;
            const updated = { ...oldData, ...message };

            if (
              message.status === "completed" &&
              oldData.status !== "completed"
            ) {
              queryClient.invalidateQueries({
                queryKey: ["backtestCore", backtestId],
              });
              queryClient.invalidateQueries({
                queryKey: ["backtestCharts", backtestId],
              });
              queryClient.invalidateQueries({
                queryKey: ["backtestTradeLogs", backtestId],
              });
            }

            return updated;
          }
        );
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
      };

      return () => {
        ws.close();
      };
    }
  }, [backtest?.status, backtestId, queryClient]);

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const renderContent = () => {
    // 1. 핵심 데이터 로딩 중
    if (isLoadingCore) {
      return <LoadingSkeleton />;
    }

    // 2. 에러 처리
    if (isErrorCore) {
      return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            {t("errorTitle")}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {t("errorMessage", {
              error:
                (errorCore as any)?.response?.data?.detail ||
                (errorCore as Error).message,
            })}
          </AlertDescription>
        </Alert>
      );
    }

    // 3. 데이터 없음
    if (!backtest) {
      return (
        <Alert variant="default" className="max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            {t("noDataTitle")}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {t("noDataMessage")}
          </AlertDescription>
        </Alert>
      );
    }

    // 4. 상태별 렌더링
    switch (backtest.status) {
      case "pending":
      case "running":
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] bg-muted/20 border border-dashed rounded-lg p-8 text-center">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <h2 className="text-lg font-semibold mt-4">
              {t("processingTitle")}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-sm">
              {t("processingMessage")}
            </p>
          </div>
        );
      case "completed":
        // result가 없는데 fetching 중이면 스켈레톤 (백테스트 완료 직후 타이밍)
        if (!backtest.result && isFetchingCore) {
          return <LoadingSkeleton />;
        }
        // fetching 완료 후에도 result가 없으면 실제로 결과 없음
        if (!backtest.result) {
          return <Alert variant="destructive">{t("noResultData")}</Alert>;
        }
        return (
          <div className="flex flex-col space-y-6">
            {/* 즉시 표시되는 컴포넌트들 */}
            <BacktestResultSummary result={backtest.result} />
            <DetailedMetrics result={backtest.result} />

            {/* 차트 - 별도 로딩 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {isLoadingCharts ? (
                <>
                  <Skeleton className="h-[300px] w-full rounded-lg" />
                  <Skeleton className="h-[300px] w-full rounded-lg" />
                </>
              ) : (
                <>
                  <DynamicEquityChart
                    pnlData={
                      (chartData?.pnlCurveJson as unknown as {
                        time: UTCTimestamp;
                        value: number;
                      }[]) || []
                    }
                  />
                  <DynamicDrawdownChart
                    drawdownData={
                      (chartData?.drawdownCurveJson as unknown as {
                        time: UTCTimestamp;
                        value: number;
                      }[]) || []
                    }
                  />
                </>
              )}
            </div>

            {/* 월별 성과 - 차트 데이터 사용 */}
            {isLoadingCharts ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : (
              <MonthlyPerformance
                pnlData={
                  (chartData?.pnlCurveJson as unknown as {
                    time: UTCTimestamp;
                    value: number;
                  }[]) || []
                }
              />
            )}

            <BacktestParameters backtest={backtest} />

            {/* 거래 로그 - 페이지네이션 */}
            {isLoadingTrades ? (
              <Skeleton className="h-[350px] w-full rounded-lg" />
            ) : (
              <TradeLogTable
                tradeLogs={tradeLogsData?.items || []}
                pagination={{
                  page: tradeLogsData?.page || 1,
                  totalPages: tradeLogsData?.totalPages || 1,
                  total: tradeLogsData?.total || 0,
                  limit: tradeLimit,
                  sortBy: tradeSortBy,
                  sortOrder: tradeSortOrder,
                  onPageChange: (page) => setTradePage(page),
                  onLimitChange: (limit) => {
                    setTradeLimit(limit);
                    setTradePage(1);
                  },
                  onSortChange: (sortBy, sortOrder) => {
                    setTradeSortBy(sortBy);
                    setTradeSortOrder(sortOrder);
                    setTradePage(1);
                  },
                }}
              />
            )}
          </div>
        );
      case "failed":
      case "canceled":
        return (
          <Alert variant="default" className="max-w-2xl mx-auto">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold">
              {t("jobNotCompletedTitle", { status: backtest.status })}
            </AlertTitle>
            <AlertDescription className="text-sm">
              {t("jobNotCompletedMessage", { status: backtest.status })}
            </AlertDescription>
          </Alert>
        );
      default:
        return <Alert variant="destructive">{t("unknownStatus")}</Alert>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 px-6 py-4">
        {backtest && (
          <PageHeader
            backtest={backtest}
            totalTrades={backtest.result?.totalTrades}
            onClose={onClose}
          />
        )}
        {renderContent()}
      </div>
    </div>
  );
}
