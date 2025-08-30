// file: frontend/src/app/[locale]/strategies/page.tsx

"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "use-debounce";

import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { StrategyCard } from "@/components/domain/strategy/StrategyCard";
import { PlusCircle, List, LayoutGrid } from "lucide-react";
import { Strategy } from "@/types/strategy";
import { Skeleton } from "@/components/ui/Skeleton";
import { StrategyListingForm } from "@/components/domain/strategy/StrategyListingForm"; // 폼 컴포넌트 import
import { useListStrategyMutation } from "@/hooks/useStrategyMutations"; // 신규 훅 import
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { StrategyListingPreview } from "@/components/domain/strategy/StrategyListingPreview";

// --- 주요 지표 목록 (변경 없음) ---
const KEY_INDICATORS = [
  "RSI",
  "MACD",
  "EMA",
  "SMA",
  "BBands",
  "Stochastic",
  "CCI",
  "ATR",
  "SuperTrend",
  "Ichimoku",
];

// --- Helper Components (변경 없음) ---
const LoadingSkeleton = ({ viewMode }: { viewMode: "grid" | "list" }) =>
  viewMode === "grid" ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 p-6 border rounded-lg">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <div className="flex justify-between items-center pt-4">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );

const EmptyState = () => {
  const t = useTranslations("StrategiesPage");
  return (
    <div className="text-center py-16 border border-dashed rounded-lg">
      <h2 className="text-xl font-semibold">{t("empty.title")}</h2>
      <p className="text-muted-foreground mt-2 mb-6">
        {t("empty.description")}
      </p>
      <div className="flex justify-center gap-4">
        <Link href="/strategies/new">
          <Button>{t("empty.createButton")}</Button>
        </Link>
        <Button variant="outline">{t("empty.templateButton")}</Button>
      </div>
    </div>
  );
};

// --- Main Page Component ---
export default function StrategiesPage() {
  const t = useTranslations("StrategiesPage");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "public" | "private"
  >("all");
  const [indicatorFilter, setIndicatorFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated_at_desc");
  const { ref, inView } = useInView();
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(
    null
  );
  const listStrategyMutation = useListStrategyMutation();

  const handleOpenListingModal = (strategy: Strategy) => {
    setSelectedStrategy(strategy);
    setIsListingModalOpen(true);
  };

  const handleListingSubmit = (values: any) => {
    if (!selectedStrategy) return;
    listStrategyMutation.mutate(
      { strategyId: selectedStrategy.id, listingData: values },
      {
        onSuccess: () => {
          setIsListingModalOpen(false);
          setSelectedStrategy(null);
        },
      }
    );
  };

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "userStrategies",
      debouncedSearchTerm,
      filterStatus,
      sortBy,
      indicatorFilter,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const limit = 12;
      const params = new URLSearchParams({
        skip: (pageParam * limit).toString(),
        limit: limit.toString(),
        sort_by: sortBy,
      });
      if (debouncedSearchTerm) params.set("search_query", debouncedSearchTerm);
      if (filterStatus !== "all")
        params.set("is_public_filter", (filterStatus === "public").toString());
      if (indicatorFilter !== "all") {
        params.set("indicator_filter", indicatorFilter);
      }
      const res = await apiClient.get(`/strategies?${params.toString()}`);
      return res.data;
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length > 0 ? allPages.length : undefined,
    initialPageParam: 0,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const strategies = data?.pages.flat() ?? [];

  const renderContent = () => {
    if (isLoading) {
      return <LoadingSkeleton viewMode={viewMode} />;
    }
    if (isError) {
      return (
        <div className="text-center text-destructive">{t("fetchError")}</div>
      );
    }
    if (strategies.length === 0) {
      return <EmptyState />;
    }
    return (
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            : "flex flex-col gap-3"
        }
      >
        {strategies.map((strategy: Strategy) => (
          <StrategyCard
            key={strategy.id}
            strategy={strategy}
            viewMode={viewMode}
            onOpenListingModal={handleOpenListingModal}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border bg-card p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/strategies/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("createNewStrategy")}
            </Button>
          </Link>
        </div>
      </div>

      {/* ▼▼▼ [수정] 제안해주신 대로 필터 레이아웃을 5열 그리드로 변경 ▼▼▼ */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="lg:col-span-2"
        />
        <Select
          value={filterStatus}
          onValueChange={(v: any) => setFilterStatus(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("filterPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            <SelectItem value="public">{t("filterPublic")}</SelectItem>
            <SelectItem value="private">{t("filterPrivate")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={indicatorFilter}
          onValueChange={(v: any) => setIndicatorFilter(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("indicatorFilterPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("indicatorFilterAll")}</SelectItem>
            {KEY_INDICATORS.map((indicator) => (
              <SelectItem key={indicator} value={indicator}>
                {indicator}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger>
            <SelectValue placeholder={t("sortByPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_at_desc">
              {t("sortByLastUpdated")}
            </SelectItem>
            <SelectItem value="created_at_desc">{t("sortByNewest")}</SelectItem>
            <SelectItem value="name_asc">{t("sortByNameAsc")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {renderContent()}

      <div ref={ref} className="h-10 mt-8 flex justify-center items-center">
        {isFetchingNextPage && <Spinner />}
        {!hasNextPage && strategies.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("noMoreStrategies")}
          </p>
        )}
      </div>

      {/* 마켓 등록/수정 모달 */}
      <Dialog open={isListingModalOpen} onOpenChange={setIsListingModalOpen}>
        <DialogContent className="max-w-4xl p-0">
          {/* Grid 레이아웃으로 좌우 패널 분리 */}
          <div className="grid grid-cols-1 md:grid-cols-5">
            {/* 좌측: 전략 정보 확인 패널 (2/5 너비) */}
            <div className="col-span-2 p-6 hidden md:block bg-muted/50">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl">
                  {t("modalPreviewTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("modalPreviewDescription")}
                </DialogDescription>
              </DialogHeader>
              {selectedStrategy && (
                <StrategyListingPreview strategy={selectedStrategy} />
              )}
            </div>

            {/* 우측: 판매 조건 설정 폼 (3/5 너비) */}
            <div className="col-span-3 p-8">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold">
                  {selectedStrategy?.marketplaceListing
                    ? t("modalEditTitle")
                    : t("modalRegisterTitle")}
                </DialogTitle>
                {/* [개선] 등록할 전략 이름을 명확히 표시 */}
                <DialogDescription>
                  {t("modalDescription", {
                    strategyName: selectedStrategy?.name,
                  })}
                </DialogDescription>
              </DialogHeader>
              {selectedStrategy && (
                <StrategyListingForm
                  strategy={selectedStrategy}
                  onSubmit={handleListingSubmit}
                  isSubmitting={listStrategyMutation.isPending}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
