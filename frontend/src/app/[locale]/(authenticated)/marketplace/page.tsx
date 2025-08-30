"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ItemShop } from "@/components/domain/marketplace/ItemShop";
import { StrategyMarketplace } from "@/components/domain/marketplace/StrategyMarketplace";
import { Store } from "lucide-react";

export default function MarketplacePage() {
  const t = useTranslations("Marketplace");

  return (
    <AuthGuard>
      <div className="container mx-auto max-w-screen-xl px-4 py-8 md:py-12">
        {/* --- 1. 페이지 헤더 --- */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="p-3 mb-4 bg-primary/10 rounded-full border-2 border-primary/20">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl">
            {t("description")}
          </p>
        </div>

        {/* --- 2. 탭 기반 콘텐츠 영역 --- */}
        <Tabs defaultValue="strategy-market" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="strategy-market">
              {t("strategyMarketTab")}
            </TabsTrigger>
            <TabsTrigger value="item-shop">{t("itemShopTab")}</TabsTrigger>
          </TabsList>

          {/* 2-1. 전략 마켓 탭 */}
          <TabsContent value="strategy-market" className="mt-8">
            <StrategyMarketplace />
          </TabsContent>

          {/* 2-2. 아이템 샵 탭 */}
          <TabsContent value="item-shop" className="mt-8">
            <ItemShop />
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
