// file: frontend/src/hooks/useInventory.ts
"use client";

import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { LucideIconName } from "@/lib/iconMap"; // [개선] LucideIconName import

// --- [개선] 타입 정의: 백엔드 스키마와 UI 요구사항을 모두 반영하여 상세화 ---

export interface UserInventoryItem {
  instanceId: string;
  itemId: string; // ShopItem의 원본 ID
  name: string;
  description: string;
  // [추가] 필터링에 사용되는 아이템의 원본 타입
  type: "OPTIMIZATION_COUPON" | "BACKTEST_CREDIT" | "COSMETIC_ITEM";
  displayProperties: {
    icon: LucideIconName; // [개선] string 대신 구체적인 IconName 타입 사용
    tier?: "BRONZE" | "SILVER" | "GOLD";
    stats: {
      label: string;
      value: string;
    }[];
  };
  quantity: number;
  purchasedAt: string;
  isUsed: boolean;
  usedAt?: string | null;
}

export interface PurchasedStrategy {
  purchaseId: string;
  strategyId: string;
  name: string;
  authorUsername: string;
  pricePaid: number;
  purchasedAt: string;
}

// --- API 호출 함수 (변경 없음) ---

const fetchUserInventory = async (): Promise<UserInventoryItem[]> => {
  const { data } = await apiClient.get("/users/me/inventory");
  return data;
};

const fetchPurchasedStrategies = async (): Promise<PurchasedStrategy[]> => {
  const { data } = await apiClient.get("/users/me/purchased-strategies");
  return data;
};

// --- [핵심 개선] 커스텀 훅 통합 ---

// useQuery의 옵션을 그대로 받을 수 있도록 타입을 정의합니다.
type UserInventoryQueryOptions = Omit<
  UseQueryOptions<UserInventoryItem[]>,
  "queryKey" | "queryFn"
>;

/**
 * [통합] 사용자의 전체 인벤토리 상세 목록을 조회하는 단일 훅입니다.
 * select 옵션을 통해 ID 목록만 가져오는 등의 파생 데이터 조회가 가능합니다.
 */
export const useUserInventoryQuery = <TData = UserInventoryItem[]>(
  options?: Omit<
    UseQueryOptions<UserInventoryItem[], Error, TData>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["userInventory"],
    queryFn: fetchUserInventory,
    ...options,
  });
};

type PurchasedStrategiesQueryOptions = Omit<
  UseQueryOptions<PurchasedStrategy[]>,
  "queryKey" | "queryFn"
>;

/**
 * [통합] 사용자가 구매한 전체 전략 상세 목록을 조회하는 단일 훅입니다.
 */
export const usePurchasedStrategiesQuery = <TData = PurchasedStrategy[]>(
  options?: Omit<
    UseQueryOptions<PurchasedStrategy[], Error, TData>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: ["purchasedStrategies"],
    queryFn: fetchPurchasedStrategies,
    ...options,
  });
};
