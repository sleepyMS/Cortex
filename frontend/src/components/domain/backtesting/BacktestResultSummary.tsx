import * as React from "react";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/ui/StatCard";
import {
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShieldCheck,
  Percent,
  BarChartHorizontal,
} from "lucide-react";

// API 응답 데이터의 타입을 명확히 정의 (DB 스키마 참조)
interface BacktestResult {
  total_return_pct: number | null;
  mdd_pct: number | null;
  win_rate_pct: number | null;
  sharpe_ratio?: number | null; // Optional properties
  profit_factor?: number | null;
  total_trades?: number | null;
}

interface BacktestResultSummaryProps {
  result: BacktestResult;
  isLoading?: boolean;
}

// 각 통계 카드를 렌더링하기 위한 설정 데이터
// -> 새로운 통계를 추가하고 싶을 때 이 배열에 객체 하나만 추가하면 됩니다.
const statsConfig = (t: any) => [
  {
    key: "totalReturn",
    title: t("totalReturn"),
    getValue: (r: BacktestResult) =>
      `${r.total_return_pct?.toFixed(2) ?? "N/A"}%`,
    Icon: (r: BacktestResult) =>
      r.total_return_pct == null
        ? Percent
        : r.total_return_pct >= 0
        ? ArrowUpRight
        : ArrowDownRight,
    colorClass: (r: BacktestResult) =>
      r.total_return_pct == null
        ? ""
        : r.total_return_pct >= 0
        ? "text-emerald-500"
        : "text-rose-500",
    description: t("totalReturnDesc"),
  },
  {
    key: "mdd",
    title: t("mdd"),
    getValue: (r: BacktestResult) => `${r.mdd_pct?.toFixed(2) ?? "N/A"}%`,
    Icon: () => ArrowDownRight,
    colorClass: () => "text-rose-500",
    description: t("mddDesc"),
  },
  {
    key: "winRate",
    title: t("winRate"),
    getValue: (r: BacktestResult) => `${r.win_rate_pct?.toFixed(1) ?? "N/A"}%`,
    Icon: () => Target,
    description: t("winRateDesc"),
  },
  {
    key: "sharpeRatio",
    title: t("sharpeRatio"),
    getValue: (r: BacktestResult) => r.sharpe_ratio?.toFixed(2) ?? "N/A",
    Icon: () => ShieldCheck,
    description: t("sharpeRatioDesc"),
  },
  {
    key: "profitFactor",
    title: t("profitFactor"),
    getValue: (r: BacktestResult) => r.profit_factor?.toFixed(2) ?? "N/A",
    Icon: () => Percent,
    description: t("profitFactorDesc"),
  },
  {
    key: "totalTrades",
    title: t("totalTrades"),
    getValue: (r: BacktestResult) => r.total_trades?.toString() ?? "N/A",
    Icon: () => BarChartHorizontal,
    description: t("totalTradesDesc"),
  },
];

export const BacktestResultSummary = ({
  result,
  isLoading,
}: BacktestResultSummaryProps) => {
  // 다국어 번역 함수
  const t = useTranslations("BacktestResultSummary");
  const config = statsConfig(t);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{t("title")}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoading
          ? // 로딩 중일 때 스켈레톤 UI 표시
            Array.from({ length: 6 }).map((_, i) => (
              <StatCard key={i} title="" value="" isLoading />
            ))
          : // 데이터가 있을 때 StatCard 렌더링
            config.map((stat) => (
              <StatCard
                key={stat.key}
                title={stat.title}
                value={stat.getValue(result)}
                icon={stat.Icon(result)}
                colorClass={stat.colorClass ? stat.colorClass(result) : ""}
                description={stat.description}
              />
            ))}
      </div>
    </div>
  );
};
