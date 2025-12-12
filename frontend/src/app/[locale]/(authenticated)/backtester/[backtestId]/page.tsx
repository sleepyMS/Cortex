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
  BarChartHorizontal,
} from "lucide-react";
import { UTCTimestamp } from "lightweight-charts";

import apiClient from "@/lib/apiClient";
import { Backtest } from "@/types/backtest";
import { TradeLog } from "@/types/tradelog";

// --- 최종 분석 컴포넌트 임포트 ---
import { BacktestResultSummary } from "@/components/domain/backtesting/BacktestResultSummary";
import { DetailedMetrics } from "@/components/domain/backtesting/DetailedMetrics";
import { BacktestParameters } from "@/components/domain/backtesting/BacktestParameters";
import { DynamicEquityChart } from "@/components/domain/backtesting/DynamicEquityChart";
import { DynamicDrawdownChart } from "@/components/domain/backtesting/DynamicDrawdownChart";
import { MonthlyPerformance } from "@/components/domain/backtesting/MonthlyPerformance";
import { TradeLogTable } from "@/components/domain/backtesting/TradeLogTable";

// --- UI 컴포넌트 ---
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

// --- 페이지 헤더 ---
const PageHeader = ({
  backtest,
  totalTrades,
}: {
  backtest: Backtest;
  totalTrades: number | null | undefined;
}) => {
  // 1. 헤더 '표시용' t 함수
  const tHeader = useTranslations("BacktestDetailPage.Header");

  // 2. 페이지 '로직/오류용' t 함수 (새로 추가)
  const tPage = useTranslations("BacktestDetailPage");

  const router = useRouter();

  const handleRerun = () => {
    if (!backtest.strategy) {
      // 3. tPage 함수를 사용하여 토스트 메시지 호출
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
    // 4. tHeader 함수 사용 (원래대로)
    toast.info(tHeader("shareWip"));
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
            {/* 5. tHeader 함수 사용 (원래대로) */}
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
                // 6. tHeader 함수 사용 (이제 정상 작동)
                <span className="text-muted-foreground">
                  {tHeader("unknownStrategy")}
                </span>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRerun}>
              <Repeat className="mr-2 h-4 w-4" />
              {tHeader("rerun")} {/* 7. tHeader 함수 사용 (원래대로) */}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleShare}
              disabled={backtest.status !== "completed"}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {tHeader("share")} {/* 8. tHeader 함수 사용 (원래대로) */}
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
              tHeader("loadingDate") /* 9. tHeader 함수 사용 (원래대로) */
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span>
            {/* 10. tHeader 함수 사용 (원래대로) */}
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
            {/* 11. tHeader 함수 사용 (원래대로) */}
            <span>{tHeader("totalTrades", { count: totalTrades })}</span>
          </div>
        )}
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

  // --- [성능 최적화] 3개의 병렬 쿼리로 분리 ---

  // 1. 핵심 백테스트 정보 (헤더, 요약 지표, 파라미터)
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

  // 2. 차트 데이터 (PnL 곡선, 드로우다운 곡선) - 백테스트 완료 시에만 로드
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

  // --- WebSocket을 통한 실시간 업데이트 로직 ---
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

            // 상태가 'completed'로 바뀌면, 모든 쿼리를 다시 불러옴
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
    // 1. 핵심 데이터 로딩 중
    if (isLoadingCore) {
      return <LoadingSkeleton />;
    }

    // 2. 에러 처리
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

    // 3. 데이터 없음
    if (!backtest) {
      return (
        <Alert variant="default" className="max-w-2xl mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>{t("noDataTitle")}</AlertTitle>
          <AlertDescription>{t("noDataMessage")}</AlertDescription>
        </Alert>
      );
    }

    // 4. 상태별 렌더링
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
        // result가 없는데 fetching 중이면 스켈레톤 (백테스트 완료 직후 타이밍)
        if (!backtest.result && isFetchingCore) {
          return <LoadingSkeleton />;
        }
        // fetching 완료 후에도 result가 없으면 실제로 결과 없음
        if (!backtest.result) {
          return <Alert variant="destructive">{t("noResultData")}</Alert>;
        }
        return (
          <div className="flex flex-col space-y-8">
            {/* 1. 요약 지표 - 즉시 표시 */}
            <BacktestResultSummary result={backtest.result} />

            {/* 2. 상세 지표 - 즉시 표시 */}
            <DetailedMetrics result={backtest.result} />

            {/* 3. 백테스팅 파라미터 - 즉시 표시 */}
            <BacktestParameters backtest={backtest} />

            {/* 4. 자산 곡선 차트 - 별도 로딩 */}
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

            {/* 5. 드로우다운 곡선 차트 - 별도 로딩 */}
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

            {/* 6. 월별 수익률 표 - 차트 데이터 사용 */}
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

            {/* 7. 상세 거래 기록 - 페이지네이션 */}
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
                    setTradePage(1); // limit 변경 시 첫 페이지로
                  },
                  onSortChange: (sortBy, sortOrder) => {
                    setTradeSortBy(sortBy);
                    setTradeSortOrder(sortOrder);
                    setTradePage(1); // 정렬 변경 시 첫 페이지로
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
      {backtest && (
        <PageHeader
          backtest={backtest}
          totalTrades={backtest.result?.totalTrades}
        />
      )}
      {renderContent()}
    </div>
  );
}
