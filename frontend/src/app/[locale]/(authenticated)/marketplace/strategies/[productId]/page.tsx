// file: frontend/src/app/[locale]/marketplace/strategies/[productId]/page.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AreaData, UTCTimestamp } from "lightweight-charts";

import apiClient from "@/lib/apiClient";
import { MarketplaceStrategyDetail } from "@/types/marketplace";

// --- Hooks ---
import { useCreditPurchaseMutation } from "@/hooks/useMarketplace";
import { usePurchasedStrategiesQuery } from "@/hooks/useInventory";

// --- UI 컴포넌트 ---
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Terminal, Coins } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";

// --- 도메인 컴포넌트 ---
import { BacktestResultSummary } from "@/components/domain/backtesting/BacktestResultSummary";
import { DetailedMetrics } from "@/components/domain/backtesting/DetailedMetrics";
import { DynamicEquityChart } from "@/components/domain/backtesting/DynamicEquityChart";
import { DynamicDrawdownChart } from "@/components/domain/backtesting/DynamicDrawdownChart";
import { MonthlyPerformance } from "@/components/domain/backtesting/MonthlyPerformance";
import { StrategyDetailHeader } from "@/components/domain/marketplace/StrategyDetailHeader";
import { StrategyInfoCard } from "@/components/domain/marketplace/StrategyInfoCard";
import { AuthorCard } from "@/components/domain/marketplace/AuthorCard";
import { PurchaseConfirmationModal } from "@/components/domain/marketplace/PurchaseConfirmationModal";

// API 함수
const fetchStrategyDetail = async (
  id: string
): Promise<MarketplaceStrategyDetail> => {
  const { data } = await apiClient.get(`/marketplace/products/${id}`);
  return data;
};

// 스켈레톤 UI 컴포넌트
const SkeletonPage = () => (
  <div className="container py-8 max-w-screen-xl mx-auto px-4">
    <Skeleton className="w-full h-[200px] mb-8" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="w-full h-[150px]" />
        <Skeleton className="w-full h-[400px]" />
      </div>
      <div className="lg:col-span-1 space-y-6">
        <Skeleton className="w-full h-[300px]" />
        <Skeleton className="w-full h-[100px]" />
      </div>
    </div>
  </div>
);

export default function StrategyDetailPage() {
  const t = useTranslations("Marketplace");
  const tDetail = useTranslations("Marketplace.strategyDetail");
  const params = useParams();
  const router = useRouter();
  const strategyId =
    typeof params.productId === "string" ? params.productId : "";

  // --- 상태 관리 ---
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);

  // --- 데이터 로직 ---
  const {
    data: strategyDetail,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["marketplaceProductDetail", strategyId],
    queryFn: () => fetchStrategyDetail(strategyId),
    enabled: !!strategyId,
    retry: 1,
  });

  const { data: purchasedIds, isLoading: isLoadingPurchased } =
    usePurchasedStrategiesQuery({
      select: (data) => data.map((strategy) => strategy.strategyId),
    });

  const isOwned =
    purchasedIds?.includes(strategyDetail?.linkedResourceId || "") || false;

  const purchaseMutation = useCreditPurchaseMutation({
    onSuccess: () => {
      setIsConfirmModalOpen(false);
      toast.success(t("purchaseSuccessTitle"), {
        description: t("purchaseSuccessDescription", {
          productName: strategyDetail?.name,
        }),
      });
      // 성공 시 '전략 허브' 목록 페이지로 이동하여 구매한 전략을 바로 확인할 수 있도록 유도
      router.push("/strategies");
    },
  });

  // --- 이벤트 핸들러 ---
  const handlePurchase = () => {
    if (!strategyDetail) return;
    setIsConfirmModalOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (!strategyDetail) return;
    purchaseMutation.mutate({
      items: [{ productId: strategyDetail.id, quantity: 1 }],
    });
  };

  const handleChargeCredits = () => {
    setIsChargeModalOpen(true);
  };

  if (isLoading || isLoadingPurchased) {
    return <SkeletonPage />;
  }

  if (isError || !strategyDetail) {
    return (
      <div className="container py-8 max-w-screen-xl mx-auto px-4">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{tDetail("errorTitle")}</AlertTitle>
          <AlertDescription>
            {tDetail("errorDescription")}
            <p className="font-mono text-xs mt-2">{error?.message}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const backtestResult = strategyDetail.representativeBacktest?.result;

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-screen-xl px-4 py-8">
        <StrategyDetailHeader
          strategy={strategyDetail}
          onPurchase={handlePurchase}
          isPurchasing={purchaseMutation.isPending}
          isOwned={isOwned}
          onChargeCredits={handleChargeCredits}
        />

        {backtestResult ? (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              <BacktestResultSummary result={backtestResult} />
              <DynamicEquityChart
                pnlData={
                  (backtestResult.pnlCurveJson ||
                    []) as AreaData<UTCTimestamp>[]
                }
              />
              <DynamicDrawdownChart
                drawdownData={
                  (backtestResult.drawdownCurveJson ||
                    []) as AreaData<UTCTimestamp>[]
                }
              />
              <DetailedMetrics result={backtestResult} />
              <MonthlyPerformance
                pnlData={
                  (backtestResult.pnlCurveJson ||
                    []) as AreaData<UTCTimestamp>[]
                }
              />
            </div>

            <div className="lg:col-span-1 space-y-6 sticky top-24">
              <StrategyInfoCard
                strategy={strategyDetail}
                backtestResult={backtestResult}
              />
              {strategyDetail.author && (
                <AuthorCard author={strategyDetail.author} />
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 border rounded-lg mt-8 bg-muted/30">
            <p className="text-muted-foreground">{tDetail("noBacktest")}</p>
          </div>
        )}
      </div>

      {/* 재사용 가능한 구매 확인 모달 */}
      <PurchaseConfirmationModal
        isOpen={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        onConfirm={handleConfirmPurchase}
        product={strategyDetail}
        isPending={purchaseMutation.isPending}
      />

      {/* 크레딧 충전 유도 모달 */}
      <Dialog open={isChargeModalOpen} onOpenChange={setIsChargeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              {t("chargeModalTitle")}
            </DialogTitle>
            <DialogDescription>{t("chargeModalDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsChargeModalOpen(false)}
            >
              {t("Common.close")}
            </Button>
            <Button onClick={() => router.push("/marketplace?tab=shop-items")}>
              {t("goToChargePageButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
