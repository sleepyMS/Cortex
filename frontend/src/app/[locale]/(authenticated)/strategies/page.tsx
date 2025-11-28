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
import { Strategy } from "@/types/strategy";

// --- Hooks ---
import { useListStrategyMutation } from "@/hooks/useStrategyMutations";

// --- UI Components ---
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
import { Skeleton } from "@/components/ui/Skeleton";
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
        <div className="flex min-h-screen">
          {/* Left sidebar - Strategy list (hidden on mobile) */}
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "20%", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="hidden md:flex flex-col border-r bg-muted/30 overflow-hidden h-screen sticky top-0"
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
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
                    onClick={() => handleNavigateToEdit(strategy.id)}
                    className={`cursor-pointer transition-all rounded-lg ${
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
            className="flex-1 overflow-y-auto"
          >
            <StrategyEditorPanel
              strategyId={editStrategyId}
              onClose={handleCloseEditor}
            />
          </motion.div>
        </div>
      ) : (
        /* Normal full-width view */
        <div className="container mx-auto max-w-7xl px-4 py-8">
          {/* 1. 페이지 헤더 */}
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-10 pb-6 border-b">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {t("title")}
              </h1>
              <p className="text-muted-foreground text-lg">
                {t("subtitle", {
                  defaultMessage: "Manage and analyze your trading strategies",
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center p-1 bg-muted/50 rounded-lg border">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  className="h-9 w-9 p-0"
                >
                  <LayoutGrid className="h-5 w-5" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  className="h-9 w-9 p-0"
                >
                  <List className="h-5 w-5" />
                </Button>
              </div>
              <Button
                className="h-10 px-4 shadow-sm"
                onClick={handleNavigateToCreate}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("createNewStrategy")}
              </Button>
            </div>
          </div>

          {/* 2. 필터링 UI */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* 검색 입력창 */}
              <div className="relative w-full lg:w-[300px]">
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-10 bg-background w-full transition-all focus:ring-2 focus:ring-primary/20"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-search"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* 상태 필터 */}
                <Select
                  value={filterStatus}
                  onValueChange={(v: any) => setFilterStatus(v)}
                >
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder={t("filterPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("filterAll")}</SelectItem>
                    <SelectItem value="public">{t("filterPublic")}</SelectItem>
                    <SelectItem value="private">
                      {t("filterPrivate")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* 지표 필터 */}
                <Select
                  value={indicatorFilter}
                  onValueChange={(v: any) => setIndicatorFilter(v)}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
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

                {/* 정렬 */}
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-full sm:w-[160px]">
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

                {/* 필터 초기화 버튼 */}
                {(filterStatus !== "all" || indicatorFilter !== "all") && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFilterStatus("all");
                      setIndicatorFilter("all");
                    }}
                    className="px-3"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 3. 전략 목록 */}
          {renderContent()}

          {/* 4. 무한 스크롤 감지 영역 */}
          <div ref={ref} className="h-10 mt-8 flex justify-center items-center">
            {isFetchingNextPage && <Spinner />}
            {!hasNextPage && strategies.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("noMoreStrategies")}
              </p>
            )}
          </div>

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
