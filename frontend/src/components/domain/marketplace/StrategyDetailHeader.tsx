"use client";

import { useTranslations } from "next-intl";
import { MarketplaceStrategyDetail } from "@/types/marketplace";
import { Button } from "@/components/ui/Button";
import {
  Tag,
  UserCircle,
  ShoppingCart,
  CheckCircle,
  CalendarDays,
} from "lucide-react"; // [추가] CalendarDays
import { Badge } from "@/components/ui/Badge";
import { format, isValid } from "date-fns"; // [추가] date-fns

interface StrategyDetailHeaderProps {
  strategy: MarketplaceStrategyDetail;
  onPurchase: () => void;
  isPurchasing: boolean;
  isOwned: boolean;
}

export const StrategyDetailHeader = ({
  strategy,
  onPurchase,
  isPurchasing,
  isOwned,
}: StrategyDetailHeaderProps) => {
  const t = useTranslations("Marketplace.strategyDetail");

  // [추가] 대표 백테스트에서 날짜 정보를 추출하고 포맷팅하는 로직
  const backtestParams = strategy.representativeBacktest?.parameters;
  const startDate = backtestParams?.startDate
    ? new Date(backtestParams.startDate)
    : null;
  const endDate = backtestParams?.endDate
    ? new Date(backtestParams.endDate)
    : null;
  const dateRangeString =
    startDate && isValid(startDate) && endDate && isValid(endDate)
      ? `${format(startDate, "yyyy.MM.dd")} - ${format(endDate, "yyyy.MM.dd")}`
      : null;

  return (
    <div className="bg-card border rounded-xl p-6 md:p-8 mb-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              <span>
                {t("authorPrefix")} {strategy.author.username}
              </span>
            </div>
            {dateRangeString && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {t("backtestPeriod")}: {dateRangeString}
                </span>
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {strategy.name}
          </h1>
          {strategy.productMetadata?.category && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="text-sm py-1">
                <Tag className="mr-2 h-4 w-4" />
                {strategy.productMetadata.category}
              </Badge>
              <Badge variant="outline" className="text-sm py-1">
                {strategy.productMetadata.positionType}
              </Badge>
            </div>
          )}
        </div>
        <div className="md:text-right flex-shrink-0">
          <p className="text-sm text-muted-foreground">{t("priceLabel")}</p>
          <p className="text-4xl font-bold text-primary mb-4">
            ${strategy.price.toFixed(2)}
          </p>

          {isOwned ? (
            <Button size="lg" disabled>
              <CheckCircle className="mr-2 h-5 w-5" />
              {t("ownedButton")}
            </Button>
          ) : (
            <Button size="lg" onClick={onPurchase} disabled={isPurchasing}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              {isPurchasing ? t("purchasingButton") : t("purchaseButton")}
            </Button>
          )}
        </div>
      </div>
      {strategy.description && (
        <p className="text-muted-foreground mt-6 pt-6 border-t">
          {strategy.description}
        </p>
      )}
    </div>
  );
};
