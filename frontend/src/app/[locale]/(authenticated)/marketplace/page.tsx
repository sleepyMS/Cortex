// file: frontend/src/app/[locale]/marketplace/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Store } from "lucide-react";
import {
  MarketplaceStrategy,
  ShopItem,
  PaginatedProductsResponse,
} from "@/types/marketplace";

// --- 1. 데이터 공급자 (Hooks) ---
import { useProducts, ProductFilters } from "@/hooks/useMarketplace";
import { usePurchaseMutation } from "@/hooks/useMarketplace";
import {
  useUserInventoryQuery,
  usePurchasedStrategiesQuery,
} from "@/hooks/useInventory";

// --- 2. 연주자 (Presentational Components) ---
import { AuthGuard } from "@/components/auth/AuthGuard";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { MarketplaceFilter } from "@/components/domain/marketplace/MarketplaceFilter";
import { ProductGrid } from "@/components/domain/marketplace/ProductGrid";
import { PaginationComponent } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";

type PurchasableProduct = MarketplaceStrategy | ShopItem;

// --- 3. 지휘자 (Page Component) ---
export default function MarketplacePage() {
  const t = useTranslations("Marketplace");

  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<"STRATEGY" | "SHOP_ITEM">(
    "STRATEGY"
  );
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<
    Omit<ProductFilters, "page" | "limit" | "productType">
  >({ sortBy: "createdAt_desc" });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [productToPurchase, setProductToPurchase] =
    useState<PurchasableProduct | null>(null);

  // --- 데이터 로직 ---
  const {
    data: response,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useProducts({
    page,
    limit: 12,
    productType: activeTab,
    ...filters,
  });

  const { data: ownedItemIds = [] } = useUserInventoryQuery({
    select: (data) => data.map((item) => item.itemId),
  });

  const { data: purchasedStrategyIds = [] } = usePurchasedStrategiesQuery({
    select: (data) => data.map((strategy) => strategy.strategyId),
  });

  const purchaseMutation = usePurchaseMutation();

  const products = response?.products || [];
  const totalPages = response?.meta.totalPages || 1;

  // --- 이벤트 핸들러 ---
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as "STRATEGY" | "SHOP_ITEM");
    setPage(1);
    setFilters({ sortBy: "createdAt_desc" });
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: Omit<ProductFilters, "page" | "limit" | "productType">) => {
      setPage(1);
      setFilters(newFilters);
    },
    []
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);
  const handlePurchaseClick = useCallback((product: PurchasableProduct) => {
    setProductToPurchase(product);
    setIsConfirmModalOpen(true);
  }, []);

  const handleConfirmPurchase = useCallback(() => {
    if (!productToPurchase) return;
    purchaseMutation.mutate(
      { items: [{ productId: productToPurchase.id, quantity: 1 }] },
      {
        onSuccess: () => {
          setIsConfirmModalOpen(false);
          setProductToPurchase(null);
        },
      }
    );
  }, [productToPurchase, purchaseMutation]);

  // --- UI 렌더링 ---
  return (
    <AuthGuard>
      <TooltipProvider delayDuration={100}>
        <div className="container mx-auto max-w-screen-xl px-4 py-8 md:py-12">
          {/* 페이지 헤더 */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="p-3 mb-4 bg-primary/10 rounded-full border-2 border-primary/20">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {t("title")}
            </h1>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl">
              {t("description")}
            </p>
          </div>

          {/* 탭 및 콘텐츠 영역 */}
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="STRATEGY">
                {t("strategyMarketTab")}
              </TabsTrigger>
              <TabsTrigger value="SHOP_ITEM">{t("itemShopTab")}</TabsTrigger>
            </TabsList>
            <div className="mt-8">
              {activeTab === "STRATEGY" && (
                <MarketplaceFilter
                  onFilterChange={handleFilterChange}
                  isFetching={isFetching}
                />
              )}
              <ProductGrid
                isLoading={isLoading}
                isError={isError}
                products={products}
                productType={activeTab}
                purchasedStrategyIds={purchasedStrategyIds}
                ownedItemIds={ownedItemIds}
                onPurchaseClick={handlePurchaseClick}
                purchaseMutation={purchaseMutation}
                onRefetch={refetch}
              />
            </div>
          </Tabs>

          {/* 페이지네이션 */}
          {!isLoading && !isError && products.length > 0 && totalPages > 1 && (
            <div className="mt-12 flex justify-center">
              <PaginationComponent
                count={totalPages}
                page={page}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>

        {/* 구매 확인 모달 */}
        <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("purchaseConfirmTitle")}</DialogTitle>
              <DialogDescription>
                {t("purchaseConfirmDescription", {
                  productName: productToPurchase?.name,
                  price: productToPurchase?.price.toFixed(2),
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button
                  variant="outline"
                  onClick={() => setProductToPurchase(null)}
                >
                  {t("cancelButton")}
                </Button>
              </DialogClose>
              <Button
                onClick={handleConfirmPurchase}
                disabled={purchaseMutation.isPending}
              >
                {purchaseMutation.isPending && (
                  <Spinner className="mr-2 h-4 w-4" />
                )}
                {t("confirmButton")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AuthGuard>
  );
}
