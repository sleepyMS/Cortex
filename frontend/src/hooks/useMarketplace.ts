// file: frontend/src/hooks/useMarketplace.ts
"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { useRouter } from "@/i18n/navigation";
import { ShopItem, MarketplaceStrategy } from "@/types/marketplace";

// --- 타입 정의 ---

/**
 * 상품 목록 조회를 위한 필터 및 페이지네이션 파라미터 타입
 * 이 객체가 변경되면 useProducts 훅이 자동으로 데이터를 다시 가져옵니다.
 */
export interface ProductFilters {
  page: number;
  limit: number;
  productType: "STRATEGY" | "SHOP_ITEM";
  sortBy?: string;
  searchTerm?: string;
  categories?: string[];
  positionTypes?: ("LongOnly" | "ShortOnly" | "LongShort")[];
}

/**
 * 페이지네이션된 상품 목록 API의 응답 타입
 */
export interface PaginatedProductsResponse {
  products: (MarketplaceStrategy | ShopItem)[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

/**
 * 통합 구매 요청을 위한 데이터 타입
 * 장바구니 기능을 고려하여 배열 형태로 설계합니다.
 */
export interface PurchasePayload {
  items: {
    productId: string;
    quantity: number;
  }[];
}

// --- API 호출 함수 ---

/**
 * [통합] 필터링된 상품 목록을 서버에서 가져옵니다.
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
 * [통합] 상품 구매(주문 생성)를 요청하는 API를 호출합니다.
 */
const purchaseApiFn = async (payload: PurchasePayload): Promise<any> => {
  // 백엔드의 통합 결제 요청 엔드포인트 호출
  const { data } = await apiClient.post("/marketplace/orders", payload);
  return data; // 백엔드는 Toss Payments 연동에 필요한 정보를 반환
};

// --- 커스텀 훅 ---

/**
 * [완성] 마켓플레이스의 모든 상품(전략, 아이템)을 필터링 및 페이지네이션하여 조회하는 훅
 * @param filters - 상품 조회를 위한 필터 조건
 */
export const useProducts = (filters: ProductFilters) => {
  return useQuery({
    queryKey: ["products", filters], // 필터 객체 전체를 queryKey에 포함시켜, 변경 시 자동 재조회
    queryFn: () => fetchProducts(filters),
    keepPreviousData: true, // 페이지 이동 시 UX 향상을 위해 이전 데이터 유지
  });
};

/**
 * [완성] 마켓플레이스 상품을 구매하는 뮤테이션 훅
 */
export const usePurchaseMutation = () => {
  const t = useTranslations("Marketplace");
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: purchaseApiFn,
    onSuccess: (data, variables) => {
      // 결제 성공 후의 로직은 실제 결제(Toss Payments) 연동 시
      // useSubscription.ts 처럼 SDK를 호출하는 방식으로 구체화됩니다.
      // 여기서는 성공 후 데이터 갱신에 집중합니다.

      toast.success(t("purchaseRequestSuccess"));

      // 구매와 관련된 모든 데이터를 최신 상태로 갱신
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["userInventory"] });
      queryClient.invalidateQueries({ queryKey: ["userInventoryDetails"] });
      queryClient.invalidateQueries({ queryKey: ["purchasedStrategies"] });
      queryClient.invalidateQueries({
        queryKey: ["purchasedStrategiesDetails"],
      });
      queryClient.invalidateQueries({ queryKey: ["user", "me"] });
      queryClient.invalidateQueries({ queryKey: ["userBalance"] });
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
