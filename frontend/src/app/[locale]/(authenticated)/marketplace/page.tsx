"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Store, Coins } from "lucide-react";

// --- 1. 데이터 공급자 (Hooks) ---
import {
  useProducts,
  useCreditPurchaseMutation,
  useCashCheckoutMutation,
  ProductFilters,
} from "@/hooks/useMarketplace";
import {
  useUserInventoryQuery,
  usePurchasedStrategiesQuery,
} from "@/hooks/useInventory";

// --- 2. 타입 정의 ---
import { MarketplaceStrategy, ShopItem } from "@/types/marketplace";

// --- 3. UI 컴포넌트 ---
import { AuthGuard } from "@/components/auth/AuthGuard";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { PaginationComponent } from "@/components/ui/Pagination"; // PaginationComponent로 이름이 통일되었을 수 있습니다.
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

// --- 4. 도메인 컴포넌트 ---
import { ProductGrid } from "@/components/domain/marketplace/ProductGrid";
import { PurchaseConfirmationModal } from "@/components/domain/marketplace/PurchaseConfirmationModal";
// MarketplaceFilter는 현재 구현에서 제외되었으므로 필요 시 다시 추가할 수 있습니다.

type PurchasableProduct = MarketplaceStrategy | ShopItem;

export default function MarketplacePage() {
  const t = useTranslations("Marketplace");
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState<"STRATEGY" | "SHOP_ITEM">(
    (searchParams.get("tab") as "STRATEGY" | "SHOP_ITEM") || "STRATEGY"
  );
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Partial<ProductFilters>>({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [productToPurchase, setProductToPurchase] =
    useState<PurchasableProduct | null>(null);

  // --- 데이터 로직 ---
  const productQueryFilters = useMemo(
    () => ({ page, limit: 12, productType: activeTab, ...filters }),
    [page, activeTab, filters]
  );

  const {
    data: productsData,
    isLoading,
    isError,
    refetch,
  } = useProducts(productQueryFilters);
  const products = productsData?.products || [];
  const totalPages = productsData?.meta.totalPages || 1;

  const { data: purchasedStrategies } = usePurchasedStrategiesQuery();
  const { data: ownedItems } = useUserInventoryQuery();
  const purchasedStrategyIds = useMemo(
    () => purchasedStrategies?.map((s) => s.strategyId) || [],
    [purchasedStrategies]
  );
  const ownedItemIds = useMemo(
    () => ownedItems?.map((i) => i.productId) || [],
    [ownedItems]
  );

  // --- 뮤테이션 로직 (크레딧/현금 분리) ---
  const creditPurchaseMutation = useCreditPurchaseMutation({
    onSuccess: () => {
      setIsConfirmModalOpen(false);
      toast.success(t("purchaseSuccessTitle"), {
        description: t("purchaseSuccessDescription", {
          productName: productToPurchase?.name,
        }),
      });
      setProductToPurchase(null);
    },
  });
  const cashCheckoutMutation = useCashCheckoutMutation({
    onSuccess: () => {
      toast.info(t("paymentRedirecting"));
    },
  });

  // --- 이벤트 핸들러 ---
  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as "STRATEGY" | "SHOP_ITEM";
      setActiveTab(newTab);
      setPage(1);
      setFilters({}); // 탭 변경 시 필터 초기화
      router.push(`/marketplace?tab=${newTab}`);
    },
    [router]
  );
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };
  const handlePurchaseClick = useCallback(
    (product: PurchasableProduct) => {
      if (product.productType === "CREDIT_PACK") {
        cashCheckoutMutation.mutate({
          items: [{ productId: product.id, quantity: 1 }],
        });
      } else {
        setProductToPurchase(product);
        setIsConfirmModalOpen(true);
      }
    },
    [cashCheckoutMutation]
  );
  const handleConfirmPurchase = useCallback(() => {
    if (!productToPurchase) return;
    creditPurchaseMutation.mutate({
      items: [{ productId: productToPurchase.id, quantity: 1 }],
    });
  }, [productToPurchase, creditPurchaseMutation]);
  const handleChargeCreditsClick = useCallback(() => {
    setIsChargeModalOpen(true);
  }, []);

  // --- UI 렌더링 ---
  return (
    <AuthGuard>
      <TooltipProvider delayDuration={100}>
        <div className="container mx-auto max-w-screen-xl px-4 py-8 md:py-12">
          {/* [수정] 선호하시는 기존 헤더 디자인 적용 */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="p-3 mb-4 bg-primary/10 rounded-full border-2 border-primary/20">
              <Store className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {t("title")}
            </h1>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl">
              {t("subtitle")}
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="STRATEGY">{t("tabs.strategies")}</TabsTrigger>
              <TabsTrigger value="SHOP_ITEM">{t("tabs.shop")}</TabsTrigger>
            </TabsList>
            <div className="mt-8">
              <TabsContent value="STRATEGY" className="m-0">
                <ProductGrid
                  isLoading={isLoading}
                  isError={isError}
                  products={products}
                  productType="STRATEGY"
                  purchasedStrategyIds={purchasedStrategyIds}
                  ownedItemIds={[]}
                  onPurchaseClick={handlePurchaseClick}
                  purchaseMutation={creditPurchaseMutation}
                  onRefetch={refetch}
                  onChargeCredits={handleChargeCreditsClick}
                />
              </TabsContent>
              <TabsContent value="SHOP_ITEM" className="m-0">
                <ProductGrid
                  isLoading={isLoading}
                  isError={isError}
                  products={products}
                  productType="SHOP_ITEM"
                  purchasedStrategyIds={[]}
                  ownedItemIds={ownedItemIds}
                  onPurchaseClick={handlePurchaseClick}
                  purchaseMutation={creditPurchaseMutation}
                  onRefetch={refetch}
                  onChargeCredits={handleChargeCreditsClick}
                />
              </TabsContent>
            </div>
          </Tabs>

          {!isLoading && !isError && products.length > 0 && totalPages > 1 && (
            <div className="mt-12 flex justify-center">
              <PaginationComponent
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>

        {/* 재사용 가능한 모달들 */}
        <PurchaseConfirmationModal
          isOpen={isConfirmModalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) setProductToPurchase(null);
            setIsConfirmModalOpen(isOpen);
          }}
          onConfirm={handleConfirmPurchase}
          product={productToPurchase}
          isPending={creditPurchaseMutation.isPending}
        />
        <Dialog open={isChargeModalOpen} onOpenChange={setIsChargeModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                {t("chargeModalTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("chargeModalDescription")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIsChargeModalOpen(false)}
              >
                {t("Common.close")}
              </Button>
              <Button
                onClick={() => {
                  setIsChargeModalOpen(false);
                  handleTabChange("SHOP_ITEM");
                }}
              >
                {t("goToChargePageButton")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AuthGuard>
  );
}
