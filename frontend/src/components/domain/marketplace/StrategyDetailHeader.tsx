"use client";

import { useTranslations } from "next-intl";
import { MarketplaceStrategyDetail } from "@/types/marketplace";
import { Button } from "@/components/ui/Button";
import { Tag, UserCircle, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface StrategyDetailHeaderProps {
  strategy: MarketplaceStrategyDetail;
  onPurchase: (strategyId: string) => void;
  isPurchasing: boolean;
}

export const StrategyDetailHeader = ({
  strategy,
  onPurchase,
  isPurchasing,
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
          {strategy.tags && (
            <div className="flex flex-wrap gap-2 mt-3">
              {strategy.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="md:text-right flex-shrink-0">
          <p className="text-sm text-muted-foreground">Price</p>
          <p className="text-4xl font-bold text-primary mb-4">
            ${strategy.price.toFixed(2)}
          </p>
          <Button
            size="lg"
            onClick={() => onPurchase(strategy.id)}
            disabled={isPurchasing}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            {isPurchasing ? "처리 중..." : t("purchaseButton")}
          </Button>
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
