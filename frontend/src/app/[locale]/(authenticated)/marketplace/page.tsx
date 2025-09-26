"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Store, Coins, CreditCard, Inbox, AlertTriangle } from "lucide-react";

// --- 1. 데이터 공급자 (Hooks) ---
import {
  useProducts,
  useCreditPurchaseMutation,
  useCashCheckoutMutation,
  ProductFilters,
} from "@/hooks/useMarketplace";
import { useInventoryStatus } from "@/hooks/useInventory";
import {
  usePaymentWidget,
  CheckoutData,
  WidgetsInstance,
  RenderedWidgets,
} from "@/hooks/usePayment";

// --- 2. 타입 정의 ---
import { MarketplaceStrategy, ShopItem } from "@/types/marketplace";

// --- 3. UI 컴포넌트 ---
import { AuthGuard } from "@/components/auth/AuthGuard";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { PaginationComponent } from "@/components/ui/Pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

// --- 4. 도메인 컴포넌트 ---
import { ProductGrid } from "@/components/domain/marketplace/ProductGrid";
import { PurchaseConfirmationModal } from "@/components/domain/marketplace/PurchaseConfirmationModal";

type PurchasableProduct = MarketplaceStrategy | ShopItem;

// =================================================================
// [신규] 결제 위젯을 렌더링하기 위한 전용 모달 컴포넌트
// =================================================================
interface PaymentWidgetModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  checkoutData: CheckoutData | null;
}

const PaymentWidgetModal = ({
  isOpen,
  onOpenChange,
  checkoutData,
}: PaymentWidgetModalProps) => {
  const t = useTranslations("Marketplace");
  const { renderPaymentWidgets, requestPaymentMutation } = usePaymentWidget();

  const widgetsRef = React.useRef<WidgetsInstance | null>(null);
  // [추가] cleanup 함수를 저장하기 위한 ref를 추가합니다.
  const cleanupRef = React.useRef<(() => void) | null>(null);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeWidgets = async () => {
      if (isOpen && checkoutData) {
        try {
          // [수정] 이제 renderPaymentWidgets는 { widgets, cleanup } 객체를 반환합니다.
          const { widgets, cleanup } = await renderPaymentWidgets(
            "#payment-widget",
            checkoutData.amount
          );
          widgetsRef.current = widgets;
          cleanupRef.current = cleanup; // 받아온 cleanup 함수를 ref에 저장
          setIsReady(true);
        } catch (error: any) {
          toast.error("결제 위젯을 불러오는 데 실패했습니다: " + error.message);
          onOpenChange(false);
        }
      }
    };

    initializeWidgets();

    // [수정] useEffect의 cleanup 함수는 이제 ref에 저장된 cleanup 함수를 호출하기만 하면 됩니다.
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current(); // 저장해둔 cleanup 함수 실행
        cleanupRef.current = null;
        widgetsRef.current = null;
        setIsReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, checkoutData]);

  const handlePaymentRequest = () => {
    const widgets = widgetsRef.current; // ref에서 위젯 인스턴스를 가져옵니다.
    if (widgets && checkoutData) {
      requestPaymentMutation.mutate({ widgets, checkoutData });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("paymentModalTitle")}</DialogTitle>
          <DialogDescription>{checkoutData?.orderName}</DialogDescription>
        </DialogHeader>

        {/* 위젯 컨테이너는 비어있는 상태로 시작하며, useEffect가 채워줍니다. */}
        <div id="payment-widget-methods" />
        <div id="payment-widget-agreement" />

        <DialogFooter>
          <Button
            onClick={handlePaymentRequest}
            disabled={!isReady || requestPaymentMutation.isPending}
            className="w-full h-12 text-lg"
          >
            {requestPaymentMutation.isPending ? (
              <Spinner className="mr-2 h-5 w-5" />
            ) : (
              <CreditCard className="mr-2 h-5 w-5" />
            )}
            {isReady
              ? `${checkoutData?.amount.toLocaleString()}원 결제하기`
              : "결제 정보 로딩 중..."}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =================================================================
// 메인 마켓플레이스 페이지 컴포넌트
// =================================================================
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

  // [신규] 결제 위젯 모달을 위한 상태
  const [isPaymentWidgetModalOpen, setIsPaymentWidgetModalOpen] =
    useState(false);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);

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

  const {
    purchasedStrategyIds,
    ownedItemIds,
    isLoading: isInventoryLoading,
  } = useInventoryStatus();

  // --- 뮤테이션 로직 ---
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

  // [수정] 현금 결제(위젯)를 위한 뮤테이션 설정
  const cashCheckoutMutation = useCashCheckoutMutation({
    onSuccess: (data: CheckoutData) => {
      // 백엔드로부터 주문 정보(checkoutData)를 성공적으로 받으면,
      // 해당 정보를 상태에 저장하고 위젯 모달을 엽니다.
      setCheckoutData(data);
      setIsPaymentWidgetModalOpen(true);
    },
    onError: (err: any) => {
      toast.error(
        t("orderCreationError", {
          error: err.response?.data?.detail || err.message,
        })
      );
    },
  });

  // --- 이벤트 핸들러 ---
  const handleTabChange = useCallback(
    (value: string) => {
      const newTab = value as "STRATEGY" | "SHOP_ITEM";
      setActiveTab(newTab);
      setPage(1);
      setFilters({});
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
        // '크레딧 팩' 구매 시, 백엔드에 주문 생성을 요청합니다.
        cashCheckoutMutation.mutate({
          items: [{ productId: product.id, quantity: 1 }],
        });
      } else {
        // 그 외 상품은 크레딧 구매 확인 모달을 엽니다.
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
          {/* 헤더 */}
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

          {/* 탭 및 상품 그리드 */}
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
                  isLoading={isLoading || isInventoryLoading}
                  isError={isError}
                  products={products}
                  productType="STRATEGY"
                  purchasedStrategyIds={Array.from(purchasedStrategyIds)}
                  ownedItemIds={[]}
                  onPurchaseClick={handlePurchaseClick}
                  purchaseMutation={creditPurchaseMutation}
                  onRefetch={refetch}
                  onChargeCredits={handleChargeCreditsClick}
                />
              </TabsContent>
              <TabsContent value="SHOP_ITEM" className="m-0">
                <ProductGrid
                  isLoading={isLoading || isInventoryLoading}
                  isError={isError}
                  products={products}
                  productType="SHOP_ITEM"
                  purchasedStrategyIds={[]}
                  ownedItemIds={Array.from(ownedItemIds)}
                  onPurchaseClick={handlePurchaseClick}
                  purchaseMutation={cashCheckoutMutation} // 현금 결제 뮤테이션으로 변경
                  onRefetch={refetch}
                  onChargeCredits={handleChargeCreditsClick}
                />
              </TabsContent>
            </div>
          </Tabs>

          {/* 페이지네이션 */}
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

        {/* --- 모달 섹션 --- */}
        {/* 크레딧 구매 확인 모달 */}
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

        {/* 크레딧 충전 안내 모달 */}
        <Dialog open={isChargeModalOpen} onOpenChange={setIsChargeModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />{" "}
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

        {/* [신규] 결제 위젯 모달 */}
        <PaymentWidgetModal
          isOpen={isPaymentWidgetModalOpen}
          onOpenChange={setIsPaymentWidgetModalOpen}
          checkoutData={checkoutData}
        />
      </TooltipProvider>
    </AuthGuard>
  );
}
