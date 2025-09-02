"use client";

import { useTranslations } from "next-intl";
import { MarketplaceStrategyDetail } from "@/types/marketplace";
import { Button } from "@/components/ui/Button";
import { Tag, UserCircle, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle } from "lucide-react"; // [추가]

interface StrategyDetailHeaderProps {
  strategy: MarketplaceStrategyDetail;
  onPurchase: () => void; // [수정] 인자 없이 호출
  isPurchasing: boolean;
  isOwned: boolean; // [추가]
}

export const StrategyDetailHeader = ({
  strategy,
  onPurchase,
  isPurchasing,
  isOwned,
}: StrategyDetailHeaderProps) => {
  const t = useTranslations("Marketplace.strategyDetail");

  return (
    <div className="bg-card border rounded-xl p-6 md:p-8 mb-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <UserCircle className="h-4 w-4" />
            <span>
              {t("authorPrefix")} {strategy.author.username}
            </span>
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
              {/* 포지션 타입도 함께 표시하면 더 많은 정보를 제공할 수 있습니다. */}
              <Badge variant="outline" className="text-sm py-1">
                {strategy.productMetadata.positionType}
              </Badge>
            </div>
          )}
        </div>
        <div className="md:text-right flex-shrink-0">
          <p className="text-sm text-muted-foreground">{t("price")}</p>
          <p className="text-4xl font-bold text-primary mb-4">
            ${strategy.price.toFixed(2)}
          </p>

          {isOwned ? ( // [수정] isOwned 값에 따라 조건부 렌더링
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
