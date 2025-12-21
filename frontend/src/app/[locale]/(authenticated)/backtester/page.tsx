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
} from "lucide-react";
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

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <div
        key={i}
        className="relative overflow-hidden rounded-xl border bg-card p-5 space-y-4"
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
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Stats area */}
        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30">
          <div className="space-y-2 text-center">
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-6 w-12 mx-auto" />
          </div>
          <div className="space-y-2 text-center border-l border-border/50">
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-6 w-12 mx-auto" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t">
          <Skeleton className="h-4 w-24" />
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
                defaultMessage: "Manage and analyze your backtests",
              })}
            </p>
          </div>
          <Link href="/backtester/new">
            <Button size="lg" className="gap-2">
              <PlusCircle className="h-5 w-5" />
              {t("createNewBacktest")}
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
                      "w-full sm:w-[250px] justify-between bg-background/50 border-input/50",
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
                <PopoverContent className="w-[250px] p-0 overflow-hidden">
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

              {/* Reset Button */}
              {(statusFilter !== "all" || strategyFilter !== "all") && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatusFilter("all");
                    setStrategyFilter("all");
                  }}
                  className="px-3"
                >
                  {t("resetFilters")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {renderContent()}

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
