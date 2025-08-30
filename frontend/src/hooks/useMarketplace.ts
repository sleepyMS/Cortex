// file: frontend/src/hooks/useMarketplace.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { useRouter } from "@/i18n/navigation";
import { ShopItem, MarketplaceStrategy } from "@/types/marketplace";

// --- 타입 정의 ---

// 구매 요청을 위한 타입
interface PurchaseInput {
  type: "item" | "strategy";
  id: string;
}

// --- API 호출 함수 ---

// 1. 상점 아이템 목록 조회 API
const fetchShopItems = async (): Promise<ShopItem[]> => {
  const { data } = await apiClient.get("/marketplace/items");
  return data;
};

// 2. 마켓플레이스 전략 목록 조회 API
const fetchMarketplaceStrategies = async (): Promise<MarketplaceStrategy[]> => {
  const { data } = await apiClient.get("/marketplace/strategies");
  return data;
};

// 3. 구매 요청 API
const purchaseApiFn = async ({ type, id }: PurchaseInput): Promise<any> => {
  // 단일 엔드포인트로 통합하는 것을 권장하나, 기존 로직을 유지
  const endpoint =
    type === "item"
      ? "/marketplace/purchase" // 아이템 구매
      : `/marketplace/strategies/${id}/purchase`; // 전략 구매

  const payload = type === "item" ? { itemId: id } : {};
  const { data } = await apiClient.post(endpoint, payload);
  return data;
};

// --- 커스텀 훅 ---

/**
 * 상점에서 판매하는 모든 아이템 목록을 조회하는 훅입니다.
 */
export const useShopItems = () => {
  return useQuery<ShopItem[]>({
    queryKey: ["shopItems"],
    queryFn: fetchShopItems,
  });
};

/**
 * 마켓플레이스에 등록된 모든 판매용 전략 목록을 조회하는 훅입니다.
 * TODO: 향후 페이지네이션, 필터링, 정렬을 위한 인자(filters)를 추가해야 합니다.
 */
export const useMarketplaceStrategies = (/* filters?: any */) => {
  return useQuery<MarketplaceStrategy[]>({
    queryKey: ["marketplaceStrategies" /*, filters */],
    queryFn: fetchMarketplaceStrategies,
  });
};

/**
 * 마켓플레이스에서 아이템 또는 전략을 구매하는 뮤테이션 훅입니다.
 * 성공/실패 시 사용자 피드백 및 관련 데이터 갱신을 자동으로 처리합니다.
 */
export const usePurchaseMutation = () => {
  const t = useTranslations("Marketplace");
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: purchaseApiFn,
    onSuccess: (data, variables) => {
      const { type } = variables;

      if (type === "item") {
        toast.success(t("purchaseSuccessItem"), {
          description: "내 인벤토리에서 구매한 아이템을 확인하세요.",
          action: {
            label: "인벤토리로 이동",
            onClick: () => router.push("/settings/inventory"),
          },
        });
        // 사용자의 인벤토리(보유 아이템) 관련 쿼리를 무효화하여 새로고침
        queryClient.invalidateQueries({ queryKey: ["userInventory"] });
      } else if (type === "strategy") {
        toast.success(t("purchaseSuccessStrategy"), {
          description:
            "이제 나의 전략 목록에서 구매한 전략을 사용할 수 있습니다.",
          action: {
            label: "나의 전략으로 이동",
            onClick: () => router.push("/strategies"),
          },
        });
        // 사용자의 전략 목록 관련 쿼리를 무효화하여 새로고침
        queryClient.invalidateQueries({ queryKey: ["userStrategies"] });
      }

      // 공통적으로 사용자 정보(예: ShopItem 보유 크레딧)를 갱신
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
