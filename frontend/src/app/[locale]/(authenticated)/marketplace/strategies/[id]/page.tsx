"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import apiClient from "@/lib/apiClient";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { MarketplaceStrategyDetail } from "@/types/marketplace";
import { ChartDataPoint } from "@/components/domain/backtesting/EquityChart";

// 재사용 컴포넌트
import { BacktestResultSummary } from "@/components/domain/backtesting/BacktestResultSummary";
import { DynamicEquityChart } from "@/components/domain/backtesting/DynamicEquityChart";
import { DynamicDrawdownChart } from "@/components/domain/backtesting/DynamicDrawdownChart";
import { MonthlyPerformance } from "@/components/domain/backtesting/MonthlyPerformance";
import { TradeLogTable } from "@/components/domain/backtesting/TradeLogTable";

// 신규 컴포넌트
import { StrategyDetailHeader } from "@/components/domain/marketplace/StrategyDetailHeader";

import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

// API 함수
const fetchStrategyDetail = async (
  id: string
): Promise<MarketplaceStrategyDetail> => {
  const { data } = await apiClient.get(`/marketplace/strategies/${id}`);
  return data;
};

const purchaseStrategy = async (id: string): Promise<any> => {
  const { data } = await apiClient.post(
    `/marketplace/strategies/${id}/purchase`
  );
  return data;
};

export default function StrategyDetailPage() {
  const t = useTranslations("Marketplace.strategyDetail");
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const strategyId = typeof params.id === "string" ? params.id : "";

  const {
    data: strategyDetail,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["marketplaceStrategyDetail", strategyId],
    queryFn: () => fetchStrategyDetail(strategyId),
    enabled: !!strategyId,
  });

  const purchaseMutation = useMutation({
    mutationFn: purchaseStrategy,
    onSuccess: () => {
      toast.success(t("purchaseSuccess"));
      queryClient.invalidateQueries({ queryKey: ["userStrategies"] }); // '나의 전략' 목록 갱신
      router.push("/strategies");
    },
    onError: (err: any) => {
      toast.error(
        t("purchaseError", { error: err.response?.data?.detail || err.message })
      );
    },
  });

  if (isLoading)
    return (
      <div className="container py-8">
        <Skeleton className="w-full h-[80vh]" />
      </div>
    );
  if (isError || !strategyDetail)
    return <div>Error loading strategy details.</div>;

  const backtestResult = strategyDetail.representativeBacktest.result;

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8">
      <StrategyDetailHeader
        strategy={strategyDetail}
        onPurchase={purchaseMutation.mutate}
        isPurchasing={purchaseMutation.isPending}
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

            <TabsContent value="chart" className="mt-4 space-y-4">
              {/* ▼▼▼ [핵심 수정] 'as'를 사용하여 타입 단언을 추가합니다. ▼▼▼ */}
              <DynamicEquityChart
                pnlData={
                  (backtestResult.pnlCurveJson as ChartDataPoint[]) || []
                }
              />
              <DynamicDrawdownChart
                drawdownData={
                  (backtestResult.drawdownCurveJson as ChartDataPoint[]) || []
                }
              />
            </TabsContent>
            <TabsContent value="monthly" className="mt-4">
              {/* ▼▼▼ [핵심 수정] 'as'를 사용하여 타입 단언을 추가합니다. ▼▼▼ */}
              <MonthlyPerformance
                pnlData={
                  (backtestResult.pnlCurveJson as ChartDataPoint[]) || []
                }
              />
            </TabsContent>
            <TabsContent value="logs" className="mt-4">
              <TradeLogTable
                tradeLogs={
                  strategyDetail.representativeBacktest.tradeLogs || []
                }
              />
            </TabsContent>
            {/* ... */}
          </Tabs>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-10">
          대표 백테스트 결과가 없습니다.
        </p>
      )}
    </div>
  );
}
