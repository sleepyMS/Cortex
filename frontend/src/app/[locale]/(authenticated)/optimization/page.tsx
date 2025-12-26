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
import {
  PlusCircle,
  BarChartHorizontal,
  Zap,
  Loader2,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Strategy } from "@/types/strategy";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
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
    <div className="container mx-auto max-w-7xl px-4 py-12">
      {/* 고도화된 헤더 - 그라데이션 배경 및 배지 포함 */}
      <div className="relative mb-12">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse-slow" />
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -z-10" />

        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8 pb-8 border-b border-border/40">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Optimization Lab
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
              {t("subtitle", {
                defaultMessage: "Find the best parameters for your strategy",
              })}
            </p>
          </div>
          <Link href="/optimization/new" className="shrink-0 w-full md:w-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg blur opacity-0 group-hover:opacity-75 transition duration-500" />
              <Button
                size="lg"
                className="w-full md:w-auto relative gap-2 bg-primary hover:bg-transparent hover:bg-gradient-to-r hover:from-violet-500 hover:to-fuchsia-500 text-primary-foreground shadow-lg hover:shadow-2xl transition-all duration-300 border-0"
              >
                <PlusCircle className="h-5 w-5 group-hover:animate-pulse" />
                <span className="font-semibold">
                  {t("createNewOptimization")}
                </span>
              </Button>
            </div>
          </Link>
        </div>
      </div>

      <GlassPane className="p-6 md:p-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            {/* Status Filter */}
            <div className="flex flex-col gap-3 w-full lg:w-auto">
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">
                Status Filter
              </span>
              <Tabs
                defaultValue="all"
                value={statusFilter}
                onValueChange={setStatusFilter}
                className="w-full lg:w-auto"
              >
                <TabsList className="flex p-1 h-11 bg-muted/50 backdrop-blur-sm border border-border/40 rounded-xl overflow-x-auto no-scrollbar">
                  {[
                    "all",
                    "running",
                    "completed",
                    "failed",
                    "pending",
                    "canceled",
                  ].map((status) => (
                    <TabsTrigger
                      key={status}
                      value={status}
                      className="px-5 rounded-lg font-bold text-xs capitalize transition-all duration-200"
                    >
                      {t(
                        `filterStatus${
                          status.charAt(0).toUpperCase() + status.slice(1)
                        }` as any
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 w-full lg:w-auto">
              {/* Strategy Filter */}
              <div className="flex flex-col gap-3 w-full lg:w-auto">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">
                  Strategy
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full sm:w-[220px] h-10 rounded-lg justify-between bg-background/40 backdrop-blur-sm border-border/40 hover:bg-background transition-all px-4",
                        !strategyFilter || strategyFilter === "all"
                          ? "text-muted-foreground font-medium"
                          : "text-foreground font-bold"
                      )}
                    >
                      <span className="truncate">
                        {strategyFilter && strategyFilter !== "all"
                          ? strategiesData?.find(
                              (strategy) => strategy.id === strategyFilter
                            )?.name
                          : t("filterStrategyPlaceholder")}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[220px] p-0 rounded-xl border-border/40 shadow-2xl overflow-hidden"
                    align="end"
                  >
                    <Command className="bg-transparent">
                      <CommandInput
                        placeholder={t("searchStrategy")}
                        className="h-10"
                      />
                      <CommandList className="max-h-[300px] custom-scrollbar">
                        <CommandEmpty>{t("noStrategyFound")}</CommandEmpty>
                        <CommandGroup className="p-1.5">
                          <CommandItem
                            value="all"
                            onSelect={() => setStrategyFilter("all")}
                            className="rounded-lg h-9 px-2 cursor-pointer mb-1"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-primary",
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
                              className="rounded-lg h-9 px-2 cursor-pointer mb-1"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-primary",
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
              </div>

              {/* Type Filter */}
              <div className="flex flex-col gap-3 w-full lg:w-auto">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">
                  Type
                </span>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px] bg-background/40 border-border/40 h-10 rounded-lg font-medium">
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
              </div>
            </div>
          </div>

          {/* Active Filter Badges - Now placed below the filter controls */}
          {(statusFilter !== "all" ||
            strategyFilter !== "all" ||
            typeFilter !== "all") && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/40"
            >
              <div className="flex items-center gap-2 mr-2">
                <div className="w-1 h-1 rounded-full bg-primary" />
                <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                  Active Filters
                </span>
              </div>
              {statusFilter !== "all" && (
                <Badge
                  variant="secondary"
                  className="gap-1 px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-full text-[10px] font-bold"
                >
                  {t(
                    `filterStatus${
                      statusFilter.charAt(0).toUpperCase() +
                      statusFilter.slice(1)
                    }` as any
                  )}
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="hover:text-foreground transition-colors ml-1"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {strategyFilter !== "all" && (
                <Badge
                  variant="secondary"
                  className="gap-1 px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-full text-[10px] font-bold"
                >
                  <span className="max-w-[120px] truncate">
                    {strategiesData?.find((s) => s.id === strategyFilter)?.name}
                  </span>
                  <button
                    onClick={() => setStrategyFilter("all")}
                    className="hover:text-foreground transition-colors ml-1"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {typeFilter !== "all" && (
                <Badge
                  variant="secondary"
                  className="gap-1 px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-full text-[10px] font-bold"
                >
                  {typeFilter === "general"
                    ? t("filterTypeGeneral")
                    : t("filterTypeWFO")}
                  <button
                    onClick={() => setTypeFilter("all")}
                    className="hover:text-foreground transition-colors ml-1"
                  >
                    <XCircle className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setStrategyFilter("all");
                  setTypeFilter("all");
                }}
                className="h-7 px-3 text-[10px] font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full transition-all"
              >
                Clear All
              </Button>
            </motion.div>
          )}
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
