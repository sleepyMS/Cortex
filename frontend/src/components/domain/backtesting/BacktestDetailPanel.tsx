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
  X,
  ArrowLeft,
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
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
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
          <div className="flex flex-col space-y-8">
            <BacktestResultSummary result={backtest.result} />
            <DetailedMetrics result={backtest.result} />
            <BacktestParameters backtest={backtest} />
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
            <MonthlyPerformance
              pnlData={
                (backtest.result.pnlCurveJson as unknown as {
                  time: UTCTimestamp;
                  value: number;
                }[]) || []
              }
            />
            <TradeLogTable tradeLogs={tradeLogs} />
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
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
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
