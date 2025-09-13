// file: frontend/src/types/marketplace.ts

import { Backtest } from "./backtest";
import { LucideIconName } from "@/lib/iconMap";
import { PositionRules, TpslLogic, TargetCoin } from "./strategy";

// =================================================================
// 1. 공통 타입 및 메타데이터 정의
// =================================================================

/**
 * 모든 상품의 판매자 정보를 위한 공통 타입
 */
export interface ProductAuthor {
  username?: string;
  avatarUrl?: string;
}

/**
 * 전략 상품에만 해당하는 메타데이터 타입
 */
export interface StrategyMetadata {
  category: string;
  positionType: "LongOnly" | "ShortOnly" | "LongShort";
  tags?: string[];
}

/**
 * 상점 아이템에만 해당하는 메타데이터 타입
 */
export interface ShopItemMetadata {
  icon: LucideIconName;
  tier?: "BRONZE" | "SILVER" | "GOLD";
  stats: {
    label: string;
    value: string;
  }[];
}

/**
 * 모든 마켓플레이스 상품의 기반이 되는 제네릭 타입
 */
export interface BaseProduct<T> {
  id: string;
  name: string;
  price: number;
  description?: string;
  author: ProductAuthor;
  productType: "STRATEGY" | "SHOP_ITEM";
  inventoryType: "UNLOCK" | "CONSUMABLE";
  productMetadata: T; // 제네릭을 사용하여 상품 타입별 메타데이터를 강제
}

// =================================================================
// 2. 상품 타입 정의 (전략 및 아이템)
// =================================================================

/**
 * 전략 상품 목록에 사용될 타입. BaseProduct를 상속.
 */
export interface MarketplaceStrategy extends BaseProduct<StrategyMetadata> {
  latestBacktestSummary: {
    backtestId: string | null;
    totalReturnPct: number | null;
    mddPct: number | null;
    winRatePct: number | null;
    profitFactor: number | null;
    sharpeRatio: number | null;
    sortinoRatio: number | null;
  } | null;
}

/**
 * 전략 상품 상세 정보 타입. 소유권에 따라 규칙 정보가 선택적으로 포함됨.
 */
export interface MarketplaceStrategyDetail extends MarketplaceStrategy {
  representativeBacktest: Backtest | null;
  // 소유자에게만 제공되는 민감 정보 (optional)
  longEntryRules?: PositionRules;
  longExitRules?: PositionRules;
  shortEntryRules?: PositionRules;
  shortExitRules?: PositionRules;
  tpslLogic?: TpslLogic;
  targetCoins?: TargetCoin[];
}

/**
 * 상점 아이템 타입. BaseProduct를 상속하여 중복 제거.
 */
export interface ShopItem extends BaseProduct<ShopItemMetadata> {
  // ShopItem에만 특화된 속성이 있다면 여기에 추가
}

/**
 * 상품 목록 API의 페이지네이션 응답 전체를 위한 타입
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

// =================================================================
// 3. 인벤토리 및 주문 관련 타입 (기존 구조 유지)
// =================================================================

/**
 * 사용자가 보유한 아이템의 정보입니다.
 */
export interface UserInventoryItem {
  instanceId: string;
  product: ShopItem; // 아이템 상세 정보 포함
  isUsed: boolean;
  usedAt: string | null;
  purchasedAt: string;
}

export type OrderStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELED";

export interface OrderItem {
  quantity: number;
  priceAtPurchase: number;
  product: Pick<BaseProduct<any>, "id" | "name">; // 필요한 최소 정보만 포함
}

export interface Order {
  id: string;
  buyerId: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}
