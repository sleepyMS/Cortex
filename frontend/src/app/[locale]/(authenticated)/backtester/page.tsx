// file: frontend/src/app/[locale]/(authenticated)/backtester/page.tsx

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
import { Button } from "@/components/ui/Button";
import {
  Backtest,
  BacktestCard,
} from "@/components/domain/backtesting/BacktestCard";
import { GlassPane } from "@/components/ui/GlassPane";
import {
  PlusCircle,
  BarChartHorizontal,
  Check,
  ChevronsUpDown,
  Filter,
  X,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Strategy } from "@/types/strategy";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/40 p-6 space-y-6"
        style={{ animationDelay: `${i * 100}ms` }}
      >
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-primary/5 to-transparent" />

        <div className="flex justify-between items-start gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-border/40">
          <div className="space-y-1">
            <Skeleton className="h-2 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = () => {
  const t = useTranslations("BacktesterPage");
  return (
    <div className="relative flex flex-col items-center justify-center py-20 px-6 border border-dashed rounded-2xl bg-muted/20">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 gradient-mesh opacity-30 rounded-2xl" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
          <BarChartHorizontal className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("empty.title")}
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {t("empty.description")}
        </p>
        <Link href="/backtester/new">
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
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasActiveJob = data?.pages
        .flat()
        .some((bt) => bt.status === "running" || bt.status === "pending");
      return hasActiveJob ? 5000 : false;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {backtests.map((backtest: Backtest, index: number) => (
          <motion.div
            key={backtest.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: (index % 12) * 0.05,
            }}
          >
            <BacktestCard
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
              Backtest Lab
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
              {t("subtitle", {
                defaultMessage:
                  "운용 전략을 정밀하게 검증하고 성과를 분석하세요.",
              })}
            </p>
          </div>
          <Link href="/backtester/new" className="shrink-0 w-full md:w-auto">
            <Button
              size="lg"
              className="w-full md:w-auto gap-2.5 px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
              onClick={() => {}} // Link wrapping handles navigation
            >
              <PlusCircle className="h-5 w-5" />
              <span className="font-bold">{t("createNewBacktest")}</span>
            </Button>
          </Link>
        </div>
      </div>

      <GlassPane className="p-1 md:p-1 rounded-[32px] border-border/30 overflow-hidden">
        <div className="bg-muted/5 p-6 md:p-8 space-y-8">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
              {/* 패싯 필터 UI - 상태 */}
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

              {/* 전략 선택 콤보박스 고도화 */}
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
                        "w-full sm:w-[280px] h-10 rounded-lg justify-between bg-background/40 backdrop-blur-sm border-border/40 hover:bg-background transition-all px-4",
                        !strategyFilter || strategyFilter === "all"
                          ? "text-muted-foreground font-medium"
                          : "text-foreground font-bold"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 opacity-40" />
                        <span className="truncate">
                          {strategyFilter && strategyFilter !== "all"
                            ? strategiesData?.find(
                                (strategy) => strategy.id === strategyFilter
                              )?.name
                            : t("filterStrategyPlaceholder")}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-40" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[280px] p-0 rounded-2xl border-border/40 shadow-2xl overflow-hidden"
                    align="end"
                  >
                    <Command className="bg-transparent">
                      <CommandInput
                        placeholder={t("searchStrategy")}
                        className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <CommandList className="max-h-[300px] custom-scrollbar">
                        <CommandEmpty>{t("noStrategyFound")}</CommandEmpty>
                        <CommandGroup className="p-1.5">
                          <CommandItem
                            value="all"
                            onSelect={() => setStrategyFilter("all")}
                            className="rounded-lg h-10 px-3 cursor-pointer mb-1"
                          >
                            <div className="flex items-center gap-2 flex-grow font-medium">
                              <Check
                                className={cn(
                                  "h-4 w-4 text-primary",
                                  strategyFilter === "all"
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {t("filterStrategyAll")}
                            </div>
                          </CommandItem>
                          {strategiesData?.map((strategy) => (
                            <CommandItem
                              key={strategy.id}
                              value={strategy.name}
                              onSelect={() =>
                                setStrategyFilter(
                                  strategy.id === strategyFilter
                                    ? "all"
                                    : strategy.id
                                )
                              }
                              className="rounded-lg h-10 px-3 cursor-pointer mb-1"
                            >
                              <div className="flex items-center gap-2 flex-grow font-medium">
                                <Check
                                  className={cn(
                                    "h-4 w-4 text-primary",
                                    strategyFilter === strategy.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {strategy.name}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* 활성 필터 배지 섹션 */}
            {(statusFilter !== "all" || strategyFilter !== "all") && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-2 pt-2"
              >
                <div className="flex items-center gap-2 mr-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] uppercase font-black text-foreground tracking-tighter">
                    Active Filters
                  </span>
                </div>

                {statusFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="gap-1.5 px-3 py-1.5 rounded-lg bg-background border-border/40 font-bold text-[10px] text-foreground transition-all hover:border-primary/20 group"
                  >
                    Status:{" "}
                    {t(
                      `filterStatus${
                        statusFilter.charAt(0).toUpperCase() +
                        statusFilter.slice(1)
                      }` as any
                    )}
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                {strategyFilter !== "all" && (
                  <Badge
                    variant="secondary"
                    className="gap-1.5 px-3 py-1.5 rounded-lg bg-background border-border/40 font-bold text-[10px] text-foreground transition-all hover:border-primary/20 group"
                  >
                    Strategy:{" "}
                    {strategiesData?.find((s) => s.id === strategyFilter)?.name}
                    <button
                      onClick={() => setStrategyFilter("all")}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setStrategyFilter("all");
                  }}
                  className="h-8 px-3 rounded-lg text-[10px] font-black uppercase text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ml-1"
                >
                  Clear All
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="px-6 md:px-8 pb-12">{renderContent()}</div>

        <div ref={ref} className="h-10 mt-8 flex justify-center items-center">
          {isFetchingNextPage && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          )}
          {!hasNextPage && backtests.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("noMoreResults")}
            </p>
          )}
        </div>
      </GlassPane>
    </div>
  );
}
