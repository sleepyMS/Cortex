// frontend/src/app/[locale]/backtester/[backtestId]/page.tsx

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation"; // useParams, useRouter 임포트
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import apiClient from "@/lib/apiClient";
import { AuthGuard } from "@/components/auth/AuthGuard"; // 인증 가드
import { Spinner } from "@/components/ui/Spinner"; // 스피너
import { Button } from "@/components/ui/Button"; // 버튼
import { Separator } from "@/components/ui/Separator"; // 구분선
import { BacktestResultSummary } from "@/components/domain/backtester/BacktestResultSummary"; // 👈 성과 요약 컴포넌트
import { EquityChart } from "@/components/domain/backtester/EquityChart"; // 👈 자산 곡선 차트 컴포넌트
import { TradeLogTable } from "@/components/domain/backtester/TradeLogTable"; // 👈 거래 내역 테이블 컴포넌트

import type { BacktestResponse } from "@/components/domain/backtester/BacktestList"; // 백테스트 응답 타입 재사용
import type { TradeLogEntry } from "@/components/domain/backtester/TradeLogTable"; // 거래 내역 타입 재사용
// schemas.py에 있는 Backtest와 TradeLogEntry 스키마와 일치해야 합니다.
// interface BacktestDetails extends BacktestResponse { } // BacktestResponse를 확장하거나 직접 스키마 정의
// interface TradeLogs extends Array<TradeLogEntry> { }

export default function BacktestDetailPage() {
  const t = useTranslations("BacktestDetailPage");
  const params = useParams();
  const router = useRouter(); // 라우터 훅
  const backtestId = params.backtestId as string; // URL에서 백테스트 ID 가져오기

  // 백테스트 상세 정보 가져오기 (GET /api/backtests/{backtestId})
  const {
    data: backtestData,
    isLoading: isLoadingBacktest,
    isError: isErrorBacktest,
    error: errorBacktest,
    refetch: refetchBacktest,
  } = useQuery<BacktestResponse, Error>({
    queryKey: ["backtestDetails", backtestId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/backtests/${backtestId}`);
      return data;
    },
    enabled: !!backtestId, // backtestId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 5, // 5분 동안 fresh 상태 유지
  });

  // 거래 내역 가져오기 (GET /api/backtests/{backtestId}/trade_logs)
  const {
    data: tradeLogs,
    isLoading: isLoadingTradeLogs,
    isError: isErrorTradeLogs,
    error: errorTradeLogs,
    refetch: refetchTradeLogs,
  } = useQuery<TradeLogEntry[], Error>({
    queryKey: ["backtestTradeLogs", backtestId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/backtests/${backtestId}/trade_logs`
      );
      return data;
    },
    enabled: !!backtestId, // backtestId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 5, // 5분 동안 fresh 상태 유지
  });

  // 전체 로딩 상태
  if (isLoadingBacktest || isLoadingTradeLogs) {
    return (
      <AuthGuard>
        <div className="container mx-auto max-w-5xl px-4 py-8 flex h-full min-h-[400px] items-center justify-center">
          <Spinner size="lg" />
          <p className="ml-4 text-muted-foreground">{t("loadingResults")}</p>
        </div>
      </AuthGuard>
    );
  }

  // 백테스트 데이터 없음 (404 등) 처리
  if (!backtestData) {
    return (
      <AuthGuard>
        <div className="container mx-auto max-w-5xl px-4 py-8 text-center">
          <h1 className="text-3xl font-bold text-destructive mb-4">
            {t("backtestNotFoundTitle")}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("backtestNotFoundMessage")}
          </p>
          <Button onClick={() => router.push("/backtester")}>
            {t("backToBacktestList")}
          </Button>
        </div>
      </AuthGuard>
    );
  }

  // 오류 상태 처리
  if (isErrorBacktest || isErrorTradeLogs) {
    const errorMessage =
      errorBacktest?.message || errorTradeLogs?.message || t("unknownError");
    return (
      <AuthGuard>
        <div className="container mx-auto max-w-5xl px-4 py-8 text-destructive-foreground text-center">
          <h1 className="text-3xl font-bold text-destructive mb-4">
            {t("errorLoadingResultsTitle")}
          </h1>
          <p className="mb-2">
            {t("fetchError", { errorDetail: errorMessage })}
          </p>
          <Button
            onClick={() => {
              refetchBacktest();
              refetchTradeLogs();
            }}
            variant="outline"
            className="mt-4"
          >
            {t("retryLoad")}
          </Button>
        </div>
      </AuthGuard>
    );
  }

  // 성공적으로 데이터 로드 완료
  return (
    <AuthGuard>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-3xl font-bold text-foreground">
          {t("title", {
            strategyName: backtestData.strategy?.name || t("unknownStrategy"),
          })}
        </h1>
        <p className="mb-8 text-lg text-muted-foreground">
          {t("subtitle", { backtestId: backtestData.id })}
        </p>

        {/* 성과 요약 */}
        <BacktestResultSummary
          total_return_pct={backtestData.result?.total_return_pct}
          mdd_pct={backtestData.result?.mdd_pct}
          sharpe_ratio={backtestData.result?.sharpe_ratio}
          win_rate_pct={backtestData.result?.win_rate_pct}
        />

        <Separator className="my-8" />

        {/* 자산 변화 곡선 차트 */}
        <EquityChart pnlCurveJson={backtestData.result?.pnl_curve_json} />

        <Separator className="my-8" />

        {/* 거래 내역 테이블 */}
        <TradeLogTable tradeLogs={tradeLogs} />

        {/* 백테스트 목록으로 돌아가기 버튼 */}
        <div className="flex justify-end mt-8">
          <Button
            onClick={() => router.push("/backtester")}
            variant="secondary"
          >
            {t("backToBacktestList")}
          </Button>
        </div>
      </div>
    </AuthGuard>
  );
}
