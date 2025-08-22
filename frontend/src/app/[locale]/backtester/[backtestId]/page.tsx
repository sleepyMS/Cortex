// file: frontend/src/app/[locale]/backtester/[backtestId]/page.tsx

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Backtest } from "@/components/domain/backtesting/BacktestCard"; // 이전 단계에서 만든 타입 재사용
import { TradeLog } from "@/types/tradelog"; // 이 타입은 새로 정의해야 할 수 있습니다.

// --- Child Components (Placeholders) ---
// 실제 구현은 각 파일에서 진행해야 합니다. 여기서는 Props 정의와 구조만 보여줍니다.
import { BacktestResultSummary } from "@/components/domain/backtesting/BacktestResultSummary";
import { EquityChart } from "@/components/domain/backtesting/EquityChart";
import { TradeLogTable } from "@/components/domain/backtesting/TradeLogTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Loader2, Info, TriangleAlert, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

// --- Main Page Component ---
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
      // 백테스트 결과와 거래 로그를 병렬로 동시에 요청하여 로딩 속도 최적화
      const [backtestRes, tradeLogsRes] = await Promise.all([
        apiClient.get(`/backtests/${backtestId}`),
        apiClient.get(`/backtests/${backtestId}/trade_logs`),
      ]);
      return {
        backtest: backtestRes.data as Backtest,
        tradeLogs: tradeLogsRes.data as TradeLog[],
      };
    },
    // 백테스트가 진행 중일 경우, 완료될 때까지 5초마다 자동 리프레시
    refetchInterval: (query) => {
      const data = query.state.data as
        | { backtest: Backtest; tradeLogs: TradeLog[] }
        | undefined;
      const status = data?.backtest?.status;
      return status === "running" || status === "pending" ? 5000 : false;
    },
    retry: false, // 404 등 에러 발생 시 재시도 안 함
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t("loading")}</p>
        </div>
      );
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
            <div className="mt-4">
              <Link href="/backtester">
                <Button variant="outline">{t("goToList")}</Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    const { backtest, tradeLogs } = data;

    // --- 상태별 UI 분기 처리 ---
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
          <div className="space-y-6">
            <BacktestResultSummary result={backtest.result} />
            <EquityChart result={backtest.result} />
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
              <div className="mt-4">
                <Link href="/backtester">
                  <Button variant="outline">{t("goToList")}</Button>
                </Link>
              </div>
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          {data?.backtest && (
            <p className="text-muted-foreground mt-2">
              {t("subtitle", { strategyName: data.backtest.strategy.name })}
            </p>
          )}
        </div>
        {renderContent()}
      </div>
    </AuthGuard>
  );
}
