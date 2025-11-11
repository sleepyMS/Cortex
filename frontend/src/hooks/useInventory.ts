// file: frontend/src/hooks/useInventory.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions, // [신규] UseMutationOptions import
} from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ShopItemMetadata } from "@/types/marketplace";

// =================================================================
// 1. 타입 정의: 백엔드 API 응답과 100% 일치
// =================================================================

export interface UserInventoryItem {
  productId: string;
  name: string;
  description?: string;
  displayProperties: ShopItemMetadata;
  quantity: number;
  purchasedAt: string;
  instanceId: string; // onUseItem(item.instanceId)에서 사용
  isUsed: boolean; // item.isUsed에서 사용
  type: string;
}

export interface PurchasedStrategy {
  purchaseId: string;
  strategyId: string;
  name: string;
  authorUsername: string;
  pricePaidInCredit: number;
  purchasedAt: string;
}

// =================================================================
// 2. API 호출 함수
// =================================================================

const fetchUserInventory = async (): Promise<UserInventoryItem[]> => {
  const { data } = await apiClient.get("/users/me/inventory");
  return data;
};

const fetchPurchasedStrategies = async (): Promise<PurchasedStrategy[]> => {
  const { data } = await apiClient.get("/users/me/purchased-strategies");
  return data;
};

const useItemApiFn = async (productId: string): Promise<any> => {
  const { data } = await apiClient.post(`/users/me/inventory/${productId}/use`);
  return data;
};

// =================================================================
// 3. 쿼리 훅 (상태 조회)
// =================================================================

const INVENTORY_QUERY_KEY = ["inventory"];

export const useUserInventoryQuery = <TData = UserInventoryItem[]>(
  options?: Omit<
    UseQueryOptions<UserInventoryItem[], Error, TData>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, "items"],
    queryFn: fetchUserInventory,
    ...options,
  });
};

export const usePurchasedStrategiesQuery = <TData = PurchasedStrategy[]>(
  options?: Omit<
    UseQueryOptions<PurchasedStrategy[], Error, TData>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, "strategies"],
    queryFn: fetchPurchasedStrategies,
    ...options,
  });
};

// =================================================================
// 4. 파생 상태 훅 (데이터 가공)
// =================================================================

export const useInventoryStatus = () => {
  const { data: purchasedStrategies, isLoading: isLoadingStrategies } =
    usePurchasedStrategiesQuery();
  const { data: ownedItems, isLoading: isLoadingItems } =
    useUserInventoryQuery();

  const purchasedStrategyIds = useMemo(
    () => new Set(purchasedStrategies?.map((s) => s.strategyId)),
    [purchasedStrategies]
  );
  const ownedItemIds = useMemo(
    () => new Set(ownedItems?.map((i) => i.productId)),
    [ownedItems]
  );

  return {
    purchasedStrategyIds,
    ownedItemIds,
    isLoading: isLoadingStrategies || isLoadingItems,
  };
};

// =================================================================
// 5. 뮤테이션 훅 (상태 변경)
// =================================================================

export const useUseItemMutation = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("Inventory");

  return useMutation({
    mutationFn: useItemApiFn,
    onMutate: async (productId: string) => {
      const queryKey = [...INVENTORY_QUERY_KEY, "items"];
      await queryClient.cancelQueries({ queryKey });
      const previousInventory =
        queryClient.getQueryData<UserInventoryItem[]>(queryKey);

      queryClient.setQueryData<UserInventoryItem[]>(
        queryKey,
        (oldInventory = []) =>
          oldInventory
            .map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity - 1 }
                : item
            )
            .filter((item) => item.quantity > 0)
      );
      return { previousInventory };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(
          [...INVENTORY_QUERY_KEY, "items"],
          context.previousInventory
        );
      }
      toast.error(
        t("useItemError", { error: err.response?.data?.detail || err.message })
      );
    },
    onSuccess: () => {
      toast.success(t("useItemSuccess"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...INVENTORY_QUERY_KEY, "items"],
      });
    },
  });
};
