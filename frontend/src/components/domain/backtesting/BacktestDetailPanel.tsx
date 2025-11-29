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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-2 p-3 border rounded-lg">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-full" />
        </div>
      ))}
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

  const { data, isLoading, isError, error, isRefetching } = useQuery<{
    backtest: Backtest;
    tradeLogs: TradeLog[];
  }>({
    queryKey: ["backtestDetail", backtestId],
    queryFn: async () => {
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
    refetchOnWindowFocus: false,
    retry: false,
  });

  // WebSocket for real-time updates
  useEffect(() => {
    if (
      data?.backtest &&
      (data.backtest.status === "running" || data.backtest.status === "pending")
    ) {
      const wsUrl = process.env.NEXT_PUBLIC_API_URL!.replace(/^http/, "ws");
      const ws = new WebSocket(`${wsUrl}/ws/backtest/${backtestId}`);

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);

        queryClient.setQueryData(
          ["backtestDetail", backtestId],
          (oldData: any) => {
            if (!oldData) return;
            const updatedBacktest = { ...oldData.backtest, ...message };

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

      return () => {
        ws.close();
      };
    }
  }, [data?.backtest?.status, backtestId, queryClient]);

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
    if (isLoading || isRefetching) {
      return <LoadingSkeleton />;
    }

    if (isError) {
      return (
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            {t("errorTitle")}
          </AlertTitle>
          <AlertDescription className="text-sm">
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
          <AlertTitle className="text-sm font-semibold">
            {t("noDataTitle")}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {t("noDataMessage")}
          </AlertDescription>
        </Alert>
      );
    }

    const { backtest, tradeLogs } = data;

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
        if (!backtest.result) {
          return <Alert variant="destructive">{t("noResultData")}</Alert>;
        }
        return (
          <div className="flex flex-col space-y-6">
            <BacktestResultSummary result={backtest.result} />
            <DetailedMetrics result={backtest.result} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DynamicEquityChart
                pnlData={
                  (backtest.result.pnlCurveJson as unknown as {
                    time: UTCTimestamp;
                    value: number;
                  }[]) || []
                }
              />
              <DynamicDrawdownChart
                drawdownData={
                  (backtest.result.drawdownCurveJson as unknown as {
                    time: UTCTimestamp;
                    value: number;
                  }[]) || []
                }
              />
            </div>

            <MonthlyPerformance
              pnlData={
                (backtest.result.pnlCurveJson as unknown as {
                  time: UTCTimestamp;
                  value: number;
                }[]) || []
              }
            />
            <BacktestParameters backtest={backtest} />
            <TradeLogTable tradeLogs={tradeLogs} />
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
        {data?.backtest && (
          <PageHeader
            backtest={data.backtest}
            totalTrades={data.backtest.result?.totalTrades}
            onClose={onClose}
          />
        )}
        {renderContent()}
      </div>
    </div>
  );
}
