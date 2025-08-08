"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "use-debounce";

import apiClient from "@/lib/apiClient";
import { AuthGuard } from "@/components/auth/AuthGuard";
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
import {
  PlusCircle,
  Search as SearchIcon,
  List,
  LayoutGrid,
} from "lucide-react";
import { Strategy } from "@/types/strategy";
import { Skeleton } from "@/components/ui/Skeleton";

// --- Helper Components ---
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
  const [sortBy, setSortBy] = useState<string>("created_at_desc");
  const { ref, inView } = useInView();

  const {
    data,
    isLoading, // 👈 첫 페이지 로딩 상태
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage, // 👈 다음 페이지 로딩 상태
  } = useInfiniteQuery({
    queryKey: ["userStrategies", debouncedSearchTerm, filterStatus, sortBy],
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

  // 렌더링할 콘텐츠를 결정하는 함수
  const renderContent = () => {
    // 1. 첫 페이지 로딩: isLoading 상태를 사용하여 스켈레톤 UI만 표시
    if (isLoading) {
      return <LoadingSkeleton viewMode={viewMode} />;
    }
    // 2. 에러 발생 시
    if (isError) {
      return (
        <div className="text-center text-destructive">{t("fetchError")}</div>
      );
    }
    // 3. 데이터가 없을 때
    if (strategies.length === 0) {
      return <EmptyState />;
    }
    // 4. 데이터가 있을 때
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
          />
        ))}
      </div>
    );
  };

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border bg-card p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
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

        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger>
              <SelectValue placeholder={t("sortByPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at_desc">
                {t("sortByNewest")}
              </SelectItem>
              <SelectItem value="updated_at_desc">
                {t("sortByLastUpdated")}
              </SelectItem>
              <SelectItem value="name_asc">{t("sortByNameAsc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderContent()}

        {/* 다음 페이지 로딩: isFetchingNextPage 상태를 사용하여 스피너만 표시 */}
        <div ref={ref} className="h-10 mt-8 flex justify-center items-center">
          {isFetchingNextPage && <Spinner />}
          {!hasNextPage && strategies.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t("noMoreStrategies")}
            </p>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
