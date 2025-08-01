// frontend/src/components/domain/strategy/StrategyBacktestHistory.tsx

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format } from "date-fns";
import { ExternalLink, BarChart2, XCircle, Loader2 } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

// 백테스트 응답 타입 (BacktestList에서 재사용)
interface BacktestResponse {
  id: number;
  user_id: number;
  strategy_id: number;
  status:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "canceled"
    | "error"
    | "failed_dispatch"
    | "initializing";
  parameters: Record<string, any>;
  created_at: string;
  updated_at?: string;
  completed_at?: string;

  result?: {
    total_return_pct?: number;
    mdd_pct?: number;
    sharpe_ratio?: number;
    win_rate_pct?: number;
    pnl_curve_json?: any; // any로 두거나 PnlCurveDataPoint[]로 구체화
  };
  strategy?: {
    id: number;
    name: string;
  };
}

interface StrategyBacktestHistoryProps {
  backtests?: BacktestResponse[] | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function StrategyBacktestHistory({
  backtests,
  isLoading,
  isError,
  error,
  refetch,
}: StrategyBacktestHistoryProps) {
  const t = useTranslations("StrategyBacktestHistory");

  const getStatusBadge = (status: BacktestResponse["status"]) => {
    switch (status) {
      case "pending":
      case "initializing":
        return <Badge variant="secondary">{t("statusPending")}</Badge>;
      case "running":
        return (
          <Badge
            variant="default"
            className="bg-blue-500 text-white animate-pulse"
          >
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />{" "}
            {t("statusRunning")}
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-500 text-white">
            {t("statusCompleted")}
          </Badge>
        );
      case "failed":
      case "error":
      case "failed_dispatch":
        return <Badge variant="destructive">{t("statusFailed")}</Badge>;
      case "canceled":
        return <Badge variant="outline">{t("statusCanceled")}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="flex h-48 items-center justify-center p-6">
        <Spinner size="md" />
        <p className="ml-4 text-muted-foreground">{t("loadingBacktests")}</p>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 text-destructive-foreground">
        <p>
          {t("fetchError", {
            errorDetail: error?.message || t("unknownError"),
          })}
        </p>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">
          {t("retryLoad")}
        </Button>
      </Card>
    );
  }

  if (!backtests || backtests.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[150px]">
        <BarChart2 className="h-8 w-8 mb-3" />
        <p className="mb-2">{t("noBacktestsForStrategy")}</p>
        <Link href="/backtester" passHref>
          <Button variant="secondary" className="mt-3">
            {t("runNewBacktest")}
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {backtests.map((backtest) => (
          <div
            key={backtest.id}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-md border p-4 hover:bg-secondary/30 transition-colors"
          >
            <div className="mb-2 sm:mb-0">
              <Link
                href={`/backtester/${backtest.id}`}
                className="text-lg font-semibold text-primary hover:underline flex items-center"
              >
                {t("backtestRun")}{" "}
                {format(new Date(backtest.created_at), "yyyy-MM-dd HH:mm")}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
              <p className="text-sm text-muted-foreground">
                {t("parameters")}:{" "}
                {backtest.parameters.ticker || backtest.parameters.symbol} |{" "}
                {t("capital")}: {backtest.parameters.initial_capital || 0}
                {backtest.parameters.commission_rate !== undefined &&
                  ` | ${t(
                    "commission"
                  )}: ${backtest.parameters.commission_rate.toFixed(3)}`}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-2 sm:space-y-0 sm:flex-row sm:space-x-2">
              {backtest.result?.total_return_pct !== undefined && (
                <span
                  className={cn(
                    "font-bold text-lg",
                    backtest.result.total_return_pct >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  )}
                >
                  {backtest.result.total_return_pct.toFixed(2)}%{" "}
                  {t("totalReturnShort")}
                </span>
              )}
              {getStatusBadge(backtest.status)}
              {/* 취소 버튼은 필요 시 여기에 추가 */}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
