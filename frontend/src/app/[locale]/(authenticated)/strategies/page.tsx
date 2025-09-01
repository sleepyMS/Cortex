// file: frontend/src/app/[locale]/strategies/page.tsx
"use client";

import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useDebounce } from "use-debounce";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
export default function StrategiesPage() {
  const t = useTranslations("StrategiesPage");

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
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(
    null
  );

  // 모달에 표시될 상세 전략 정보와 로딩 상태를 위한 별도의 상태
  const [strategyDetail, setStrategyDetail] = useState<Strategy | null>(null);

  const { ref, inView } = useInView();
  const listStrategyMutation = useListStrategyMutation();

  // --- 폼 상태 관리 (상태 끌어올리기) ---
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    mode: "onChange",
  });

  // 모달이 열릴 때마다 선택된 전략의 정보로 폼을 리셋
  useEffect(() => {
    if (selectedStrategy) {
      const hasLong = (selectedStrategy.longEntryRules?.blocks.length ?? 0) > 0;
      const hasShort =
        (selectedStrategy.shortEntryRules?.blocks.length ?? 0) > 0;
      let autoDetectedPositionType: "LongOnly" | "ShortOnly" | "LongShort" =
        "LongShort";
      if (hasLong && !hasShort) autoDetectedPositionType = "LongOnly";
      if (!hasLong && hasShort) autoDetectedPositionType = "ShortOnly";

      form.reset({
        price: selectedStrategy.marketplaceListing?.price || 10.0,
        category: selectedStrategy.marketplaceListing?.category || "",
        positionType:
          selectedStrategy.marketplaceListing?.positionType ||
          autoDetectedPositionType,
        representativeBacktestId:
          selectedStrategy.marketplaceListing?.representativeBacktestId ||
          undefined,
        termsAccepted: false,
      });
    }
  }, [selectedStrategy, form]);

  // --- 데이터 페칭 ---
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

  const {
    data: strategyDetailData, // 반환된 데이터의 이름을 명확히 지정
    isSuccess, // 성공 상태를 나타내는 boolean
    isFetching,
    refetch: fetchStrategyDetail,
  } = useQuery({
    queryKey: ["strategyDetail", selectedStrategy?.id],
    queryFn: async () => {
      if (!selectedStrategy) return null;
      const res = await apiClient.get(`/strategies/${selectedStrategy.id}`);
      return res.data;
    },
    enabled: false, // onSuccess, onError 옵션 제거
  });

  // isSuccess 상태를 감지하는 useEffect를 상세 데이터가 도착했을 때의 처리 로직으로 변경
  useEffect(() => {
    if (isSuccess && strategyDetailData) {
      // 1. 상세 데이터 상태 업데이트
      setStrategyDetail(strategyDetailData);

      // 2. 폼 기본값 설정 로직
      const { marketplaceListing, backtests } = strategyDetailData;

      // 2-1. 가장 최신 백테스트를 찾습니다. (날짜로 정렬)
      const latestBacktest =
        backtests && backtests.length > 0
          ? [...backtests].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )[0]
          : null;

      // 2-2. 폼 값을 리셋합니다.
      form.reset({
        price: marketplaceListing?.price || 10.0,
        category: marketplaceListing?.category || "",
        positionType: marketplaceListing?.positionType || "LongOnly", // 필요시 자동탐지 로직 추가
        termsAccepted: false,

        // 이미 등록된 상품이면 저장된 값을, 아니라면 가장 최신 백테스트 ID를 기본값으로 설정
        representativeBacktestId:
          marketplaceListing?.representativeBacktestId ||
          latestBacktest?.id ||
          undefined,
      });
    }
  }, [isSuccess, strategyDetailData, form]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const strategies = data?.pages.flat() ?? [];

  // --- 이벤트 핸들러 ---
  const handleOpenListingModal = (strategy: Strategy) => {
    // 1. 기본(요약) 정보를 먼저 설정하여 모달을 빠르게 엽니다.
    setSelectedStrategy(strategy);
    setStrategyDetail(strategy); // UI 깜빡임 방지를 위해 초기값 설정
    setIsListingModalOpen(true);
  };

  // 모달이 열리면 상세 정보 로딩을 트리거합니다.
  useEffect(() => {
    if (isListingModalOpen && selectedStrategy) {
      console.log(
        `[LOG 1] Modal opened. Attempting to fetch details for strategy ID: ${selectedStrategy.id}`
      );
      fetchStrategyDetail();
    }
  }, [isListingModalOpen, selectedStrategy, fetchStrategyDetail]);

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

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* 1. 페이지 헤더: 제목, 뷰 모드, 새 전략 생성 버튼 */}
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

      {/* 2. 필터링 UI */}
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

      {/* 3. 전략 목록 또는 로딩/에러 상태 렌더링 */}
      {renderContent()}

      {/* 4. 무한 스크롤 감지를 위한 하단 영역 */}
      <div ref={ref} className="h-10 mt-8 flex justify-center items-center">
        {isFetchingNextPage && <Spinner />}
        {!hasNextPage && strategies.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("noMoreStrategies")}
          </p>
        )}
      </div>

      {/* 5. 마켓 등록/수정 모달 */}
      <Dialog open={isListingModalOpen} onOpenChange={setIsListingModalOpen}>
        <DialogContent className="max-w-4xl p-0">
          {/* 상세 정보 로딩 중일 때 스피너 표시 */}
          {isFetching ? (
            <div className="flex items-center justify-center h-[600px]">
              <Spinner size="lg" />
            </div>
          ) : (
            // Form Provider가 두 패널을 모두 감싸도록 최상단에 위치
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
                  {strategyDetail && (
                    <StrategyListingPreview
                      strategy={strategyDetail}
                      control={form.control}
                    />
                  )}
                </div>

                {/* 우측: 설정 폼 패널 */}
                <div className="col-span-3 p-8 overflow-y-auto max-h-[90vh]">
                  <DialogHeader className="mb-6">
                    <DialogTitle className="text-2xl font-bold">
                      {selectedStrategy?.marketplaceListing
                        ? t("modalEditTitle")
                        : t("modalRegisterTitle")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("modalDescription", {
                        strategyName: selectedStrategy?.name,
                      })}
                    </DialogDescription>
                  </DialogHeader>
                  {strategyDetail && (
                    <StrategyListingForm
                      onSubmit={form.handleSubmit(handleListingSubmit)}
                      isSubmitting={listStrategyMutation.isPending}
                      strategy={strategyDetail}
                    />
                  )}
                </div>
              </div>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
