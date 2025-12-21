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
  Query,
  InfiniteData,
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
  OptimizationJob,
  OptimizationJobCard,
} from "@/components/domain/optimization/OptimizationJobCard";
import { PlusCircle, BarChartHorizontal, Zap, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Strategy } from "@/types/strategy";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { GlassPane } from "@/components/ui/GlassPane";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// --- Helper Components ---

/**
 * 데이터 로딩 중 표시될 스켈레톤 UI
 */
const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="relative overflow-hidden rounded-xl border bg-card p-5 space-y-4 h-64"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent" />

        {/* Header */}
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-muted/30">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>

        {/* Progress */}
        <Skeleton className="h-2 w-full rounded-full" />

        {/* Footer */}
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-4 w-1/3" />
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
    <div className="relative flex flex-col items-center justify-center py-20 px-6 border border-dashed rounded-2xl bg-muted/20">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 gradient-mesh opacity-30 rounded-2xl" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
          <Zap className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("empty.title")}
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {t("empty.description")}
        </p>
        <Link href="/optimization/new">
          <Button size="lg" className="gap-2">
            <PlusCircle className="h-5 w-5" />
            {t("empty.createButton")}
          </Button>
        </Link>
      </div>
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
  } = useInfiniteQuery<
    OptimizationJob[],
    Error,
    InfiniteData<OptimizationJob[], number>,
    (string | string)[],
    number
  >({
    queryKey: ["optimizations", statusFilter, strategyFilter, typeFilter],
    queryFn: async ({
      pageParam = 0,
    }: {
      pageParam: number;
    }): Promise<OptimizationJob[]> => {
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
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length > 0 ? allPages.length : undefined;
    },

    initialPageParam: 0,

    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;

      const hasActiveJob = data.pages
        .flat()
        .some((job) => job.status === "running" || job.status === "pending");

      return hasActiveJob ? 5000 : false;
    },
  });

  useEffect(() => {
    // 무한 스크롤을 위한 로직
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
      // 작업 취소 성공 시, 목록 캐시를 즉시 갱신합니다.
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
      // 작업 삭제 성공 시, 목록 캐시를 즉시 갱신합니다.
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
        {optimizationJobs.map((job: OptimizationJob, index: number) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <OptimizationJobCard
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
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Enhanced Header with gradient background */}
      <div className="relative mb-10">
        <div className="absolute inset-0 gradient-radial-subtle opacity-50 -z-10" />
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-6 border-b">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t("subtitle", {
                defaultMessage: "Find the best parameters for your strategy",
              })}
            </p>
          </div>
          <Link href="/optimization/new">
            <Button size="lg" className="gap-2">
              <PlusCircle className="h-5 w-5" />
              {t("createNewOptimization")}
            </Button>
          </Link>
        </div>
      </div>

      <GlassPane className="p-6 md:p-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Status Tabs */}
            <Tabs
              defaultValue="all"
              value={statusFilter}
              onValueChange={setStatusFilter}
              className="w-full lg:w-auto"
            >
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-6 h-10 bg-background/50 border border-border/50">
                <TabsTrigger value="all">{t("filterStatusAll")}</TabsTrigger>
                <TabsTrigger
                  value="running"
                  className="data-[state=active]:text-blue-700 data-[state=active]:bg-blue-50 dark:data-[state=active]:text-blue-300 dark:data-[state=active]:bg-blue-950/30"
                >
                  {t("filterStatusRunning")}
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="data-[state=active]:text-emerald-700 data-[state=active]:bg-emerald-50 dark:data-[state=active]:text-emerald-300 dark:data-[state=active]:bg-emerald-950/30"
                >
                  {t("filterStatusCompleted")}
                </TabsTrigger>
                <TabsTrigger
                  value="failed"
                  className="data-[state=active]:text-rose-700 data-[state=active]:bg-rose-50 dark:data-[state=active]:text-rose-300 dark:data-[state=active]:bg-rose-950/30"
                >
                  {t("filterStatusFailed")}
                </TabsTrigger>
                <TabsTrigger value="pending">
                  {t("filterStatusPending")}
                </TabsTrigger>
                <TabsTrigger value="canceled">
                  {t("filterStatusCanceled")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* Strategy Combobox */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-full sm:w-[200px] justify-between bg-background/50 border-input/50",
                      !strategyFilter || strategyFilter === "all"
                        ? "text-muted-foreground"
                        : ""
                    )}
                  >
                    {strategyFilter && strategyFilter !== "all"
                      ? strategiesData?.find(
                          (strategy) => strategy.id === strategyFilter
                        )?.name
                      : t("filterStrategyPlaceholder")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 overflow-hidden">
                  <Command className="bg-transparent">
                    <CommandInput placeholder={t("searchStrategy")} />
                    <CommandList>
                      <CommandEmpty>{t("noStrategyFound")}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => setStrategyFilter("all")}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              strategyFilter === "all"
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {t("filterStrategyAll")}
                        </CommandItem>
                        {strategiesData?.map((strategy) => (
                          <CommandItem
                            key={strategy.id}
                            value={strategy.name}
                            onSelect={() => {
                              setStrategyFilter(
                                strategy.id === strategyFilter
                                  ? "all"
                                  : strategy.id
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                strategyFilter === strategy.id
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {strategy.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[150px] bg-background/50 border-input/50">
                  <SelectValue placeholder={t("filterTypePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filterTypeAll")}</SelectItem>
                  <SelectItem value="general">
                    {t("filterTypeGeneral")}
                  </SelectItem>
                  <SelectItem value="wfo">{t("filterTypeWFO")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Reset Button */}
              {(statusFilter !== "all" ||
                strategyFilter !== "all" ||
                typeFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatusFilter("all");
                    setStrategyFilter("all");
                    setTypeFilter("all");
                  }}
                  className="px-3"
                >
                  {t("resetFilters")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* --- 메인 콘텐츠 --- */}
        {renderContent()}

        {/* --- 무한 스크롤 트리거 --- */}
        <div ref={ref} className="h-10 mt-8 flex justify-center items-center">
          {isFetchingNextPage && (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}
          {!hasNextPage && optimizationJobs.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("noMoreResults")}
            </p>
          )}
        </div>
      </GlassPane>
    </div>
  );
}
