"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import apiClient from "@/lib/apiClient";
import { MarketplaceStrategyDetail } from "@/types/marketplace";

// --- Hooks ---
import { usePurchaseMutation } from "@/hooks/useMarketplace"; // 구매 훅
import { usePurchasedStrategies } from "@/hooks/useInventory"; // 보유 목록 훅

// --- 재사용 컴포넌트 ---
import { BacktestResultSummary } from "@/components/domain/backtesting/BacktestResultSummary";
import { DynamicEquityChart } from "@/components/domain/backtesting/DynamicEquityChart";
import { DynamicDrawdownChart } from "@/components/domain/backtesting/DynamicDrawdownChart";
import { MonthlyPerformance } from "@/components/domain/backtesting/MonthlyPerformance";
import { TradeLogTable } from "@/components/domain/backtesting/TradeLogTable";
import { StrategyDetailHeader } from "@/components/domain/marketplace/StrategyDetailHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

// API 함수
const fetchStrategyDetail = async (
  id: string
): Promise<MarketplaceStrategyDetail> => {
  // [수정] API 경로를 백엔드 라우터에 맞게 수정
  const { data } = await apiClient.get(`/marketplace/products/${id}`);
  return data;
};

export default function StrategyDetailPage() {
  const t = useTranslations("Marketplace.strategyDetail");
  const params = useParams();
  const strategyId = typeof params.id === "string" ? params.id : "";

  // 1. 전략 상세 정보 조회
  const {
    data: strategyDetail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["marketplaceProductDetail", strategyId],
    queryFn: () => fetchStrategyDetail(strategyId),
    enabled: !!strategyId,
  });

  // 2. 사용자가 구매한 전략 목록 조회 (소유권 확인용)
  const { data: purchasedIds, isLoading: isLoadingPurchased } =
    usePurchasedStrategies();
  const isOwned = purchasedIds?.includes(
    strategyDetail?.linkedResourceId || ""
  );

  // 3. 구매 뮤테이션 훅
  const purchaseMutation = usePurchaseMutation();
  const handlePurchase = () => {
    if (!strategyDetail) return;
    // 장바구니 기능을 고려한 페이로드
    purchaseMutation.mutate({
      items: [{ productId: strategyDetail.id, quantity: 1 }],
    });
  };

  if (isLoading || isLoadingPurchased)
    return (
      <div className="container py-8 max-w-screen-xl mx-auto px-4">
        <Skeleton className="w-full h-[200px] mb-8" />
        <Skeleton className="w-full h-[400px]" />
      </div>
    );
  if (isError || !strategyDetail) return <div>{t("error")}</div>;

  const backtestResult = strategyDetail.representativeBacktest?.result;

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      <StrategyDetailHeader
        strategy={strategyDetail}
        onPurchase={handlePurchase}
        isPurchasing={purchaseMutation.isPending}
        isOwned={isOwned} // [추가] 소유 여부 전달
      />
      {backtestResult ? (
        <>
          <BacktestResultSummary result={backtestResult} />
          <Tabs defaultValue="chart" className="mt-8">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="chart">{t("tabs.chart")}</TabsTrigger>
              <TabsTrigger value="monthly">{t("tabs.monthly")}</TabsTrigger>
              <TabsTrigger value="logs">{t("tabs.logs")}</TabsTrigger>
              <TabsTrigger value="summary">{t("tabs.summary")}</TabsTrigger>
            </TabsList>

            {/* 각 탭 컨텐츠는 제공해주신 코드와 거의 동일 */}
            <TabsContent value="chart">...</TabsContent>
            <TabsContent value="monthly">...</TabsContent>
            <TabsContent value="logs">
              <TradeLogTable
                tradeLogs={
                  strategyDetail.representativeBacktest.tradeLogs || []
                }
              />
            </TabsContent>
            <TabsContent value="summary">...</TabsContent>
          </Tabs>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-10">
          {t("noBacktest")}
        </p>
      )}
    </div>
  );
}
