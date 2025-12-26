// file: frontend/src/app/[locale]/strategies/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, Suspense } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "use-debounce";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import apiClient from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { Strategy } from "@/types/strategy";

// --- Hooks ---
import { useListStrategyMutation } from "@/hooks/useStrategyMutations";

// --- UI Components ---
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassPane } from "@/components/ui/GlassPane";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Form } from "@/components/ui/Form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { PlusCircle, List, LayoutGrid } from "lucide-react";

// --- Domain Components ---
import { StrategyCard } from "@/components/domain/strategy/StrategyCard";
import { StrategyListingForm } from "@/components/domain/strategy/StrategyListingForm";
import { StrategyListingPreview } from "@/components/domain/strategy/StrategyListingPreview";
import { StrategyEditorPanel } from "@/components/domain/strategy/StrategyEditorPanel";

// --- 설정값 및 Zod 스키마 (페이지 레벨에서 관리) ---
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

const listingFormSchema = z.object({
  price: z.coerce
    .number()
    .min(0, "가격은 0 이상이어야 합니다.")
    .multipleOf(0.01, "가격은 소수점 둘째 자리까지만 입력 가능합니다."),
  category: z.string().min(1, "카테고리를 선택해주세요."),
  representativeBacktestId: z.string().optional(),
  positionType: z.enum(["LongOnly", "ShortOnly", "LongShort"], {
    required_error: "포지션 타입을 선택해주세요.",
  }),
  termsAccepted: z
    .boolean()
    .refine((val) => val === true, { message: "판매 약관에 동의해야 합니다." }),
});
type ListingFormValues = z.infer<typeof listingFormSchema>;

// --- Helper Components ---
const LoadingSkeleton = ({ viewMode }: { viewMode: "grid" | "list" }) =>
  viewMode === "grid" ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
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
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-lg border bg-card p-4"
        >
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-muted-foreground/5 to-transparent" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );

