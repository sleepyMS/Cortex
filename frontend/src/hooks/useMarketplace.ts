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
import { CheckoutData } from "./usePayment"; // usePayment.ts에서 CheckoutData 타입을 가져옵니다.

// =================================================================
// 1. 타입 정의 (Types)
// =================================================================

export interface ProductFilters {
  page: number;
  limit: number;
  productType: "STRATEGY" | "SHOP_ITEM" | "CREDIT_PACK" | "AI_MODEL";
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
 * 마켓플레이스 상품 목록을 서버에서 조회합니다.
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

/**
 * 크레딧을 사용한 상품 구매를 요청합니다.
 */
const creditPurchaseApiFn = async (payload: PurchasePayload): Promise<any> => {
  const { data } = await apiClient.post("/marketplace/orders", payload);
  return data;
};

/**
 * 현금 결제(결제 위젯)를 위한 사전 주문 정보를 생성하고 요청합니다.
 */
const cashCheckoutApiFn = async (
  payload: PurchasePayload
): Promise<CheckoutData> => {
  const { data } = await apiClient.post("/marketplace/checkout/cash", payload);
  return data;
};

// =================================================================
// 3. 커스텀 훅 (Custom Hooks)
// =================================================================

/**
 * 마켓플레이스 상품 목록을 조회하는 React Query 훅입니다.
 */
export const useProducts = (filters: ProductFilters) => {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => fetchProducts(filters),
    placeholderData: keepPreviousData,
  });
};

/**
 * 크레딧을 사용하여 상품을 구매하는 React Query 뮤테이션 훅입니다.
 */
export const useCreditPurchaseMutation = (
  options?: Omit<
    UseMutationOptions<any, Error, PurchasePayload, any>,
    "mutationFn"
  >
) => {
  const t = useTranslations("Marketplace");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: creditPurchaseApiFn,
    onSuccess: (data, variables, context) => {
      // 구매 성공 시, 사용자의 인벤토리 및 프로필 관련 캐시를 무효화합니다.
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });

      // page.tsx 등에서 전달한 onSuccess 콜백이 있다면 실행합니다.
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
 * 현금 결제(결제 위젯)를 시작하기 위해 백엔드에 주문 생성을 요청하는
 * React Query 뮤테이션 훅입니다.
 */
export const useCashCheckoutMutation = (
  options?: Omit<
    UseMutationOptions<CheckoutData, Error, PurchasePayload, any>,
    "mutationFn"
  >
) => {
  const t = useTranslations("Marketplace");

  return useMutation({
    mutationFn: cashCheckoutApiFn,
    onSuccess: (checkoutData, variables, context) => {
      // [역할 변경]
      // 이 훅은 더 이상 직접 결제를 시도하지 않습니다.
      // 성공적으로 백엔드로부터 checkoutData를 받아오면,
      // page.tsx에 정의된 onSuccess 콜백으로 데이터를 전달하는 역할만 수행합니다.
      if (options?.onSuccess) {
        options.onSuccess(checkoutData, variables, context);
      }
    },
    onError: (err: any, variables, context) => {
      // API 호출 실패 시 에러 토스트를 표시합니다.
      toast.error(
        t("orderCreationError", {
          // 에러 메시지 키를 더 명확하게 변경
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
