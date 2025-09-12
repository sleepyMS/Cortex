// file: frontend/src/app/[locale]/marketplace/strategies/[productId]/page.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import apiClient from "@/lib/apiClient";
import { MarketplaceStrategyDetail } from "@/types/marketplace";

// --- Hooks ---
import { usePurchaseMutation } from "@/hooks/useMarketplace";
import { usePurchasedStrategies } from "@/hooks/useInventory";

// --- UI 컴포넌트 ---
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Terminal } from "lucide-react";

// --- 도메인 컴포넌트 ---
import { BacktestResultSummary } from "@/components/domain/backtesting/BacktestResultSummary";
import { DetailedMetrics } from "@/components/domain/backtesting/DetailedMetrics";
import { DynamicEquityChart } from "@/components/domain/backtesting/DynamicEquityChart";
import { DynamicDrawdownChart } from "@/components/domain/backtesting/DynamicDrawdownChart";
import { MonthlyPerformance } from "@/components/domain/backtesting/MonthlyPerformance";
import { StrategyDetailHeader } from "@/components/domain/marketplace/StrategyDetailHeader";
import { StrategyInfoCard } from "@/components/domain/marketplace/StrategyInfoCard";
import { AuthorCard } from "@/components/domain/marketplace/AuthorCard";

// API 함수
const fetchStrategyDetail = async (
  id: string
): Promise<MarketplaceStrategyDetail> => {
  const { data } = await apiClient.get(`/marketplace/products/${id}`);
  return data;
};

// 스켈레톤 UI를 별도 컴포넌트로 분리하여 가독성 향상
const SkeletonPage = () => (
  <div className="container py-8 max-w-screen-xl mx-auto px-4">
    <Skeleton className="w-full h-[200px] mb-8" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton className="w-full h-[150px]" />
        <Skeleton className="w-full h-[400px]" />
      </div>
      <div className="lg:col-span-1 space-y-6">
        <Skeleton className="w-full h-[200px]" />
        <Skeleton className="w-full h-[100px]" />
      </div>
    </div>
  </div>
);

export default function StrategyDetailPage() {
  const t = useTranslations("Marketplace.strategyDetail");
  const params = useParams();
  const strategyId =
    typeof params.productId === "string" ? params.productId : "";

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
    usePurchasedStrategies();
  const isOwned = purchasedIds?.includes(
    strategyDetail?.linkedResourceId || ""
  );

  const purchaseMutation = usePurchaseMutation();
  const handlePurchase = () => {
    if (!strategyDetail) return;
    purchaseMutation.mutate({
      items: [{ productId: strategyDetail.id, quantity: 1 }],
    });
  };

  if (isLoading || isLoadingPurchased) {
    return <SkeletonPage />;
  }

  if (isError || !strategyDetail) {
    return (
      <div className="container py-8 max-w-screen-xl mx-auto px-4">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>
            {t("errorDescription")}
            <p className="font-mono text-xs mt-2">{error?.message}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const backtestResult = strategyDetail.representativeBacktest?.result;

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      <StrategyDetailHeader
        strategy={strategyDetail}
        onPurchase={handlePurchase}
        isPurchasing={purchaseMutation.isPending}
        isOwned={isOwned}
      />

      {backtestResult ? (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* 왼쪽 영역: 성과 데이터 */}
          <div className="lg:col-span-2 space-y-6">
            <BacktestResultSummary result={backtestResult} />
            <DynamicEquityChart pnlData={backtestResult.pnlCurveJson || []} />
            <DynamicDrawdownChart
              drawdownData={backtestResult.drawdownCurveJson || []}
            />
            <DetailedMetrics result={backtestResult} />
            <MonthlyPerformance pnlData={backtestResult.pnlCurveJson || []} />
          </div>

          {/* 오른쪽 영역: 전략 정보 및 신뢰 지표 */}
          <div className="lg:col-span-1 space-y-6 sticky top-24">
            <StrategyInfoCard
              strategy={strategyDetail}
              backtestResult={backtestResult}
            />
            {strategyDetail.author && (
              <AuthorCard author={strategyDetail.author} />
            )}
            {/* <ReviewsSection strategyId={strategyId} /> */}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg mt-8 bg-muted/30">
          <p className="text-muted-foreground">{t("noBacktest")}</p>
        </div>
      )}
    </div>
  );
}