const EmptyState = () => {
  const t = useTranslations("StrategiesPage");
  return (
    <div className="relative flex flex-col items-center justify-center py-20 px-6 border border-dashed rounded-2xl bg-muted/20">
      {/* Decorative gradient background */}
      <div className="absolute inset-0 gradient-mesh opacity-30 rounded-2xl" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
          <PlusCircle className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t("empty.title")}
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {t("empty.description")}
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/strategies/new">
            <Button size="lg" className="gap-2">
              <PlusCircle className="h-5 w-5" />
              {t("empty.createButton")}
            </Button>
          </Link>
          <Button variant="outline" size="lg">
            {t("empty.templateButton")}
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---
function StrategiesPageContent() {
  const t = useTranslations("StrategiesPage");
  const searchParams = useSearchParams();
  const router = useRouter();

  // --- 상태 관리 ---
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "public" | "private"
  >("all");
  const [indicatorFilter, setIndicatorFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated_at_desc");
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);

  // 모달을 열기 위해 사용자가 클릭한 '요약' 전략 정보
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(
    null
  );

  // API로부터 받아온 '상세' 전략 정보 (모달 UI의 진실의 원천)
  // const [strategyDetail, setStrategyDetail] = useState<Strategy | null>(null);

  const [autoDetectedPositionType, setAutoDetectedPositionType] = useState<
    string | null
  >(null);

  const { ref, inView } = useInView();
  const listStrategyMutation = useListStrategyMutation();

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    mode: "onChange",
  });

  const watchedPositionType = form.watch("positionType");

  // --- 데이터 페칭 (전략 목록) ---
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

  // --- 데이터 페칭 (전략 상세 정보) ---
  const {
    data: strategyDetailData,
    isSuccess,
    isFetching,
    refetch: fetchStrategyDetail,
  } = useQuery({
    queryKey: ["strategyDetail", selectedStrategy?.id],
    queryFn: async () => {
      if (!selectedStrategy?.id) return null;
      const res = await apiClient.get(`/strategies/${selectedStrategy.id}`);
      return res.data as Strategy;
    },
    enabled: false,
  });

  // --- 핵심 로직: 상세 데이터 로딩 성공 후 모든 관련 상태를 업데이트 ---
  useEffect(() => {
    if (isSuccess && strategyDetailData) {
      // setStrategyDetail(strategyDetailData);

      const hasLong =
        (strategyDetailData.longEntryRules?.blocks.length ?? 0) > 0;
      const hasShort =
        (strategyDetailData.shortEntryRules?.blocks.length ?? 0) > 0;
      let autoDetectedType: "LongOnly" | "ShortOnly" | "LongShort" =
        "LongShort";
      if (hasLong && !hasShort) autoDetectedType = "LongOnly";
      if (!hasLong && hasShort) autoDetectedType = "ShortOnly";

      // [수정] 이미 저장된 리스팅 정보가 없을 때만 autoDetectedPositionType state를 설정합니다.
      if (!strategyDetailData.marketplaceListing?.positionType) {
        setAutoDetectedPositionType(autoDetectedType);
      } else {
        setAutoDetectedPositionType(null); // 기존 정보가 있으면 비교 로직을 비활성화합니다.
      }

      const latestBacktest =
        strategyDetailData.backtests && strategyDetailData.backtests.length > 0
          ? [...strategyDetailData.backtests].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )[0]
          : null;

      form.reset({
        price: strategyDetailData.marketplaceListing?.price ?? 10.0,
        category: strategyDetailData.marketplaceListing?.category ?? "",
        positionType:
          strategyDetailData.marketplaceListing?.positionType ||
          autoDetectedType,
        representativeBacktestId:
          strategyDetailData.marketplaceListing?.representativeBacktestId ||
          latestBacktest?.id ||
          undefined,
        termsAccepted: false,
      });

      if (!strategyDetailData.marketplaceListing?.positionType) {
        toast.info(
          `전략 분석 결과, '${autoDetectedType}' 타입으로 자동 선택되었습니다.`
        );
      }
    }
  }, [isSuccess, strategyDetailData, form]);

  // 사용자가 positionType을 변경할 때마다 경고를 띄우는 로직
  useEffect(() => {
    // 1. 자동 분석된 타입이 있고,
    // 2. 현재 선택된 타입이 있으며,
    // 3. 두 타입이 다를 경우에만 경고 토스트를 띄웁니다.
    if (
      autoDetectedPositionType &&
      watchedPositionType &&
      watchedPositionType !== autoDetectedPositionType
    ) {
      toast.warning(
        "자동 분석된 포지션 타입과 다른 옵션을 선택하셨습니다. 이 전략은 선택된 타입으로 거래 시 의도와 다르게 동작할 수 있습니다."
        // {
        //   id: "position-type-warning", // ID를 부여하여 중복 토스트 방지
        // }
      );
    }
  }, [watchedPositionType, autoDetectedPositionType]);

  // 무한 스크롤 로직
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const strategies = data?.pages.flat() ?? [];

  // --- 이벤트 핸들러 ---
  const handleOpenListingModal = (strategy: Strategy) => {
    // setStrategyDetail(null); // 이전 데이터 지우고 로딩 상태로 전환
    setSelectedStrategy(strategy);
    setIsListingModalOpen(true);
  };

  // 모달이 열리면 상세 데이터 로딩 트리거
  useEffect(() => {
    if (isListingModalOpen && selectedStrategy) {
      fetchStrategyDetail();
    }
  }, [isListingModalOpen, selectedStrategy, fetchStrategyDetail]);

  const handleListingSubmit = (values: ListingFormValues) => {
    if (!selectedStrategy) return;
    listStrategyMutation.mutate(
      {
        strategyId: selectedStrategy.id,
        ...values,
      },
      {
        onSuccess: () => {
          setIsListingModalOpen(false);
          setSelectedStrategy(null);
        },
      }
    );
  };

  // --- 렌더링 로직 ---
  const renderContent = () => {
    if (isLoading) return <LoadingSkeleton viewMode={viewMode} />;
    if (isError)
      return (
        <div className="text-center text-destructive">{t("fetchError")}</div>
      );
    if (strategies.length === 0) return <EmptyState />;

    return (
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            : "flex flex-col gap-3"
        }
      >
        {strategies.map((strategy: Strategy, index: number) => (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <StrategyCard
              strategy={strategy}
              viewMode={viewMode}
              onOpenListingModal={handleOpenListingModal}
            />
          </motion.div>
        ))}
      </div>
    );
  };

  const handleModalOpenChange = (isOpen: boolean) => {
    setIsListingModalOpen(isOpen);
    if (!isOpen) {
      // 모달이 닫힐 때 선택된 전략 상태를 초기화합니다.
      setSelectedStrategy(null);
    }
  };

  // --- Split view logic ---
  const editStrategyId = searchParams.get("edit");
  const isCreating = searchParams.get("create") === "true";
  const isSplitView = !!(editStrategyId || isCreating);

  const handleCloseEditor = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    params.delete("create");
    router.push(`/strategies?${params.toString()}`);
  };

  const handleNavigateToEdit = (strategyId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("edit", strategyId);
    router.push(`/strategies?${params.toString()}`);
  };

  const handleNavigateToCreate = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit"); // ← edit 파라미터 제거
    params.set("create", "true");
    router.push(`/strategies?${params.toString()}`);
  };

  // Force list view when in split view mode
  const effectiveViewMode = isSplitView ? "list" : viewMode;

  return (
    <>
      {/* Split view layout */}
      {isSplitView ? (
        <div className="flex h-full overflow-hidden">
          {/* Left sidebar - Strategy list (hidden on mobile) */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "320px", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="hidden md:flex flex-col border-r bg-muted/30 overflow-hidden h-full"
          >
            <div className="flex-shrink-0 p-4 border-b bg-background/50 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-foreground">
                    {t("title")}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("splitView.strategyCount", { count: strategies.length })}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleNavigateToCreate}
                  className="h-8 px-3 flex-shrink-0"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  <span className="text-xs">{t("splitView.createButton")}</span>
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pb-12 space-y-2">
              {isLoading ? (
                <LoadingSkeleton viewMode="list" />
              ) : strategies.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  {t("noStrategiesAvailable")}
                </div>
              ) : (
                strategies.map((strategy: Strategy) => (
                  <div
                    key={strategy.id}
                    className={`transition-all rounded-lg ${
                      editStrategyId === strategy.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                  >
                    <StrategyCard
                      strategy={strategy}
                      viewMode="list"
                      compact={true}
                      onOpenListingModal={handleOpenListingModal}
                    />
                  </div>
                ))
              )}
              {/* Infinite scroll trigger */}
              <div ref={ref} className="h-10 flex justify-center items-center">
                {isFetchingNextPage && <Spinner />}
              </div>
            </div>
          </motion.div>

          {/* Right panel - Strategy editor */}
          <motion.div
            initial={{ width: "100%", opacity: 0 }}
            animate={{ width: isSplitView ? "80%" : "100%", opacity: 1 }}
            exit={{ width: "100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex-1 overflow-hidden"
          >
            <StrategyEditorPanel
              strategyId={editStrategyId}
              onClose={handleCloseEditor}
            />
          </motion.div>
        </div>
      ) : (
        /* Normal full-width view */
        <div className="container mx-auto max-w-7xl px-4 py-12">
          {/* 1. Enhanced page header with gradient */}
          <div className="relative mb-12">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse-slow pointer-events-none" />
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8 pb-8 border-b border-border/40">
              <div className="space-y-4 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Strategy Hub
                </div>
                <h1 className="text-5xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
                  {t("title")}
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                  {t("subtitle", {
                    defaultMessage: "운용 전략을 정밀하게 설계하고 관리하세요.",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="hidden sm:flex items-center p-1 bg-muted/30 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
                  <Button
                    variant={
                      effectiveViewMode === "grid" ? "secondary" : "ghost"
                    }
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                    className={cn(
                      "h-9 w-9 p-0 rounded-lg transition-all",
                      effectiveViewMode === "grid" ? "shadow-sm" : ""
                    )}
                  >
                    <LayoutGrid className="h-4.5 w-4.5" />
                  </Button>
                  <Button
                    variant={
                      effectiveViewMode === "list" ? "secondary" : "ghost"
                    }
                    size="sm"
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    className={cn(
                      "h-9 w-9 p-0 rounded-lg transition-all",
                      effectiveViewMode === "list" ? "shadow-sm" : ""
                    )}
                  >
                    <List className="h-4.5 w-4.5" />
                  </Button>
                </div>
                <Button
                  size="lg"
                  className="flex-1 md:flex-none gap-2.5 px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
                  onClick={handleNavigateToCreate}
                >
                  <PlusCircle className="h-5 w-5" />
                  <span className="font-bold">{t("createNewStrategy")}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* 2. Content Area wrapped in GlassPane */}
          <GlassPane className="p-6 md:p-8">
            {/* Filter UI */}
            <div className="mb-10 space-y-6">
              <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                {/* 검색 입력창 */}
                <div className="relative w-full lg:w-[400px] group">
                  <Input
                    placeholder={t("searchPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-12 bg-background/40 border-border/40 w-full transition-all focus:ring-4 focus:ring-primary/10 rounded-xl font-medium"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-search"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                  {/* 상태 필터 */}
                  <div className="space-y-1.5 min-w-[160px]">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">
                      Status Filter
                    </span>
                    <Select
                      value={filterStatus}
                      onValueChange={(v: any) => setFilterStatus(v)}
                    >
                      <SelectTrigger className="w-full bg-background/40 border-border/40 h-10 rounded-lg">
                        <SelectValue placeholder={t("filterPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("filterAll")}</SelectItem>
                        <SelectItem value="public">
                          {t("filterPublic")}
                        </SelectItem>
                        <SelectItem value="private">
                          {t("filterPrivate")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 지표 필터 */}
                  <div className="space-y-1.5 min-w-[180px]">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">
                      Indicators
                    </span>
                    <Select
                      value={indicatorFilter}
                      onValueChange={(v: any) => setIndicatorFilter(v)}
                    >
                      <SelectTrigger className="w-full bg-background/40 border-border/40 h-10 rounded-lg">
                        <SelectValue
                          placeholder={t("indicatorFilterPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("indicatorFilterAll")}
                        </SelectItem>
                        {KEY_INDICATORS.map((indicator) => (
                          <SelectItem key={indicator} value={indicator}>
                            {indicator}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 정렬 */}
                  <div className="space-y-1.5 min-w-[180px]">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 ml-1">
                      Sort By
                    </span>
                    <Select
                      value={sortBy}
                      onValueChange={(v: any) => setSortBy(v)}
                    >
                      <SelectTrigger className="w-full bg-background/40 border-border/40 h-10 rounded-lg">
                        <SelectValue placeholder={t("sortByPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="updated_at_desc">
                          {t("sortByLastUpdated")}
                        </SelectItem>
                        <SelectItem value="created_at_desc">
                          {t("sortByNewest")}
                        </SelectItem>
                        <SelectItem value="name_asc">
                          {t("sortByNameAsc")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Active Filter Badges */}
              {(filterStatus !== "all" ||
                indicatorFilter !== "all" ||
                debouncedSearchTerm) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">
                    Active Filters:
                  </span>
                  {filterStatus !== "all" && (
                    <Badge
                      variant="secondary"
                      className="gap-1 px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                    >
                      {filterStatus === "public"
                        ? t("filterPublic")
                        : t("filterPrivate")}
                      <button
                        onClick={() => setFilterStatus("all")}
                        className="hover:text-foreground"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )}
                  {indicatorFilter !== "all" && (
                    <Badge
                      variant="secondary"
                      className="gap-1 px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                    >
                      {indicatorFilter}
                      <button
                        onClick={() => setIndicatorFilter("all")}
                        className="hover:text-foreground"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )}
                  {debouncedSearchTerm && (
                    <Badge
                      variant="secondary"
                      className="gap-1 px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                    >
                      &quot;{debouncedSearchTerm}&quot;
                      <button
                        onClick={() => setSearchTerm("")}
                        className="hover:text-foreground"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterStatus("all");
                      setIndicatorFilter("all");
                      setSearchTerm("");
                    }}
                    className="h-6 px-2 text-[10px] font-bold text-muted-foreground hover:text-primary"
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>

            {/* 3. 전략 목록 */}
            {renderContent()}

            {/* 4. 무한 스크롤 감지 영역 */}
            <div
              ref={ref}
              className="h-10 mt-8 flex justify-center items-center"
            >
              {isFetchingNextPage && <Spinner />}
              {!hasNextPage && strategies.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("noMoreStrategies")}
                </p>
              )}
            </div>
          </GlassPane>

          {/* 5. 마켓 등록/수정 모달 */}
          <Dialog
            open={isListingModalOpen}
            onOpenChange={handleModalOpenChange}
          >
            <DialogContent className="max-w-4xl p-0">
              {isFetching || !strategyDetailData ? (
                <div className="flex items-center justify-center h-[600px]">
                  <Spinner size="lg" />
                </div>
              ) : (
                <Form {...form}>
                  <div className="grid grid-cols-1 md:grid-cols-5">
                    {/* 좌측: 미리보기 패널 */}
                    <div className="col-span-2 p-6 hidden md:block bg-muted/50 border-r">
                      <DialogHeader className="mb-6">
                        <DialogTitle className="text-xl">
                          {t("modalPreviewTitle")}
                        </DialogTitle>
                        <DialogDescription>
                          {t("modalPreviewDescription")}
                        </DialogDescription>
                      </DialogHeader>
                      <StrategyListingPreview
                        strategy={strategyDetailData}
                        control={form.control}
                      />
                    </div>

                    {/* 우측: 설정 폼 패널 */}
                    <div className="col-span-3 p-8 overflow-y-auto max-h-[90vh]">
                      <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-bold">
                          {strategyDetailData.marketplaceListing
                            ? t("modalEditTitle")
                            : t("modalRegisterTitle")}
                        </DialogTitle>
                        <DialogDescription>
                          {t("modalDescription", {
                            strategyName: strategyDetailData.name,
                          })}
                        </DialogDescription>
                      </DialogHeader>
                      <StrategyListingForm
                        onSubmit={form.handleSubmit(handleListingSubmit)}
                        isSubmitting={listStrategyMutation.isPending}
                        strategy={strategyDetailData}
                      />
                    </div>
                  </div>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function StrategiesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <Spinner size="lg" />
        </div>
      }
    >
      <StrategiesPageContent />
    </Suspense>
  );
}
