import * as React from "react";
import { useTranslations } from "next-intl";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShieldCheck,
  Percent,
  BarChartHorizontal,
} from "lucide-react";
import { BacktestResult } from "@/types/backtest";

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
      `${r.totalReturnPct?.toFixed(2) ?? "N/A"}%`,
    Icon: (r: BacktestResult) =>
      r.totalReturnPct == null
        ? Percent
        : r.totalReturnPct >= 0
        ? ArrowUpRight
        : ArrowDownRight,
    colorClass: (r: BacktestResult) =>
      r.totalReturnPct == null
        ? ""
        : r.totalReturnPct >= 0
        ? "text-emerald-500"
        : "text-rose-500",
    description: t("totalReturnDesc"),
  },
  {
    key: "mdd",
    title: t("mdd"),
    getValue: (r: BacktestResult) => `${r.mddPct?.toFixed(2) ?? "N/A"}%`,
    Icon: () => ArrowDownRight,
    colorClass: () => "text-rose-500",
    description: t("mddDesc"),
  },
  {
    key: "winRate",
    title: t("winRate"),
    getValue: (r: BacktestResult) => `${r.winRatePct?.toFixed(1) ?? "N/A"}%`,
    Icon: () => Target,
    description: t("winRateDesc"),
  },
  // {
  //   key: "sharpeRatio",
  //   title: t("sharpeRatio"),
  //   getValue: (r: BacktestResult) => r.sharpeRatio?.toFixed(2) ?? "N/A",
  //   Icon: () => ShieldCheck,
  //   description: t("sharpeRatioDesc"),
  // },
  // {
  //   key: "sortinoRatio",
  //   title: t("sortinoRatio"),
  //   getValue: (r: BacktestResult) => r.sortinoRatio?.toFixed(2) ?? "N/A",
  //   Icon: () => ShieldCheck,
  //   description: t("sortinoRatioDesc"),
  // },
  // {
  //   key: "profitFactor",
  //   title: t("profitFactor"),
  //   getValue: (r: BacktestResult) => r.profitFactor?.toFixed(2) ?? "N/A",
  //   Icon: () => Percent,
  //   description: t("profitFactorDesc"),
  // },
  {
    key: "totalTrades",
    title: t("totalTrades"),
    getValue: (r: BacktestResult) => r.totalTrades?.toString() ?? "N/A",
    Icon: () => BarChartHorizontal,
    description: t("totalTradesDesc"),
  },
];

export const BacktestResultSummary = ({
  result,
  isLoading,
}: BacktestResultSummaryProps) => {
  const t = useTranslations("BacktestResultSummary");
  const config = statsConfig(t);

  return (
    // 최상위 div를 Card 컴포넌트로 변경합니다.
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <StatCard key={i} title="" value="" isLoading />
              ))
            : config.map((stat) => (
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
      </CardContent>
    </Card>
  );
};
