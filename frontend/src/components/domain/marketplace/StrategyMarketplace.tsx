// file: frontend/src/components/domain/marketplace/StrategyMarketplace.tsx
"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Search, ListFilter, AlertTriangle, Inbox } from "lucide-react";
import { MarketplaceStrategy } from "@/types/marketplace";

// 1. 중앙화된 커스텀 훅과 신규 훅 import
import {
  useMarketplaceStrategies,
  usePurchaseMutation,
} from "@/hooks/useMarketplace";
import { usePurchasedStrategies } from "@/hooks/useInventory";

// 2. UI 컴포넌트 import
import { StrategyMarketCard } from "./StrategyMarketCard";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";

export const StrategyMarketplace = () => {
  const t = useTranslations("Marketplace");

  // 3. 필터링 및 페이지네이션 상태 관리
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt_desc"); // API와 연동될 정렬 키

  // 4. 모달 상태 및 선택된 전략 정보 관리
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedStrategy, setSelectedStrategy] =
    useState<MarketplaceStrategy | null>(null);

  // 5. 데이터 로직: 중앙화된 훅 사용 (무한 쿼리 버전)
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isError,
    isLoading,
    refetch,
  } = useMarketplaceStrategies({ searchTerm, sortBy }); // 필터 상태를 훅에 전달

  const { data: purchasedStrategyIds = [], isLoading: isLoadingInventory } =
    usePurchasedStrategies();
  const purchaseMutation = usePurchaseMutation();

  // 6. 이벤트 핸들러: 구매 버튼 클릭 시 모달 열기
  const handlePurchaseClick = (strategy: MarketplaceStrategy) => {
    setSelectedStrategy(strategy);
    setIsConfirmModalOpen(true);
  };

  // 7. 이벤트 핸들러: 모달에서 최종 구매 확정
  const handleConfirmPurchase = () => {
    if (selectedStrategy) {
      purchaseMutation.mutate(
        { type: "strategy", id: selectedStrategy.id },
        {
          onSuccess: () => {
            setIsConfirmModalOpen(false);
            setSelectedStrategy(null);
          },
        }
      );
    }
  };

  // 8. 렌더링할 데이터 가공 (useInfiniteQuery 결과 평탄화)
  const strategies = useMemo(
    () => data?.pages.flatMap((page) => page.strategies) ?? [],
    [data]
  );

  // --- 렌더링 로직 ---

  // 초기 로딩 상태
  if (isLoading || isLoadingInventory) {
    return (
      <>
        <FilterControlsSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      </>
    );
  }

  // 에러 상태
  if (isError) {
    return (
      <Alert variant="destructive" className="mt-8 max-w-lg mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("loadError")}</AlertTitle>
        <AlertDescription>
          {error?.message || "전략 목록을 불러오는 데 실패했습니다."}
        </AlertDescription>
        <Button onClick={() => refetch()} className="mt-4">
          {t("retryButton")}
        </Button>
      </Alert>
    );
  }

  // 메인 렌더링
  return (
    <>
      {/* 필터 및 정렬 컨트롤 */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={isFetching}
          />
        </div>
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={sortBy}
            onValueChange={setSortBy}
            disabled={isFetching}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t("sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc">{t("sort.newest")}</SelectItem>
              <SelectItem value="totalReturnPct_desc">
                {t("sort.highestReturn")}
              </SelectItem>
              <SelectItem value="mddPct_asc">{t("sort.lowestMdd")}</SelectItem>
              <SelectItem value="price_asc">{t("sort.priceAsc")}</SelectItem>
              <SelectItem value="price_desc">{t("sort.priceDesc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 전략 카드 그리드 */}
      {strategies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {strategies.map((strategy) => (
            <StrategyMarketCard
              key={strategy.id}
              strategy={strategy}
              isOwned={purchasedStrategyIds.includes(strategy.id)}
              onPurchase={() => handlePurchaseClick(strategy)}
              isPurchasing={
                purchaseMutation.isPending &&
                purchaseMutation.variables?.id === strategy.id
              }
            />
          ))}
        </div>
      ) : (
        // 데이터가 없을 때
        <div className="text-center py-20 bg-muted/50 rounded-lg flex flex-col items-center">
          <Inbox className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-xl font-semibold mt-4">{t("emptyTitle")}</h3>
          <p className="text-muted-foreground mt-2">{t("emptyDescription")}</p>
        </div>
      )}

      {/* '더 보기' 버튼 */}
      {hasNextPage && (
        <div className="mt-10 text-center">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            size="lg"
          >
            {isFetchingNextPage ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {t("loadMoreButton")}
          </Button>
        </div>
      )}

      {/* 구매 확인 모달 */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("purchaseConfirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("purchaseConfirmDescriptionStrategy", {
                strategyName: selectedStrategy?.name,
                price: selectedStrategy?.price.toFixed(2),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button variant="outline">{t("cancelButton")}</Button>
            </DialogClose>
            <Button
              onClick={handleConfirmPurchase}
              disabled={purchaseMutation.isPending}
            >
              {purchaseMutation.isPending && (
                <Spinner className="mr-2 h-4 w-4" />
              )}
              {t("confirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// 필터 컨트롤 영역의 스켈레톤 UI
const FilterControlsSkeleton = () => (
  <div className="flex flex-col md:flex-row gap-4 mb-8">
    <Skeleton className="h-10 flex-grow" />
    <Skeleton className="h-10 w-full md:w-[180px]" />
  </div>
);
