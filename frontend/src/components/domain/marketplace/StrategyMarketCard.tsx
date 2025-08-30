"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShoppingCart,
  Loader2,
} from "lucide-react";

import { MarketplaceStrategy } from "@/types/marketplace";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// 카드 내부의 개별 통계 UI를 위한 작은 컴포넌트
const StatItem = ({
  Icon,
  label,
  value,
  unit,
  colorClass,
}: {
  Icon: React.ElementType;
  label: string;
  value: number | null;
  unit: string;
  colorClass: string;
}) => (
  <div className="flex flex-col items-center">
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
    <p className={cn("text-lg font-bold", colorClass)}>
      {value?.toFixed(2) ?? "N/A"}
      <span className="text-sm font-normal">{unit}</span>
    </p>
  </div>
);

interface StrategyMarketCardProps {
  strategy: MarketplaceStrategy;
  onPurchase: () => void;
  isPurchasing: boolean;
}

export const StrategyMarketCard = ({
  strategy,
  onPurchase,
  isPurchasing,
}: StrategyMarketCardProps) => {
  const t = useTranslations("Marketplace.strategyMarketCard");
  const { summaryMetrics: metrics } = strategy;

  return (
    <Card className="flex flex-col h-full transition-all duration-300 border-2 border-transparent hover:border-primary hover:shadow-lg">
      {/* 카드 상단부는 상세 페이지로 이동하는 링크 역할 */}
      <Link
        href={`/marketplace/strategies/${strategy.id}`}
        className="block group flex-grow"
      >
        <CardHeader>
          <CardDescription className="font-medium text-primary">
            {t("authorPrefix")} {strategy.author.username}
          </CardDescription>
          <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
            {strategy.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-around text-center py-6">
          <StatItem
            Icon={metrics.totalReturnPct >= 0 ? ArrowUpRight : ArrowDownRight}
            label={t("totalReturn")}
            value={metrics.totalReturnPct}
            unit="%"
            colorClass={
              metrics.totalReturnPct >= 0 ? "text-emerald-500" : "text-rose-500"
            }
          />
          <StatItem
            Icon={ArrowDownRight}
            label={t("mdd")}
            value={metrics.mddPct}
            unit="%"
            colorClass="text-amber-600"
          />
          <StatItem
            Icon={Target}
            label={t("winRate")}
            value={metrics.winRatePct}
            unit="%"
            colorClass="text-sky-500"
          />
        </CardContent>
      </Link>

      {/* 카드 하단부는 구매 액션을 담당 */}
      <CardFooter className="flex-col items-stretch pt-4 border-t bg-muted/50">
        <div className="flex justify-between items-baseline mb-4">
          <span className="text-sm text-muted-foreground">{t("price")}</span>
          <span className="text-2xl font-bold text-foreground">
            ${strategy.price.toFixed(2)}
          </span>
        </div>
        <Button onClick={onPurchase} disabled={isPurchasing}>
          {isPurchasing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShoppingCart className="mr-2 h-4 w-4" />
          )}
          {isPurchasing ? t("purchasing") : t("purchaseButton")}
        </Button>
      </CardFooter>
    </Card>
  );
};
