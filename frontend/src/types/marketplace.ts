// file: frontend/src/types/marketplace.ts

import { Backtest } from "./backtest";
import { LucideIconName } from "@/lib/iconMap";

// =================================================================
// [신규] 백엔드의 BaseProduct 스키마에 대응하는 기본 상품 타입
// 모든 마켓플레이스 상품(전략, 아이템)이 공통으로 가지는 속성을 정의합니다.
// =================================================================
export interface BaseProduct {
  id: string;
  name: string;
  price: number;
  author: {
    username: string;
    avatarUrl?: string;
  };
  productType: "STRATEGY" | "SHOP_ITEM";
  inventoryType: "UNLOCK" | "CONSUMABLE";
  // [핵심] 백엔드에서 camelCase로 변환되어 넘어오는 productMetadata 필드
  productMetadata: {
    category: string;
    positionType: "LongOnly" | "ShortOnly" | "LongShort";
    // 아이템의 경우 다른 메타데이터가 올 수 있으므로 확장성을 위해 any 허용
    [key: string]: any;
  };
}

// =================================================================
// [개선] BaseProduct를 상속하여 전략 상품 타입을 정의합니다.
// 중복 코드가 사라지고, productMetadata를 포함하게 됩니다.
// =================================================================
export interface MarketplaceStrategy extends BaseProduct {
  // [핵심 수정] summaryMetrics -> latestBacktestSummary로 변경
  latestBacktestSummary: {
    backtestId: string | null;
    totalReturnPct: number;
    mddPct: number;
    winRatePct: number;
    profitFactor: number;
    sharpeRatio: number;
    sortinoRatio: number;
  } | null; // 백테스트 결과가 없을 수 있으므로 null 허용
}

// =================================================================
// [개선] BaseProduct를 상속하여 전략 상세 정보 타입을 정의합니다.
// =================================================================
export interface MarketplaceStrategyDetail extends BaseProduct {
  description: string;
  // 대표 백테스트의 전체 결과 데이터를 포함합니다.
  representativeBacktest: Backtest;
}

// ShopItem과 UserInventoryItem 타입은 현재 구조에서 변경할 필요가 없습니다.
// 그대로 유지합니다.

/**
 * 아이템 샵에서 판매될 단일 아이템의 정보입니다.
 * UI 렌더링을 위한 displayProperties를 포함합니다.
 */
export interface ShopItem {
  id: string;
  type: "OPTIMIZATION_COUPON" | "BACKTEST_CREDIT" | "COSMETIC_ITEM";
  name: string;
  description: string;
  price: number;
  inventoryType: "UNLOCK" | "CONSUMABLE";
  displayProperties: {
    icon: LucideIconName;
    tier?: "BRONZE" | "SILVER" | "GOLD";
    stats: {
      label: string;
      value: string;
    }[];
  };
}

/**
 * 사용자가 보유한 아이템의 정보입니다.
 */
export interface UserInventoryItem {
  instanceId: string;
  itemId: string;
  name: string;
  isUsed: boolean;
  metadata: ShopItem["displayProperties"];
}

// 주문 상태를 나타내는 타입
export type OrderStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELED";

// 주문에 포함된 개별 상품 아이템 타입
export interface OrderItem {
  quantity: number;
  priceAtPurchase: number;
  product: {
    id: string;
    name: string;
    // 필요에 따라 다른 상품 정보 추가
  };
}

// 최종 Order 타입
export interface Order {
  id: string; // UUID는 문자열로 처리
  buyerId: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string; // ISO 8601 형식의 날짜 문자열
  items: OrderItem[];
}
