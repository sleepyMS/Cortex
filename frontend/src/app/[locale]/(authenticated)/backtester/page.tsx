// file: frontend/src/app/[locale]/backtester/page.tsx

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";

import apiClient from "@/lib/apiClient";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Backtest,
  BacktestCard,
} from "@/components/domain/backtesting/BacktestCard";
import { PlusCircle, BarChartHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Strategy } from "@/types/strategy"; // 기존 Strategy 타입을 재사용

// --- Helper Components ---

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="space-y-3 p-4 border rounded-lg">
        <div className="flex justify-between items-start">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/5" />
        </div>
        <Skeleton className="h-4 w-5/6" />
        <div className="flex justify-between items-center pt-4">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = () => {
  const t = useTranslations("BacktesterPage");
  return (
    <div className="text-center py-16 border border-dashed rounded-lg">
      <BarChartHorizontal className="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 className="mt-4 text-xl font-semibold">{t("empty.title")}</h2>
      <p className="text-muted-foreground mt-2 mb-6">
        {t("empty.description")}
      </p>
      <Link href="/backtester/new">
        <Button>{t("empty.createButton")}</Button>
      </Link>
    </div>
  );
};

// --- Main Page Component ---

export default function BacktesterPage() {
  const t = useTranslations("BacktesterPage");
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();

  // --- State for Filters ---
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");

  // --- Query to fetch strategies for the filter dropdown ---
  const { data: strategiesData } = useQuery<Strategy[]>({
    queryKey: ["userStrategiesForFilter"],
    queryFn: async () => (await apiClient.get("/strategies?limit=1000")).data,
  });

  // --- Main Infinite Query for Backtests ---
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["backtests", statusFilter, strategyFilter],
    queryFn: async ({ pageParam = 0 }) => {
      const limit = 12;
      const params = new URLSearchParams({
        skip: (pageParam * limit).toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== "all") params.set("status_filter", statusFilter);
      if (strategyFilter !== "all")
        params.set("strategy_id_filter", strategyFilter);

      const res = await apiClient.get(`/backtests?${params.toString()}`);
      return res.data as Backtest[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length > 0 ? allPages.length : undefined,
    initialPageParam: 0,
    // 실시간 상태 업데이트를 위한 폴링 로직 ▼▼▼
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActiveJob = data?.pages
        .flat()
        .some((bt) => bt.status === "running" || bt.status === "pending");
      return hasActiveJob ? 5000 : false; // 활성 작업이 있을 때만 5초마다 폴링
    },
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // --- Mutations for Actions ---
  const cancelMutation = useMutation({
    mutationFn: (backtestId: string) =>
      apiClient.post(`/backtests/${backtestId}/cancel`),
    onSuccess: () => {
      toast.success(t("cancelSuccess"));
      queryClient.invalidateQueries({ queryKey: ["backtests"] });
    },
    onError: (error: any) =>
      toast.error(
        t("cancelError", {
          error: error?.response?.data?.detail || error.message,
        })
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (backtestId: string) =>
      apiClient.delete(`/backtests/${backtestId}`),
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["backtests"] });
    },
    onError: (error: any) =>
      toast.error(
        t("deleteError", {
          error: error?.response?.data?.detail || error.message,
        })
      ),
  });

  const backtests = data?.pages.flat() ?? [];

  const renderContent = () => {
    if (isLoading) return <LoadingSkeleton />;
    if (isError)
      return (
        <div className="text-center text-destructive">{t("fetchError")}</div>
      );
    if (backtests.length === 0) return <EmptyState />;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {backtests.map((backtest: Backtest) => (
          <BacktestCard
            key={backtest.id}
            backtest={backtest}
            onCancel={cancelMutation.mutate}
            onDelete={deleteMutation.mutate}
            isCanceling={
              cancelMutation.isPending &&
              cancelMutation.variables === backtest.id
            }
            isDeleting={
              deleteMutation.isPending &&
              deleteMutation.variables === backtest.id
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        <Link href="/backtester/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("createNewBacktest")}
          </Button>
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t("filterStatusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterStatusAll")}</SelectItem>
            <SelectItem value="running">{t("filterStatusRunning")}</SelectItem>
            <SelectItem value="pending">{t("filterStatusPending")}</SelectItem>
            <SelectItem value="completed">
              {t("filterStatusCompleted")}
            </SelectItem>
            <SelectItem value="failed">{t("filterStatusFailed")}</SelectItem>
            <SelectItem value="canceled">
              {t("filterStatusCanceled")}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={strategyFilter} onValueChange={setStrategyFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t("filterStrategyPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterStrategyAll")}</SelectItem>
            {strategiesData?.map((strategy) => (
              <SelectItem key={strategy.id} value={strategy.id}>
                {strategy.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {renderContent()}

      <div ref={ref} className="h-10 mt-8 flex justify-center items-center">
        {isFetchingNextPage && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        )}
        {!hasNextPage && backtests.length > 0 && (
          <p className="text-sm text-muted-foreground">{t("noMoreResults")}</p>
        )}
      </div>
    </div>
  );
}
