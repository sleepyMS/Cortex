// file: frontend/src/app/[locale]/settings/inventory/page.tsx
"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Search, Inbox } from "lucide-react";
import { UserInventoryItem } from "@/hooks/useInventory";

// 데이터 및 액션 훅 import
import { useUserInventoryDetails } from "@/hooks/useInventory";
import { useUseItemMutation } from "@/hooks/useInventoryMutations"; // 아이템 사용을 위한 신규 훅

// UI 컴포넌트 import
import { Input } from "@/components/ui/Input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { InventoryItemCard } from "@/components/domain/inventory/InventoryItemCard";
import { Button } from "@/components/ui/Button";

// 인벤토리 아이템 타입 필터
const ITEM_TYPES = ["ALL", "OPTIMIZATION_COUPON", "BACKTEST_CREDIT"];

export default function InventoryPage() {
  const t = useTranslations("Inventory");

  // 상태 관리: 활성 탭, 검색어
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // 데이터 로직: 훅을 사용하여 인벤토리 상세 정보 조회 및 아이템 사용 뮤테이션
  const {
    data: inventory,
    isLoading,
    isError,
    error,
    refetch,
  } = useUserInventoryDetails();
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

  // 로딩 상태 UI
  if (isLoading) {
    return <InventorySkeleton />;
  }

  // 에러 상태 UI
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

  // 메인 렌더링
  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted-foreground mt-2">{t("pageDescription")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* 탭 메뉴 */}
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
          {ITEM_TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {t(`tabs.${type}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 검색창 */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            className="pl-10 w-full md:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 탭별 콘텐츠 */}
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
          ) : (
            // 아이템이 없을 때 UI
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
  <div className="container mx-auto max-w-screen-xl px-4 py-8 space-y-8">
    <Skeleton className="h-12 w-1/3" />
    <Skeleton className="h-8 w-2/3" />
    <div className="flex gap-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
    <Skeleton className="h-10 w-1/3" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full" />
      ))}
    </div>
  </div>
);
