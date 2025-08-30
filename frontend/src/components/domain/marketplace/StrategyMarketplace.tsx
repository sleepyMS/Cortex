"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Search, ListFilter, AlertTriangle } from "lucide-react";

import apiClient from "@/lib/apiClient";
import { MarketplaceStrategy } from "@/types/marketplace";
import { StrategyMarketCard } from "./StrategyMarketCard";
import { usePurchaseMutation } from "@/hooks/usePurchase"; // [핵심] 구매 훅 import

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

// API 함수 정의
const fetchMarketplaceStrategies = async (): Promise<MarketplaceStrategy[]> => {
  const { data } = await apiClient.get("/marketplace/strategies");
  return data;
};

export const StrategyMarketplace = () => {
  const t = useTranslations("Marketplace");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const {
    data: strategies,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<MarketplaceStrategy[]>({
    queryKey: ["marketplaceStrategies"],
    queryFn: fetchMarketplaceStrategies,
  });

  const purchaseMutation = usePurchaseMutation();

  // 클라이언트 사이드 필터링 및 정렬 로직
  const filteredAndSortedStrategies = useMemo(() => {
    if (!strategies) return [];

    let processed = [...strategies];

    // 1. 검색어 필터링
    if (searchTerm) {
      processed = processed.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.author.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. 정렬
    switch (sortBy) {
      case "highestReturn":
        processed.sort(
          (a, b) =>
            b.summaryMetrics.totalReturnPct - a.summaryMetrics.totalReturnPct
        );
        break;
      case "lowestMdd":
        processed.sort(
          (a, b) => a.summaryMetrics.mddPct - b.summaryMetrics.mddPct
        );
        break;
      case "newest":
      default:
        // 'createdAt' 필드가 API 응답에 포함되어야 정확한 정렬이 가능합니다.
        // 여기서는 임시로 id를 사용합니다.
        processed.sort((a, b) => b.id.localeCompare(a.id));
        break;
    }

    return processed;
  }, [strategies, searchTerm, sortBy]);

  // --- 렌더링 로직 ---

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive" className="mt-8 max-w-lg mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("loadError")}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
        <Button onClick={() => refetch()} className="mt-4">
          재시도
        </Button>
      </Alert>
    );
  }

  return (
    <div>
      {/* 필터 및 정렬 컨트롤 */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder={t("sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("sort.newest")}</SelectItem>
              <SelectItem value="highestReturn">
                {t("sort.highestReturn")}
              </SelectItem>
              <SelectItem value="lowestMdd">{t("sort.lowestMdd")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 전략 카드 그리드 */}
      {filteredAndSortedStrategies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedStrategies.map((strategy) => (
            <StrategyMarketCard
              key={strategy.id}
              strategy={strategy}
              // ▼▼▼ [핵심] 구매 훅의 mutate 함수를 'strategy' 타입으로 호출하여 onPurchase에 연결 ▼▼▼
              onPurchase={() =>
                purchaseMutation.mutate({ type: "strategy", id: strategy.id })
              }
              // [핵심] 현재 구매 중인 '바로 그' 전략 카드에만 로딩 상태를 전달
              isPurchasing={
                purchaseMutation.isPending &&
                purchaseMutation.variables?.id === strategy.id
              }
              // ▲▲▲ [완료] ▲▲▲
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/50 rounded-lg">
          <h3 className="text-xl font-semibold">{t("emptyTitle")}</h3>
          <p className="text-muted-foreground mt-2">{t("emptyDescription")}</p>
        </div>
      )}
    </div>
  );
};
