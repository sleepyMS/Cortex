// file: frontend/src/components/domain/marketplace/ProductGrid.tsx
"use client";

import { MarketplaceStrategy, ShopItem } from "@/types/marketplace";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Inbox, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { StrategyMarketCard } from "./StrategyMarketCard";
import { ShopItemCard } from "./ShopItemCard";

interface ProductGridProps {
  isLoading: boolean;
  isError: boolean;
  products: (MarketplaceStrategy | ShopItem)[];
  productType: "STRATEGY" | "SHOP_ITEM";
  purchasedStrategyIds: string[];
  ownedItemIds: string[];
  onPurchaseClick: (product: any) => void;
  purchaseMutation: any;
  onRefetch: () => void;
  // [신규] 크레딧 충전 핸들러를 props로 받도록 추가
  onChargeCredits: () => void;
}

export const ProductGrid = ({
  isLoading,
  isError,
  products,
  productType,
  purchasedStrategyIds,
  ownedItemIds,
  onPurchaseClick,
  purchaseMutation,
  onRefetch,
  onChargeCredits, // [신규] props 받기
}: ProductGridProps) => {
  const t = useTranslations("Marketplace");

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[350px] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    // ... (기존 에러 처리 UI와 동일)
    return (
      <Alert variant="destructive" className="mt-8 max-w-lg mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("loadErrorTitle")}</AlertTitle>
        <AlertDescription>{t("loadErrorDescription")}</AlertDescription>
        <Button onClick={onRefetch} className="mt-4">
          {t("retryButton")}
        </Button>
      </Alert>
    );
  }

  if (products.length === 0) {
    // ... (기존 상품 없음 UI와 동일)
    return (
      <div className="text-center py-20 bg-muted/50 rounded-lg flex flex-col items-center">
        <Inbox className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-xl font-semibold mt-4">{t("emptyTitle")}</h3>
        <p className="text-muted-foreground mt-2">{t("emptyDescription")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {products.map((product) =>
        productType === "STRATEGY" ? (
          <StrategyMarketCard
            key={product.id}
            strategy={product as MarketplaceStrategy}
            isOwned={purchasedStrategyIds.includes(
              (product as MarketplaceStrategy).linkedResourceId
            )}
            onPurchase={() => onPurchaseClick(product)}
            isPurchasing={
              purchaseMutation.isPending &&
              purchaseMutation.variables?.items[0]?.productId === product.id
            }
            // [신규] onChargeCredits 핸들러를 하위 컴포넌트로 전달
            onChargeCredits={onChargeCredits}
          />
        ) : (
          <ShopItemCard
            key={product.id}
            item={product as ShopItem}
            isOwned={ownedItemIds.includes(product.id)}
            onPurchase={() => onPurchaseClick(product)}
            isPurchasing={
              purchaseMutation.isPending &&
              purchaseMutation.variables?.items[0]?.productId === product.id
            }
            // [신규] onChargeCredits 핸들러를 하위 컴포넌트로 전달
            onChargeCredits={onChargeCredits}
          />
        )
      )}
    </div>
  );
};
