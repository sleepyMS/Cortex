"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "@/i18n/navigation";
import { format } from "date-fns";
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
import { Backtest } from "@/components/domain/backtesting/BacktestCard";
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
      strategyId: backtest.strategy.id,
      startDate: backtest.parameters.startDate,
      endDate: backtest.parameters.endDate,
      initialCapital: backtest.parameters.initialCapital.toString(),
    });
    router.push(`/backtester/new?${params.toString()}`);
  };

  const handleShare = () => {
    toast.info(t("shareWip"));
  };

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
      <CardContent className="flex items-center gap-6 text-sm text-muted-foreground pt-4 border-t">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>
            {format(new Date(backtest.parameters.startDate), "yyyy.MM.dd")} ~{" "}
            {format(new Date(backtest.parameters.endDate), "yyyy.MM.dd")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span>
            {t("initialCapital", {
              amount: backtest.parameters.initialCapital.toLocaleString(),
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
    <Skeleton className="h-96 w-full" />
    <Skeleton className="h-64 w-full" />
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["backtestDetail", backtestId],
    queryFn: async () => {
      const [backtestRes, tradeLogsRes] = await Promise.all([
        apiClient.get(`/backtests/${backtestId}`),
        apiClient.get(`/backtests/${backtestId}/trade_logs`),
      ]);
      return {
        backtest: backtestRes.data as Backtest,
        tradeLogs: tradeLogsRes.data as TradeLog[],
      };
    },
    refetchInterval: (query) => {
      const status = (query.state.data as { backtest: Backtest })?.backtest
        ?.status;
      return status === "running" || status === "pending" ? 5000 : false;
    },
    retry: false,
  });

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

    const { backtest, tradeLogs } = data;

    switch (backtest.status) {
      case "pending":
      case "running":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] bg-card border rounded-lg p-8">
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
        {!isLoading && data?.backtest && (
          <PageHeader backtest={data.backtest} />
        )}
        {renderContent()}
      </div>
    </AuthGuard>
  );
}
