// file: frontend/src/hooks/useInventory.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { ShopItem } from "@/types/marketplace"; // ShopItem의 displayProperties를 재사용

// --- 타입 정의 (상세화) ---

/**
 * 사용자가 보유한 단일 아이템의 상세 정보입니다. (GET /users/me/inventory 응답)
 * 아이템의 원본 정보 일부를 포함하여 UI 렌더링을 최적화합니다.
 */
export interface UserInventoryItem {
  /** 인벤토리에 저장된 아이템의 고유 ID (기본 키) */
  instanceId: string;
  /** 상점 아이템의 원본 ID (외래 키) */
  itemId: string;
  /** 아이템 이름 (빠른 표시를 위해 denormalize) */
  name: string;
  /** 아이템 설명 (빠른 표시를 위해 denormalize) */
  description: string;
  /** 아이템 아이콘, 등급 등 UI 렌더링 속성 (빠른 표시를 위해 denormalize) */
  displayProperties: ShopItem["displayProperties"];
  /** 보유 수량 (중첩 가능한 아이템의 경우) */
  quantity: number;
  /** 구매 일시 */
  purchasedAt: string; // ISO 8601 형식의 날짜 문자열 (e.g., "2025-08-30T14:47:23Z")
  /** 사용 여부 (쿠폰 등 1회성 아이템의 경우) */
  isUsed: boolean;
  /** 사용 일시 (사용한 경우) */
  usedAt?: string | null;
}

/**
 * 사용자가 구매한 단일 전략의 상세 정보입니다. (GET /users/me/purchased-strategies 응답)
 */
interface PurchasedStrategy {
  /** 구매 기록의 고유 ID (기본 키) */
  purchaseId: string;
  /** 마켓플레이스에 등록된 전략의 원본 ID (외래 키) */
  strategyId: string;
  /** 전략 이름 (빠른 표시를 위해 denormalize) */
  name: string;
  /** 전략 판매자 이름 (빠른 표시를 위해 denormalize) */
  authorUsername: string;
  /** 구매 당시 지불한 가격 */
  pricePaid: number;
  /** 구매 일시 */
  purchasedAt: string; // ISO 8601 형식의 날짜 문자열
}

// --- API 호출 함수 ---

/** 사용자가 보유한 아이템 목록을 서버에서 가져옵니다. */
const fetchUserInventory = async (): Promise<UserInventoryItem[]> => {
  const { data } = await apiClient.get("/users/me/inventory");
  return data;
};

/** 사용자가 구매한 전략 목록을 서버에서 가져옵니다. */
const fetchPurchasedStrategies = async (): Promise<PurchasedStrategy[]> => {
  const { data } = await apiClient.get("/users/me/purchased-strategies");
  return data;
};

// --- 커스텀 훅 ---

/**
 * 현재 로그인한 사용자가 보유한 모든 아이템의 ID 목록을 조회하는 훅입니다.
 * UI에서 보유 여부를 간단히 확인하기 위해 ID 배열만 반환하도록 최적화되었습니다.
 * @returns {string[]} 보유한 아이템 ID의 배열
 */
export const useUserInventory = () => {
  return useQuery({
    queryKey: ["userInventory"],
    queryFn: fetchUserInventory,
    // API로부터 받은 전체 데이터 중 'itemId' 목록만 선택하여 반환합니다.
    // 이를 통해 데이터가 변경되어도 ID 목록이 같으면 리렌더링이 발생하지 않습니다.
    select: (data: UserInventoryItem[]) => data.map((item) => item.itemId),
  });
};

/**
 * 현재 로그인한 사용자가 구매한 모든 전략의 ID 목록을 조회하는 훅입니다.
 * UI에서 보유 여부를 간단히 확인하기 위해 ID 배열만 반환하도록 최적화되었습니다.
 * @returns {string[]} 구매한 전략 ID의 배열
 */
export const usePurchasedStrategies = () => {
  return useQuery({
    queryKey: ["purchasedStrategies"],
    queryFn: fetchPurchasedStrategies,
    // API로부터 받은 전체 데이터 중 'strategyId' 목록만 선택하여 반환합니다.
    select: (data: PurchasedStrategy[]) =>
      data.map((strategy) => strategy.strategyId),
  });
};

/**
 * (신규) 사용자의 전체 인벤토리 상세 목록을 조회하는 훅입니다.
 * '내 인벤토리' 페이지 등에서 사용됩니다.
 */
export const useUserInventoryDetails = () => {
  return useQuery({
    queryKey: ["userInventoryDetails"],
    queryFn: fetchUserInventory,
  });
};

/**
 * (신규) 사용자가 구매한 전체 전략 상세 목록을 조회하는 훅입니다.
 * '구매한 전략' 페이지 등에서 사용됩니다.
 */
export const usePurchasedStrategiesDetails = () => {
  return useQuery({
    queryKey: ["purchasedStrategiesDetails"],
    queryFn: fetchPurchasedStrategies,
  });
};
