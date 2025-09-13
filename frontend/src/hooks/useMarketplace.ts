// file: frontend/src/hooks/useMarketplace.ts
"use client";

import {
  useQuery,
  keepPreviousData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import {
  ShopItem,
  MarketplaceStrategy,
  PaginatedProductsResponse,
} from "@/types/marketplace";
import { usePaymentMutation } from "./usePayment";

// =================================================================
// 1. 타입 정의 (Types)
// =================================================================

export interface ProductFilters {
  page: number;
  limit: number;
  productType: "STRATEGY" | "SHOP_ITEM";
  sortBy?: string;
  searchTerm?: string;
  categories?: string[];
  positionTypes?: ("LongOnly" | "ShortOnly" | "LongShort")[];
}

export interface PurchasePayload {
  items: {
    productId: string;
    quantity: number;
  }[];
}

// =================================================================
// 2. API 호출 함수 (API Functions)
// =================================================================

const fetchProducts = async (
  filters: ProductFilters
): Promise<PaginatedProductsResponse> => {
  const params = new URLSearchParams({
    page: filters.page.toString(),
    limit: filters.limit.toString(),
    productType: filters.productType,
  });

  if (filters.sortBy) params.append("sortBy", filters.sortBy);
  if (filters.searchTerm) params.append("searchTerm", filters.searchTerm);
  filters.categories?.forEach((cat) => params.append("categories", cat));
  filters.positionTypes?.forEach((pt) => params.append("positionTypes", pt));

  const { data } = await apiClient.get(
    `/marketplace/products?${params.toString()}`
  );
  return data;
};

const purchaseApiFn = async (payload: PurchasePayload): Promise<any> => {
  const { data } = await apiClient.post("/marketplace/orders", payload);
  return data;
};

// =================================================================
// 3. 커스텀 훅 (Custom Hooks)
// =================================================================

// --- Query Hooks ---

/**
 * 마켓플레이스의 상품 목록을 필터링 및 페이지네이션하여 조회하는 훅
 */
export const useProducts = (filters: ProductFilters) => {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
    placeholderData: keepPreviousData,
  });
};

// --- Mutation Hooks ---

/**
 * 마켓플레이스 상품을 구매하는 뮤테이션 훅
 */
export const usePurchaseMutation = () => {
  const t = useTranslations("Marketplace");
  const queryClient = useQueryClient();
  const paymentMutation = usePaymentMutation();

  return useMutation({
    mutationFn: purchaseApiFn,
    onSuccess: (checkoutData) => {
      paymentMutation.mutate(checkoutData);
      queryClient.invalidateQueries({ queryKey: ["userInventory"] });
      queryClient.invalidateQueries({ queryKey: ["purchasedStrategies"] });
    },
    onError: (err: any) => {
      toast.error(
        t("purchaseError", {
          error: err.response?.data?.detail || err.message,
        })
      );
    },
  });
};
