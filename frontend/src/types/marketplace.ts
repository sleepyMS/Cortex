// file: frontend/src/types/marketplace.ts

import { Backtest } from "./backtest";
import { LucideIconName } from "@/lib/iconMap";
import { PositionRules, TpslLogic, TargetCoin } from "./strategy";

// =================================================================
// 1. 공통 타입 및 메타데이터 정의
// =================================================================

export interface ProductAuthor {
  username?: string;
  avatarUrl?: string;
}

export interface StrategyMetadata {
  category: string;
  positionType: "LongOnly" | "ShortOnly" | "LongShort";
  tags?: string[];
}

export interface ShopItemMetadata {
  icon: LucideIconName;
  tier?: "BRONZE" | "SILVER" | "GOLD";
  stats?: {
    // stats는 선택적일 수 있습니다.
    label: string;
    value: string;
  }[];
}

/**
 * [수정] productType에 'CREDIT_PACK'을 추가하여 모든 상품 종류를 허용합니다.
 */
export interface BaseProduct<T, U extends string> {
  id: string;
  name: string;
  price: number;
  description?: string;
  author: ProductAuthor;
  productType: U; // 제네릭을 사용하여 상품 타입을 더 명확하게 강제
  inventoryType: "UNLOCK" | "CONSUMABLE";
  linkedResourceId: string;
  productMetadata: T;
}

// =================================================================
// 2. 상품 타입 정의 (전략 및 아이템)
// =================================================================

/**
 * [수정] 전략 상품의 productType은 항상 'STRATEGY'임을 명시합니다.
 */
export interface MarketplaceStrategy
  extends BaseProduct<StrategyMetadata, "STRATEGY"> {
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

export interface MarketplaceStrategyDetail extends MarketplaceStrategy {
  representativeBacktest: Backtest | null;
  longEntryRules?: PositionRules;
  longExitRules?: PositionRules;
  shortEntryRules?: PositionRules;
  shortExitRules?: PositionRules;
  tpslLogic?: TpslLogic;
  targetCoins?: TargetCoin[];
}

/**
 * [수정] 상점 아이템의 productType은 'SHOP_ITEM' 또는 'CREDIT_PACK'이 될 수 있음을 명시합니다.
 */
export interface ShopItem
  extends BaseProduct<ShopItemMetadata, "SHOP_ITEM" | "CREDIT_PACK"> {
  // ShopItem에만 특화된 속성이 있다면 여기에 추가
}

/**
 * AI 모델 메타데이터
 */
export interface AIModelMetadata {
  modelType: string;
  trainingSymbol?: string;
}

/**
 * AI 모델 상품 타입
 */
export interface MarketplaceAIModel
  extends BaseProduct<AIModelMetadata, "AI_MODEL"> {
  modelType: string;
  trainingStartDate?: string;
  trainingEndDate?: string;
  accuracy?: number;
}

export interface PaginatedProductsResponse {
  products: (MarketplaceStrategy | ShopItem | MarketplaceAIModel)[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

// =================================================================
// 3. 인벤토리 및 주문 관련 타입
// =================================================================

/**
 * [수정] 백엔드 API 응답과 일치하도록 '수량(quantity)' 기반으로 변경합니다.
 */
export interface UserInventoryItem {
  productId: string;
  name: string;
  description?: string;
  displayProperties: ShopItemMetadata; // 아이콘 등 표시 정보
  quantity: number;
  purchasedAt: string;
}

// ... (OrderStatus, OrderItem, Order 타입은 기존과 동일하게 유지)
export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "COMPLETED"
  | "FAILED"
  | "CANCELED";
export interface OrderItem {
  quantity: number;
  priceAtPurchase: number;
  product: Pick<BaseProduct<any, any>, "id" | "name">;
}
export interface Order {
  id: string;
  buyerId: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
}
