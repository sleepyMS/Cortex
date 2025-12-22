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
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
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
// --- Compact Sticky Header ---
const CompactPageHeader = ({
  backtest,
  onRerun,
  onShare,
}: {
  backtest: Backtest;
  onRerun: () => void;
  onShare: () => void;
}) => {
  const tHeader = useTranslations("BacktestDetailPage.Header");

  const startDate = backtest.parameters?.startDate
    ? new Date(backtest.parameters.startDate)
    : null;
  const endDate = backtest.parameters?.endDate
    ? new Date(backtest.parameters.endDate)
    : null;
  const dateRange =
    startDate && isValid(startDate) && endDate && isValid(endDate)
      ? `${format(startDate, "yyyy.MM.dd")} ~ ${format(endDate, "yyyy.MM.dd")}`
      : "";

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b px-6 h-16 flex items-center justify-between shadow-sm"
    >
      <div className="flex items-center gap-4 overflow-hidden">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-medium">
            {tHeader("strategy")}
          </span>
          <span className="text-sm font-bold truncate">
            {backtest.strategy?.name || tHeader("unknownStrategy")}
          </span>
        </div>

        {dateRange && (
          <>
            <div className="h-8 w-[1px] bg-border mx-2 hidden sm:block" />
            <div className="hidden sm:flex flex-col">
              <span className="text-xs text-muted-foreground">Period</span>
              <span className="text-xs font-medium">{dateRange}</span>
            </div>
          </>
        )}

        <div className="h-8 w-[1px] bg-border mx-2 hidden md:block" />
        <div className="hidden md:flex flex-col">
          <span className="text-xs text-muted-foreground">Trades</span>
          <span className="text-xs font-medium">
            {backtest.result?.totalTrades ?? 0}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRerun} className="h-8">
          <Repeat className="mr-2 h-3.5 w-3.5" />
          {tHeader("rerun")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onShare}
          disabled={backtest.status !== "completed"}
          className="h-8 w-8"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

// --- Scroll Layout Component ---
interface BacktestScrollLayoutProps {
  children: React.ReactNode;
  backtest: Backtest | undefined;
  onRerun: () => void;
  onShare: () => void;
  showHeader: boolean;
}

const BacktestScrollLayout = ({
  children,
  backtest,
  onRerun,
  onShare,
  showHeader,
}: BacktestScrollLayoutProps) => {
  const [showStickyHeader, setShowStickyHeader] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollTop = scrollContainerRef.current.scrollTop;
      // Optimization: Simple threshold check, React handles state deduplication
      if (scrollTop > 200 && !showStickyHeader) {
        setShowStickyHeader(true);
      } else if (scrollTop <= 200 && showStickyHeader) {
        setShowStickyHeader(false);
      }
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative">
      {/* Sticky Header Overlay */}
      <AnimatePresence>
        {showStickyHeader && backtest && (
          <CompactPageHeader
            backtest={backtest}
            onRerun={onRerun}
            onShare={onShare}
          />
        )}
      </AnimatePresence>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar p-6"
      >
        <div className="container mx-auto max-w-screen-xl">
          {showHeader && backtest && (
            <PageHeader
              backtest={backtest}
              totalTrades={backtest.result?.totalTrades}
            />
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export function BacktestContent({
  backtestId,
  showHeader = true,
}: BacktestContentProps) {
  const t = useTranslations("BacktestDetailPage");
  const tHeader = useTranslations("BacktestDetailPage.Header");
  const queryClient = useQueryClient();
  const router = useRouter();

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

  // 2. Trade logs - pagination + sorting state
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

  // 3. Chart data
  const { data: chartData, isLoading: isLoadingCharts } = useQuery<{
    pnlCurveJson: { time: number; value: number }[];
    drawdownCurveJson: { time: number; value: number }[];
  }>({
    queryKey: ["backtestCharts", backtestId],
    queryFn: async () => {
      const res = await apiClient.get(`/backtests/${backtestId}/charts`);
      return res.data;
    },
    enabled: backtest?.status === "completed" && !!tradeLogsData, // Wait for trade logs!
    gcTime: 0, // [Performance] Disable caching to prevent UI freeze on navigation
    refetchOnWindowFocus: false,
  });

  // --- WebSocket for real-time updates ---
  useEffect(() => {
    // ... (WebSocket logic remains unchanged)
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
              // Invalidate all related queries
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

  // Shared Handlers (Recreate logic from PageHeader if needed or pass down)
  // Since PageHeader is internal, we can duplicate the simple handlers or move them out.
  // For simplicity and cleaner code, I'll inline the simple handlers here for the compact header.
  const handleRerun = () => {
    if (!backtest?.strategy) {
      toast.error(t("errorNoStrategyInfo"));
      return;
    }
    const params = new URLSearchParams({ sourceBacktestId: backtest.id });
    router.push(`/backtester/new?${params.toString()}`);
  };

  const handleShare = () => {
    toast.info(tHeader("shareWip")); // Reusing translation key
  };

  const renderContent = () => {
    // ... (Render logic remains roughly unchanged, just collapsing for brevity)
    // 1. Loading core data
    if (isLoadingCore) return <LoadingSkeleton />;
    if (isErrorCore) {
      return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>
            {(errorCore as any)?.response?.data?.detail ||
              (errorCore as Error).message}
          </AlertDescription>
        </Alert>
      );
    }
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
        if (!backtest.result && isFetchingCore) return <LoadingSkeleton />;
        if (!backtest.result)
          return <Alert variant="destructive">{t("noResultData")}</Alert>;

        return (
          <div className="flex flex-col space-y-8">
            <BacktestResultSummary result={backtest.result} />
            <DetailedMetrics result={backtest.result} />
            <BacktestParameters backtest={backtest} />

            {/* Charts & Tables ... (Keeping existing structure) */}
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

            {/* Drawdown Chart */}
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

            {/* Monthly Performance */}
            {isLoadingCharts ? (
              <Skeleton className="h-[250px] w-full rounded-lg" />
            ) : (
              <MonthlyPerformance
                monthlyReturns={
                  backtest.result?.tradeSummaryJson?.monthly_returns || {}
                }
              />
            )}

            {/* Trade Logs */}
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
    <BacktestScrollLayout
      backtest={backtest}
      onRerun={handleRerun}
      onShare={handleShare}
      showHeader={showHeader}
    >
      {renderContent()}
    </BacktestScrollLayout>
  );
}
