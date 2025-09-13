"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Search, Inbox } from "lucide-react";

// [개선] 단일 책임 훅을 import 합니다.
import { useUserInventoryQuery, UserInventoryItem } from "@/hooks/useInventory";
import { useUseItemMutation } from "@/hooks/useInventoryMutations";

// UI 컴포넌트 import
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { InventoryItemCard } from "./InventoryItemCard";

// [개선] 아이템 타입을 명확한 타입으로 관리하여 안정성 향상
type ItemFilterType = "ALL" | UserInventoryItem["type"];
const ITEM_TYPES: ItemFilterType[] = [
  "ALL",
  "OPTIMIZATION_COUPON",
  "BACKTEST_CREDIT",
];

export function InventoryItemsView() {
  const t = useTranslations("Inventory");

  // 상태 관리: 활성 탭, 검색어
  const [activeTab, setActiveTab] = useState<ItemFilterType>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // 데이터 로직: 개선된 단일 훅을 사용하여 인벤토리 상세 정보 조회
  const {
    data: inventory,
    isLoading,
    isError,
    error,
    refetch,
  } = useUserInventoryQuery();
  const useItemMutation = useUseItemMutation();

  // 필터링 로직: useMemo를 사용하여 성능 최적화
  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter((item) => {
      const matchesTab = activeTab === "ALL" || item.type === activeTab;
      const matchesSearch = item.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [inventory, activeTab, searchTerm]);

  if (isLoading) return <InventorySkeleton />;

  if (isError) {
    return (
      <Alert variant="destructive" className="mt-8 max-w-lg mx-auto">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t("loadErrorTitle")}</AlertTitle>
        <AlertDescription>{error?.message}</AlertDescription>
        <Button onClick={() => refetch()} className="mt-4">
          {t("retryButton")}
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ItemFilterType)}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
            {ITEM_TYPES.map((type) => (
              <TabsTrigger key={type} value={type}>
                {t(`tabs.${type}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              className="pl-10 w-full md:w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-6">
          {filteredInventory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredInventory.map((item) => (
                <InventoryItemCard
                  key={item.instanceId}
                  item={item}
                  onUseItem={useItemMutation.mutate}
                  isUsing={
                    useItemMutation.isPending &&
                    useItemMutation.variables === item.instanceId
                  }
                />
              ))}
            </div>
          ) : searchTerm ? (
            // [개선] 검색 결과가 없을 때의 UI
            <div className="text-center py-20 bg-muted/50 rounded-lg flex flex-col items-center">
              <Search className="h-16 w-16 text-muted-foreground" />
              <h3 className="text-xl font-semibold mt-4">
                {t("noResultsTitle")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("noResultsDescription", { searchTerm })}
              </p>
            </div>
          ) : (
            // [기존] 인벤토리가 아예 비어있을 때의 UI
            <div className="text-center py-20 bg-muted/50 rounded-lg flex flex-col items-center">
              <Inbox className="h-16 w-16 text-muted-foreground" />
              <h3 className="text-xl font-semibold mt-4">{t("emptyTitle")}</h3>
              <p className="text-muted-foreground mt-2">
                {t("emptyDescription")}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 스켈레톤 UI 컴포넌트
const InventorySkeleton = () => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      <Skeleton className="h-10 w-1/3" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  </div>
);
