// file: frontend/src/app/[locale]/optimization/page.tsx

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
import { AuthGuard } from "@/components/auth/AuthGuard"; // 인증 가드
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  OptimizationJob,
  OptimizationJobCard,
} from "@/components/domain/optimization/OptimizationJobCard"; // OptimizationJobCard 임포트
import { PlusCircle, BarChartHorizontal, Zap, Loader2 } from "lucide-react"; // Zap, Loader2 아이콘 추가
import { Skeleton } from "@/components/ui/Skeleton";
import { Strategy } from "@/types/strategy"; // 기존 Strategy 타입을 재사용

// --- Helper Components ---

/**
 * 데이터 로딩 중 표시될 스켈레톤 UI
 */
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="space-y-3 p-4 border rounded-lg h-64">
        <div className="flex justify-between items-start">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
        <div className="flex justify-around items-center pt-8">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-8 w-1/4" />
        </div>
        <Skeleton className="h-4 w-full pt-4" />
        <div className="flex justify-between items-center pt-10">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * 데이터가 없을 때 표시될 빈 상태 UI
 */
const EmptyState = () => {
  const t = useTranslations("OptimizationPage");
  return (
    <div className="text-center py-16 border border-dashed rounded-lg">
      <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 className="mt-4 text-xl font-semibold">{t("empty.title")}</h2>
      <p className="text-muted-foreground mt-2 mb-6">
        {t("empty.description")}
      </p>
      <Link href="/optimization/new">
        <Button>{t("empty.createButton")}</Button>
      </Link>
    </div>
  );
};

// --- Main Page Component ---

export default function OptimizationPage() {
  const t = useTranslations("OptimizationPage");
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();

  // --- State for Filters ---
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // --- Query to fetch strategies for the filter dropdown ---
  const { data: strategiesData } = useQuery<Strategy[]>({
    queryKey: ["userStrategiesForFilter"],
    queryFn: async () => (await apiClient.get("/strategies?limit=1000")).data,
    staleTime: 1000 * 60 * 5, // 5분간 캐시
  });

  // --- Main Infinite Query for Optimization Jobs ---
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["optimizations", statusFilter, strategyFilter, typeFilter],
    queryFn: async ({ pageParam = 0 }) => {
      const limit = 12;
      const params = new URLSearchParams({
        skip: (pageParam * limit).toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== "all") params.set("status_filter", statusFilter);
      if (strategyFilter !== "all")
        params.set("strategy_id_filter", strategyFilter);
      if (typeFilter !== "all") params.set("type_filter", typeFilter);

      const res = await apiClient.get(`/optimizations?${params.toString()}`);
      return res.data as OptimizationJob[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length > 0 ? allPages.length : undefined,
    initialPageParam: 0,
    // [수정] refetchInterval 제거 (사용자 요청 사항)
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // --- Mutations for Actions ---
  const cancelMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post(`/optimizations/${jobId}/cancel`),
    onSuccess: () => {
      toast.success(t("cancelSuccess"));
      queryClient.invalidateQueries({ queryKey: ["optimizations"] });
    },
    onError: (error: any) =>
      toast.error(
        t("cancelError", {
          error: error?.response?.data?.detail || error.message,
        })
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId: string) => apiClient.delete(`/optimizations/${jobId}`),
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["optimizations"] });
    },
    onError: (error: any) =>
      toast.error(
        t("deleteError", {
          error: error?.response?.data?.detail || error.message,
        })
      ),
  });

  const optimizationJobs = data?.pages.flat() ?? [];

  const renderContent = () => {
    if (isLoading) return <LoadingSkeleton />;
    if (isError)
      return (
        <div className="text-center text-destructive">{t("fetchError")}</div>
      );
    if (optimizationJobs.length === 0) return <EmptyState />;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {optimizationJobs.map((job: OptimizationJob) => (
          <OptimizationJobCard
            key={job.id}
            job={job}
            onCancel={cancelMutation.mutate}
            onDelete={deleteMutation.mutate}
            isCanceling={
              cancelMutation.isPending && cancelMutation.variables === job.id
            }
            isDeleting={
              deleteMutation.isPending && deleteMutation.variables === job.id
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
        <Link href="/optimization/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("createNewOptimization")}
          </Button>
        </Link>
      </div>

      {/* --- 3개의 필터 --- */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. 상태 필터 */}
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

        {/* 2. 전략 필터 */}
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

        {/* 3. 최적화 타입 필터 */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder={t("filterTypePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterTypeAll")}</SelectItem>
            <SelectItem value="general">{t("filterTypeGeneral")}</SelectItem>
            <SelectItem value="wfo">{t("filterTypeWFO")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* --- 메인 콘텐츠 --- */}
      {renderContent()}

      {/* --- 무한 스크롤 트리거 --- */}
      <div ref={ref} className="h-10 mt-8 flex justify-center items-center">
        {isFetchingNextPage && (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        )}
        {!hasNextPage && optimizationJobs.length > 0 && (
          <p className="text-sm text-muted-foreground">{t("noMoreResults")}</p>
        )}
      </div>
    </div>
  );
}
