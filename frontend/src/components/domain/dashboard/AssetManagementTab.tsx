"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
// InventoryPage의 내용을 여기에 통합 (가상의 컴포넌트로 표현)
import { InventoryItemsView } from "@/components/domain/inventory/InventoryItemsView";
// 구매한 전략을 보여줄 신규 컴포넌트 (가상의 컴포넌트로 표현)
import { PurchasedStrategiesView } from "@/components/domain/inventory/PurchasedStrategiesView";

export function AssetManagementTab() {
  const t = useTranslations("Dashboard.assets");

  return (
    <Tabs defaultValue="items">
      <TabsList>
        <TabsTrigger value="items">{t("itemsTab")}</TabsTrigger>
        <TabsTrigger value="strategies">{t("strategiesTab")}</TabsTrigger>
      </TabsList>
      <TabsContent value="items" className="mt-4">
        {/* 기존 InventoryPage.tsx의 UI/로직이 이 컴포넌트에 포함됩니다. */}
        <InventoryItemsView />
      </TabsContent>
      <TabsContent value="strategies" className="mt-4">
        {/* 구매한 전략 목록을 보여주는 UI가 여기에 들어갑니다. */}
        <PurchasedStrategiesView />
      </TabsContent>
    </Tabs>
  );
}
