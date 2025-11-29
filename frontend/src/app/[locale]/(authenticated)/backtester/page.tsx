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
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import apiClient from "@/lib/apiClient";
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
import { BacktestDetailPanel } from "@/components/domain/backtesting/BacktestDetailPanel";
import {
  PlusCircle,
  BarChartHorizontal,
  ListFilter,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Strategy } from "@/types/strategy";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/Command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Compact skeleton for split view sidebar
const CompactLoadingSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="p-3 border rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
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
  const searchParams = useSearchParams();
  const router = useRouter();

  // Split view state
  const viewBacktestId = searchParams.get("view");
  const isSplitView = !!viewBacktestId;

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

  // Navigation handlers for split view
  const handleNavigateToView = (backtestId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", backtestId);
    router.push(`/backtester?${params.toString()}`);
  };

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view");
    router.push(`/backtester?${params.toString()}`);
  };

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

  // Render split view layout if viewBacktestId is present
  if (isSplitView) {
    return (
      <div className="flex min-h-screen">
        {/* Left sidebar - Backtest list */}
        <AnimatePresence>
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "20%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="hidden md:flex flex-col border-r bg-muted/30 overflow-hidden h-screen sticky top-0"
          >
            {/* Sidebar header */}
            <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold">{t("title")}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t("splitView.backtestCount", { count: backtests.length })}
                  </p>
                </div>
                <Link href="/backtester/new">
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                    <PlusCircle className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Scrollable backtest list */}
            <div className="flex-1 overflow-y-auto p-3 pb-12 space-y-2">
              {isLoading ? (
                <CompactLoadingSkeleton />
              ) : backtests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {t("empty.title")}
                </div>
              ) : (
                backtests.map((backtest: Backtest) => (
                  <div
                    key={backtest.id}
                    className={`transition-all rounded-lg ${
                      viewBacktestId === backtest.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
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
                      compact={true}
                    />
                  </div>
                ))
              )}
              {/* Infinite scroll trigger */}
              <div ref={ref} className="h-10 flex justify-center items-center">
                {isFetchingNextPage && (
                  <Loader2 className="animate-spin h-5 w-5" />
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Right panel - Backtest detail */}
        <motion.div
          initial={{ width: "100%", opacity: 0 }}
          animate={{ width: isSplitView ? "80%" : "100%", opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-1 overflow-y-auto"
        >
          {viewBacktestId && (
            <BacktestDetailPanel
              backtestId={viewBacktestId}
              onClose={handleClose}
            />
          )}
        </motion.div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-10 pb-6 border-b">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("subtitle", {
              defaultMessage: "Manage and analyze your backtests",
            })}
          </p>
        </div>
        <Link href="/backtester/new">
          <Button className="h-10 px-4 shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("createNewBacktest")}
          </Button>
        </Link>
      </div>

      <div className="mb-8 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Status Tabs */}
          <Tabs
            defaultValue="all"
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="w-full lg:w-auto"
          >
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-6 h-10">
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
                    "w-full sm:w-[250px] justify-between",
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
          <p className="text-sm text-muted-foreground">{t("noMoreResults")}</p>
        )}
      </div>
    </div>
  );
}
