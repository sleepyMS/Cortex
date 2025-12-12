// file: frontend/src/components/domain/backtesting/BacktestContent.tsx
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

// --- Types ---
export interface BacktestContentProps {
  backtestId: string;
  showHeader?: boolean;
}

// --- Page Header Component ---
const PageHeader = ({
  backtest,
  totalTrades,
}: {
  backtest: Backtest;
  totalTrades: number | null | undefined;
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
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <p className="text-sm font-medium text-primary">
              {tHeader("strategy")}
            </p>
            <CardTitle className="text-2xl font-bold text-foreground">
              {backtest.strategy ? (
                <Link
                  href={`/strategies/${backtest.strategy.id}`}
                  className="hover:underline"
                >
                  {backtest.strategy.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  {tHeader("unknownStrategy")}
                </span>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRerun}>
              <Repeat className="mr-2 h-4 w-4" />
              {tHeader("rerun")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleShare}
              disabled={backtest.status !== "completed"}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {tHeader("share")}
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
              tHeader("loadingDate")
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span>
            {tHeader("initialCapital", {
              amount: (
                backtest.parameters?.initialCapital ?? 0
              ).toLocaleString(),
            })}
          </span>
        </div>
        {totalTrades !== null && typeof totalTrades !== "undefined" && (
          <div className="flex items-center gap-2">
            <BarChartHorizontal className="h-4 w-4" />
            <span>{tHeader("totalTrades", { count: totalTrades })}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Loading Skeleton ---
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

// --- Main Component ---
export function BacktestContent({
  backtestId,
  showHeader = true,
}: BacktestContentProps) {
  const t = useTranslations("BacktestDetailPage");
  const queryClient = useQueryClient();

  // --- [Performance] 3 parallel queries ---

  // 1. Core backtest info
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

  // 2. Chart data (only when completed)
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

  // 3. Trade logs - pagination + sorting state
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

  // --- WebSocket for real-time updates ---
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

  const renderContent = () => {
    // 1. Loading core data
    if (isLoadingCore) {
      return <LoadingSkeleton />;
    }

    // 2. Error handling
    if (isErrorCore) {
      return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>
            {t("errorMessage", {
              error:
                (errorCore as any)?.response?.data?.detail ||
                (errorCore as Error).message,
            })}
          </AlertDescription>
        </Alert>
      );
    }

    // 3. No data
    if (!backtest) {
      return (
        <Alert variant="default" className="max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("noDataTitle")}</AlertTitle>
          <AlertDescription>{t("noDataMessage")}</AlertDescription>
        </Alert>
      );
    }

    // 4. Status-based rendering
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
        // result is missing but still fetching (timing after completion)
        if (!backtest.result && isFetchingCore) {
          return <LoadingSkeleton />;
        }
        // fetching complete but no result
        if (!backtest.result) {
          return <Alert variant="destructive">{t("noResultData")}</Alert>;
        }
        return (
          <div className="flex flex-col space-y-8">
            {/* 1. Summary metrics - instant */}
            <BacktestResultSummary result={backtest.result} />

            {/* 2. Detailed metrics - instant */}
            <DetailedMetrics result={backtest.result} />

            {/* 3. Backtest parameters - instant */}
            <BacktestParameters backtest={backtest} />

            {/* 4. Equity chart - separate loading */}
            {isLoadingCharts ? (
              <Skeleton className="h-[350px] w-full rounded-lg" />
            ) : (
              <DynamicEquityChart
                pnlData={
                  (chartData?.pnlCurveJson as unknown as {
                    time: UTCTimestamp;
                    value: number;
                  }[]) || []
                }
              />
            )}

            {/* 5. Drawdown chart - separate loading */}
            {isLoadingCharts ? (
              <Skeleton className="h-[350px] w-full rounded-lg" />
            ) : (
              <DynamicDrawdownChart
                drawdownData={
                  (chartData?.drawdownCurveJson as unknown as {
                    time: UTCTimestamp;
                    value: number;
                  }[]) || []
                }
              />
            )}

            {/* 6. Monthly performance table - uses chart data */}
            {isLoadingCharts ? (
              <Skeleton className="h-[250px] w-full rounded-lg" />
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

            {/* 7. Trade log table - pagination */}
            {isLoadingTrades ? (
              <Skeleton className="h-[400px] w-full rounded-lg" />
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
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      {showHeader && backtest && (
        <PageHeader
          backtest={backtest}
          totalTrades={backtest.result?.totalTrades}
        />
      )}
      {renderContent()}
    </div>
  );
}
