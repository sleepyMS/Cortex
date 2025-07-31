// frontend/src/components/domain/backtester/BacktestResultSummary.tsx

"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card"; // Card 컴포넌트 임포트
import {
  TrendingUp,
  TrendingDown,
  Gauge,
  DollarSign,
  Award,
  XCircle,
} from "lucide-react"; // 아이콘 임포트
import { cn } from "@/lib/utils"; // cn 유틸리티 임포트

// 백엔드 schemas.BacktestResultSummary와 일치하는 타입 정의
interface BacktestResultSummaryProps {
  total_return_pct?: number | null;
  mdd_pct?: number | null;
  sharpe_ratio?: number | null;
  win_rate_pct?: number | null;
  // executed_at은 요약보다는 상위 백테스트 정보에 포함되거나 별도 표시
}

export function BacktestResultSummary({
  total_return_pct,
  mdd_pct,
  sharpe_ratio,
  win_rate_pct,
}: BacktestResultSummaryProps) {
  const t = useTranslations("BacktestResultSummary");

  // 데이터가 유효한지 확인 (백테스트가 완료되지 않았거나 실패했을 경우)
  const isDataAvailable =
    total_return_pct !== undefined &&
    total_return_pct !== null &&
    mdd_pct !== undefined &&
    mdd_pct !== null &&
    sharpe_ratio !== undefined &&
    sharpe_ratio !== null &&
    win_rate_pct !== undefined &&
    win_rate_pct !== null;

  if (!isDataAvailable) {
    return (
      <Card className="p-6 text-center text-muted-foreground flex items-center justify-center h-48">
        <XCircle className="h-6 w-6 mr-3 text-destructive" />
        <p>{t("noResultsAvailable")}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold text-foreground">{t("title")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 총 수익률 */}
        <MetricCard
          title={t("totalReturn")}
          value={`${total_return_pct.toFixed(2)}%`}
          icon={
            total_return_pct >= 0 ? (
              <TrendingUp className="text-green-500" />
            ) : (
              <TrendingDown className="text-red-500" />
            )
          }
          valueColor={total_return_pct >= 0 ? "text-green-500" : "text-red-500"}
        />

        {/* 최대 낙폭 (MDD) */}
        <MetricCard
          title={t("mdd")}
          value={`${mdd_pct.toFixed(2)}%`}
          icon={<Gauge className="text-yellow-500" />}
          valueColor="text-yellow-500"
        />

        {/* 샤프 지수 */}
        <MetricCard
          title={t("sharpeRatio")}
          value={sharpe_ratio.toFixed(2)}
          icon={<DollarSign className="text-blue-500" />}
          valueColor={sharpe_ratio >= 0 ? "text-blue-500" : "text-red-500"}
        />

        {/* 승률 */}
        <MetricCard
          title={t("winRate")}
          value={`${win_rate_pct.toFixed(2)}%`}
          icon={<Award className="text-purple-500" />}
          valueColor="text-purple-500"
        />
      </div>
    </Card>
  );
}

// 개별 지표 카드 컴포넌트
interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  valueColor?: string; // 값 텍스트 색상 (선택 사항)
}

function MetricCard({ title, value, icon, valueColor }: MetricCardProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-secondary/20 shadow-sm">
      <div className="mb-2">{icon}</div>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className={cn("mt-1 text-2xl font-bold", valueColor)}>{value}</p>
    </div>
  );
}
