// frontend/src/components/domain/backtester/BacktestList.tsx

"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { format } from "date-fns";

import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// BacktestResultSummary의 pnl_curve_json 데이터 포인트를 위해 정의
interface PnlCurveDataPoint {
  time: string; // ISO 8601 문자열 (예: "2023-01-01T00:00:00Z")
  value: number;
}

// 백엔드 schemas.Backtest와 일치하는 타입 정의
export interface BacktestResponse {
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
    | "initializing"; // 백엔드 상태와 일치
  parameters: Record<string, any>;
  created_at: string; // ISO 8601 string
  updated_at?: string;
  completed_at?: string;

  result?: {
    // BacktestResultSummary (선택적) - pnl_curve_json 추가
    total_return_pct?: number;
    mdd_pct?: number;
    sharpe_ratio?: number;
    win_rate_pct?: number;
    pnl_curve_json?: PnlCurveDataPoint[] | null; // 👈 이 속성 추가
  };
  strategy?: {
    // StrategyBase (선택적)
    id: number;
    name: string;
  };
}

interface BacktestListProps {
  refetchTrigger?: number;
}

export function BacktestList({ refetchTrigger }: BacktestListProps) {
  const t = useTranslations("BacktestList");
  const queryClient = useQueryClient();

  const {
    data: backtests,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<BacktestResponse[], Error>({
    queryKey: ["userBacktests"],
    queryFn: async () => {
      const { data } = await apiClient.get("/backtests");
      return data;
    },
    refetchInterval: (query) => {
      const data = query.state.data as BacktestResponse[];
      const hasOngoingBacktests = data?.some(
        (bt) =>
          bt.status === "pending" ||
          bt.status === "running" ||
          bt.status === "initializing"
      );
      return hasOngoingBacktests ? 5000 : false;
    },
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    if (refetchTrigger !== undefined) {
      refetch();
    }
  }, [refetchTrigger, refetch]);

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
        <p>{t("fetchError", { errorDetail: error.message })}</p>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">
          {t("retryLoad")}
        </Button>
      </Card>
    );
  }

  if (!backtests || backtests.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p className="mb-2">{t("noBacktestsYet")}</p>
        <p className="text-sm">{t("runFirstBacktestHint")}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-2xl font-bold text-foreground">{t("title")}</h2>
      <p className="mb-6 text-muted-foreground">{t("description")}</p>

      <div className="space-y-4">
        {backtests.map((backtest) => (
          <div
            key={backtest.id}
            className="flex items-center justify-between rounded-md border p-4 hover:bg-secondary/30 transition-colors"
          >
            <div>
              <Link
                href={`/backtester/${backtest.id}`}
                className="text-lg font-semibold text-primary hover:underline flex items-center"
              >
                {backtest.strategy?.name || t("unknownStrategy")} -{" "}
                {backtest.parameters.ticker || backtest.parameters.symbol}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
              <p className="text-sm text-muted-foreground">
                {t("startedAt")}:{" "}
                {format(new Date(backtest.created_at), "yyyy-MM-dd HH:mm")}
              </p>
              {backtest.result?.total_return_pct !== undefined && (
                <p className="text-sm text-muted-foreground">
                  {t("totalReturn")}:{" "}
                  <span
                    className={cn(
                      "font-bold",
                      backtest.result.total_return_pct >= 0
                        ? "text-green-500"
                        : "text-red-500"
                    )}
                  >
                    {backtest.result.total_return_pct.toFixed(2)}%
                  </span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-end space-y-2">
              {getStatusBadge(backtest.status)}
              {backtest.status === "running" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    /* TODO: 취소 기능 */
                  }}
                >
                  {t("cancelBacktest")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
