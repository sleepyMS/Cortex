// file: frontend/src/components/domain/backtesting/BacktestSidebar.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  BarChartHorizontal,
  Loader2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import Link from "next/link";

import apiClient from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Backtest,
  BacktestCard,
} from "@/components/domain/backtesting/BacktestCard";
import { Strategy } from "@/types/strategy";

interface BacktestSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Compact skeleton for sidebar
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

export function BacktestSidebar({ collapsed, onToggle }: BacktestSidebarProps) {
  const t = useTranslations("BacktesterPage");
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { ref, inView } = useInView();

  // Extract current backtest ID from pathname
  const currentBacktestId = React.useMemo(() => {
    const match = pathname.match(/\/backtester\/([^/]+)$/);
    return match ? match[1] : null;
  }, [pathname]);

  // State for filters
  const [strategyFilter, setStrategyFilter] = useState<string>("all");

  // Query strategies for filter
  const { data: strategiesData } = useQuery<Strategy[]>({
    queryKey: ["userStrategiesForFilter"],
    queryFn: async () => (await apiClient.get("/strategies?limit=1000")).data,
  });

  // Infinite query for backtests
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["backtests", "all", strategyFilter],
      queryFn: async ({ pageParam = 0 }) => {
        const limit = 12;
        const params = new URLSearchParams({
          skip: (pageParam * limit).toString(),
          limit: limit.toString(),
        });
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

  // Mutations
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

  // Collapsed state - show only toggle button
  if (collapsed) {
    return (
      <div className="w-12 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: "320px", opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="hidden md:flex flex-col border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 overflow-hidden h-screen sticky top-0"
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold">{t("splitView.title")}</h2>
          <div className="flex items-center gap-1">
            <Link href="/backtester/new">
              <Button size="sm" className="gap-1.5 h-8">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {t("splitView.createButton")}
                </span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("splitView.backtestCount", { count: backtests.length })}
        </p>
      </div>

      {/* Filter */}
      <div className="px-4 py-3 border-b bg-muted/20">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">
          {t("splitView.filterLabel")}
        </label>
        <Select value={strategyFilter} onValueChange={setStrategyFilter}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={t("filterByStrategy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStrategies")}</SelectItem>
            {strategiesData?.map((strategy) => (
              <SelectItem key={strategy.id} value={strategy.id}>
                {strategy.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5">
        {isLoading ? (
          <CompactLoadingSkeleton />
        ) : backtests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <BarChartHorizontal className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">
              {t("splitView.emptyTitle")}
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-[200px]">
              {t("splitView.emptyDescription")}
            </p>
          </div>
        ) : (
          backtests.map((backtest: Backtest) => (
            <div
              key={backtest.id}
              className={cn(
                "transition-all rounded-lg",
                currentBacktestId === backtest.id &&
                  "ring-2 ring-primary shadow-sm"
              )}
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
        <div ref={ref} className="h-12 flex justify-center items-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="animate-spin h-4 w-4" />
              <span>{t("splitView.loadingMore")}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
