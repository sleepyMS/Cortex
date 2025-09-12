// file: src/components/domain/marketplace/StrategyInfoCard.tsx

"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Percent,
  Clock,
  BarChart,
  CalendarDays,
} from "lucide-react";
import { MarketplaceStrategyDetail } from "@/types/marketplace";
import { BacktestResultSummary } from "@/types/backtest";
import { format, isValid } from "date-fns";

// VitalsItem Props 타입 정의
interface VitalsItemProps {
  icon: React.ElementType; // Lucide icon 컴포넌트 타입
  label: string;
  value: string;
}

// 주요 특성을 표시하기 위한 헬퍼 컴포넌트
const VitalsItem: React.FC<VitalsItemProps> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="flex items-center justify-between text-sm">
    <p className="flex items-center text-muted-foreground">
      <Icon className="h-4 w-4 mr-2" />
      {label}
    </p>
    <p className="font-semibold">{value}</p>
  </div>
);

// [수정] StrategyInfoCard Props 타입 정의
interface StrategyInfoCardProps {
  strategy: MarketplaceStrategyDetail;
  backtestResult: BacktestResultSummary | null;
}

export function StrategyInfoCard({
  strategy,
  backtestResult,
}: StrategyInfoCardProps) {
  const t = useTranslations("Marketplace.StrategyInfoCard");

  // 메타데이터에서 태그 정보 추출
  const tags = [
    strategy.productMetadata?.category,
    strategy.productMetadata?.positionType,
    ...(strategy.targetCoins?.map((c) => c.ticker) || []),
  ].filter(Boolean) as string[]; // 필터링 후 string[]으로 타입 캐스팅

  const backtestParams = strategy.representativeBacktest?.parameters;
  const startDate = backtestParams?.startDate
    ? new Date(backtestParams.startDate)
    : null;
  const endDate = backtestParams?.endDate
    ? new Date(backtestParams.endDate)
    : null;
  const dateRangeString =
    startDate && isValid(startDate) && endDate && isValid(endDate)
      ? `${format(startDate, "yy.MM.dd")} - ${format(endDate, "yy.MM.dd")}`
      : "N/A";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 1. 전략 태그 */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>

        {/* 2. 판매자 설명 */}
        <p className="text-sm text-muted-foreground pt-2">
          {strategy.description || t("noDescription")}
        </p>

        {/* backtestResult가 있을 때만 Vitals 섹션 렌더링 */}
        {backtestResult && (
          <>
            <Separator />
            {/* 3. 주요 특성 (Vitals) */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">{t("vitals.title")}</h4>

              <VitalsItem
                icon={CalendarDays}
                label={t("vitals.period")}
                value={dateRangeString}
              />
              <VitalsItem
                icon={TrendingUp}
                label={t("vitals.profitFactor")}
                value={backtestResult.profitFactor?.toFixed(2) ?? "N/A"}
              />
              <VitalsItem
                icon={ShieldCheck}
                label={t("vitals.sharpeRatio")}
                value={backtestResult.sharpeRatio?.toFixed(2) ?? "N/A"}
              />
              <VitalsItem
                icon={Percent}
                label={t("vitals.winRate")}
                value={`${backtestResult.winRatePct?.toFixed(1) ?? "N/A"}%`}
              />
              <VitalsItem
                icon={Clock}
                label={t("vitals.avgHoldingPeriod")}
                value={t("vitals.avgHoldingPeriodValue", {
                  days:
                    backtestResult.avgHoldingPeriodDays?.toFixed(1) ?? "N/A",
                })}
              />
              <VitalsItem
                icon={BarChart}
                label={t("vitals.totalTrades")}
                value={backtestResult.totalTrades?.toString() ?? "N/A"}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
