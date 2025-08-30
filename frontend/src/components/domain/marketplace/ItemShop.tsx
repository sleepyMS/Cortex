"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import apiClient from "@/lib/apiClient";
import { ShopItem } from "@/types/marketplace";
import { ShopItemCard } from "./ShopItemCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import { usePurchaseMutation } from "@/hooks/usePurchase"; // 훅 import

// API 함수 정의
const fetchShopItems = async (): Promise<ShopItem[]> => {
  const { data } = await apiClient.get("/marketplace/items");
  return data;
};

export const ItemShop = () => {
  const t = useTranslations("Marketplace");

  // --- 데이터 조회 (useQuery) ---
  const {
    data: items,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ShopItem[]>({
    queryKey: ["shopItems"],
    queryFn: fetchShopItems,
  });

  const purchaseMutation = usePurchaseMutation();

  // --- 렌더링 로직 ---
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items?.map((item) => (
        <ShopItemCard
          key={item.id}
          item={item}
          onPurchase={() =>
            purchaseMutation.mutate({ type: "item", id: item.id })
          }
          isPurchasing={
            purchaseMutation.isPending &&
            purchaseMutation.variables?.id === item.id
          }
        />
      ))}
    </div>
  );
};
