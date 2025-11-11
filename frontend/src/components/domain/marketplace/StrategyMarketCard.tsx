// file: frontend/src/components/domain/marketplace/StrategyMarketCard.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShoppingCart,
  Coins,
  CircleAlert,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketplaceStrategy } from "@/types/marketplace";
import { useUserStore } from "@/store/userStore";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

interface StrategyMarketCardProps {
  strategy: MarketplaceStrategy;
  isOwned: boolean;
  onPurchase: () => void;
  isPurchasing: boolean;
  onChargeCredits: () => void; // [신규] props 타입 정의 추가
}

/**
 * 카드 내부의 개별 통계 UI를 위한 작은 컴포넌트
 */
const StatItem = ({
  Icon,
  label,
  value,
  unit,
  colorClass,
}: {
  Icon: React.ElementType;
  label: string;
  value: number;
  unit: string;
  colorClass: string;
}) => (
  <div className="flex flex-col items-center">
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span>{label}</span>
    </div>
    <p className={cn("text-lg font-bold", colorClass)}>
      {value.toFixed(2)}
      <span className="text-sm font-normal">{unit}</span>
    </p>
  </div>
);

export const StrategyMarketCard = ({
  strategy,
  isOwned,
  onPurchase,
  isPurchasing,
  onChargeCredits,
}: StrategyMarketCardProps) => {
  const t = useTranslations("Marketplace.strategyMarketCard");
  const tCommon = useTranslations("Marketplace");
  const { creditBalance } = useUserStore();

  // 전략은 '유료 크레딧'으로만 구매 가능
  const hasEnoughCredits = creditBalance
    ? creditBalance.cashCreditBalance >= strategy.price
    : false;

  const { latestBacktestSummary: metrics } = strategy;
  const displayMetrics = {
    totalReturnPct: metrics?.totalReturnPct ?? 0,
    mddPct: metrics?.mddPct ?? 0,
    winRatePct: metrics?.winRatePct ?? 0,
  };

  const renderPurchaseButton = () => {
    if (isOwned) {
      return (
        <Button disabled className="w-full">
          <CheckCircle className="mr-2 h-4 w-4" />
          {tCommon("ownedButton")}
        </Button>
      );
    }

    if (!creditBalance) {
      return <Button disabled className="w-full h-10 animate-pulse" />;
    }

    if (!hasEnoughCredits) {
      return (
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={onChargeCredits}
            className="w-full"
          >
            <Coins className="mr-2 h-4 w-4" />
            {tCommon("chargeCreditButton")}
          </Button>
          <p className="text-xs text-destructive text-center flex items-center justify-center gap-1">
            <CircleAlert className="h-3 w-3" />
            {tCommon("insufficientPaidCredit")}
          </p>
        </div>
      );
    }

    return (
      <Button onClick={onPurchase} disabled={isPurchasing} className="w-full">
        {isPurchasing ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <ShoppingCart className="mr-2 h-4 w-4" />
        )}
        {isPurchasing
          ? tCommon("purchasing")
          : tCommon("purchaseForPaidCredit", {
              price: strategy.price.toLocaleString(),
            })}
      </Button>
    );
  };

  return (
    <Card className="flex flex-col h-full transition-all duration-300 border-2 border-transparent hover:border-primary hover:shadow-lg">
      <Link
        href={`/marketplace/strategies/${strategy.id}`}
        className="block group flex-grow"
      >
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardDescription className="font-medium text-primary">
              {t("authorPrefix")} {strategy.author.username}
            </CardDescription>
            {strategy.productMetadata?.category && (
              <Badge variant="outline">
                {strategy.productMetadata.category}
              </Badge>
            )}
          </div>
          <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
            {strategy.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-grow items-center justify-around text-center py-6">
          <StatItem
            Icon={
              displayMetrics.totalReturnPct >= 0 ? ArrowUpRight : ArrowDownRight
            }
            label={t("totalReturn")}
            value={displayMetrics.totalReturnPct}
            unit="%"
            colorClass={
              displayMetrics.totalReturnPct >= 0
                ? "text-emerald-500"
                : "text-rose-500"
            }
          />
          <StatItem
            Icon={ArrowDownRight}
            label={t("mdd")}
            value={displayMetrics.mddPct}
            unit="%"
            colorClass="text-amber-600"
          />
          <StatItem
            Icon={Target}
            label={t("winRate")}
            value={displayMetrics.winRatePct}
            unit="%"
            colorClass="text-sky-500"
          />
        </CardContent>
      </Link>
      <CardFooter className="flex-col items-stretch pt-4 border-t bg-muted/50">
        <div className="flex justify-between items-baseline mb-4">
          <span className="text-sm text-muted-foreground">{t("price")}</span>
          <div className="flex items-center text-2xl font-bold text-foreground">
            <Coins className="h-5 w-5 text-yellow-500 mr-1.5" />
            <span>{strategy.price.toLocaleString()}</span>
          </div>
        </div>
        {renderPurchaseButton()}
      </CardFooter>
    </Card>
  );
};
