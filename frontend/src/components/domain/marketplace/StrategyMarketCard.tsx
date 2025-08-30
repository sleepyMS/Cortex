// file: frontend/src/components/domain/marketplace/StrategyMarketCard.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  ArrowDownRight,
  Target,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarketplaceStrategy } from "@/types/marketplace";

// UI 컴포넌트 import
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

/**
 * StrategyMarketCard 컴포넌트에 전달될 props 타입 정의
 */
interface StrategyMarketCardProps {
  /** 표시할 전략의 데이터 */
  strategy: MarketplaceStrategy;
  /** 사용자가 이 전략을 이미 구매했는지 여부 */
  isOwned: boolean;
  /** 구매 버튼 클릭 시 호출될 함수 */
  onPurchase: () => void;
  /** 현재 이 전략의 구매가 진행 중인지 여부 */
  isPurchasing: boolean;
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
}: StrategyMarketCardProps) => {
  const t = useTranslations("Marketplace.strategyMarketCard");
  const { summaryMetrics: metrics } = strategy;

  /**
   * isOwned와 isPurchasing 상태에 따라 올바른 구매 버튼을 렌더링하는 함수
   */
  const renderPurchaseButton = () => {
    // 1. 이미 보유 중인 전략이라면 '보유 중' 버튼 표시
    if (isOwned) {
      return (
        <Button disabled className="w-full">
          {t("ownedButton")}
        </Button>
      );
    }

    // 2. 보유하지 않은 전략이라면 구매 버튼 표시
    return (
      <Button onClick={onPurchase} disabled={isPurchasing} className="w-full">
        {isPurchasing ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <ShoppingCart className="mr-2 h-4 w-4" />
        )}
        {isPurchasing ? t("purchasing") : t("purchaseButton")}
      </Button>
    );
  };

  return (
    <Card className="flex flex-col h-full transition-all duration-300 border-2 border-transparent hover:border-primary hover:shadow-lg">
      {/* 카드 상단부는 상세 페이지로 이동하는 링크 역할 */}
      <Link
        href={`/marketplace/strategies/${strategy.id}`}
        className="block group flex-grow"
        aria-label={`${strategy.name} 상세 정보 보기`}
      >
        <CardHeader>
          <CardDescription className="font-medium text-primary">
            {t("authorPrefix")} {strategy.author.username}
          </CardDescription>
          <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
            {strategy.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-grow items-center justify-around text-center py-6">
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

      {/* 카드 하단부는 링크와 분리하여 구매 액션만 담당 */}
      <CardFooter className="flex-col items-stretch pt-4 border-t bg-muted/50">
        <div className="flex justify-between items-baseline mb-4">
          <span className="text-sm text-muted-foreground">{t("price")}</span>
          <span className="text-2xl font-bold text-foreground">
            ${strategy.price.toFixed(2)}
          </span>
        </div>
        {renderPurchaseButton()}
      </CardFooter>
    </Card>
  );
};
