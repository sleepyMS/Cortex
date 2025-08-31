// file: frontend/src/app/[locale]/marketplace/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Store } from "lucide-react";
import { MarketplaceStrategy, ShopItem } from "@/types/marketplace";

// --- 데이터 로직 ---
import { useProducts, ProductFilters } from "@/hooks/useMarketplace";
import { usePurchaseMutation } from "@/hooks/useMarketplace";
import { useUserInventory, usePurchasedStrategies } from "@/hooks/useInventory";

// --- UI 컴포넌트 ---
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

export default function MarketplacePage() {
  const t = useTranslations("Marketplace");

  // --- 1. 중앙 상태 관리: 모든 상태를 이 페이지에서 제어 ---
  const [activeTab, setActiveTab] = useState<"STRATEGY" | "SHOP_ITEM">(
    "STRATEGY"
  );
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<
    Omit<ProductFilters, "page" | "limit" | "productType">
  >({
    sortBy: "createdAt_desc",
  });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [productToPurchase, setProductToPurchase] =
    useState<PurchasableProduct | null>(null);

  // --- 2. 통합 데이터 로직 ---
  const {
    data: response,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useProducts({
    page,
    limit: 12, // 한 페이지에 보여줄 아이템 개수
    productType: activeTab,
    ...filters,
  });
  const { data: ownedItemIds = [] } = useUserInventory();
  const { data: purchasedStrategyIds = [] } = usePurchasedStrategies();
  const purchaseMutation = usePurchaseMutation();

  const products = response?.products || [];
  const totalPages = response?.meta.totalPages || 1;

  // --- 3. 이벤트 핸들러 (useCallback으로 최적화) ---
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

  // --- 4. 최종 렌더링 ---
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
              {/* ProductGrid 컴포넌트에 모든 데이터와 핸들러를 props로 전달 */}
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
