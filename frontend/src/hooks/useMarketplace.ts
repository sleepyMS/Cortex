// file: frontend/src/hooks/useMarketplace.ts
"use client";

import {
  useQuery,
  keepPreviousData,
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { PaginatedProductsResponse } from "@/types/marketplace";
import { usePaymentMutation } from "./usePayment";

// =================================================================
// 1. 타입 정의 (Types)
// =================================================================

export interface ProductFilters {
  page: number;
  limit: number;
  productType: "STRATEGY" | "SHOP_ITEM" | "CREDIT_PACK";
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

/**
 * 마켓플레이스 상품 목록을 API로부터 가져오는 함수
 */
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

/** 크레딧으로 즉시 구매하는 API 함수 */
const creditPurchaseApiFn = async (payload: PurchasePayload): Promise<any> => {
  const { data } = await apiClient.post("/marketplace/orders", payload);
  return data;
};

/** 현금 결제를 준비하는 API 함수 */
const cashCheckoutApiFn = async (payload: PurchasePayload): Promise<any> => {
  const { data } = await apiClient.post("/marketplace/checkout/cash", payload);
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
 * 크레딧을 사용하여 상품을 즉시 구매하는 뮤테이션 훅
 */
export const useCreditPurchaseMutation = (
  options?: Omit<
    UseMutationOptions<any, any, PurchasePayload, any>,
    "mutationFn"
  >
) => {
  const t = useTranslations("Marketplace");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: creditPurchaseApiFn,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["userInventory"] });
      queryClient.invalidateQueries({ queryKey: ["purchasedStrategies"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });

      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (err: any, variables, context) => {
      toast.error(
        t("purchaseError", {
          error: err.response?.data?.detail || err.message,
        })
      );
      if (options?.onError) {
        options.onError(err, variables, context);
      }
    },
    ...options,
  });
};

/**
 * 현금으로 크레딧 팩 구매를 시작하는 뮤테이션 훅
 */
export const useCashCheckoutMutation = (
  options?: Omit<
    UseMutationOptions<any, any, PurchasePayload, any>,
    "mutationFn"
  >
) => {
  const t = useTranslations("Marketplace");
  const paymentMutation = usePaymentMutation();

  return useMutation({
    mutationFn: cashCheckoutApiFn,
    onSuccess: (checkoutData, variables, context) => {
      paymentMutation.mutate(checkoutData);

      if (options?.onSuccess) {
        options.onSuccess(checkoutData, variables, context);
      }
    },
    onError: (err: any, variables, context) => {
      toast.error(
        t("paymentError", {
          error: err.response?.data?.detail || err.message,
        })
      );
      if (options?.onError) {
        options.onError(err, variables, context);
      }
    },
    ...options,
  });
};
