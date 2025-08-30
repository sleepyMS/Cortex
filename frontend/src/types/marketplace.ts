// file: frontend/src/types/marketplace.ts

import { Backtest } from "./backtest";
import { LucideIconName } from "@/lib/iconMap";

/**
 * 아이템 샵에서 판매될 단일 아이템의 정보입니다.
 * UI 렌더링을 위한 displayProperties를 포함합니다.
 */
export interface ShopItem {
  id: string;
  type: "OPTIMIZATION_COUPON" | "BACKTEST_CREDIT" | "COSMETIC_ITEM"; // 향후 확장 가능
  name: string;
  description: string;
  price: number;

  /**
   * [신규] 아이템의 재고 유형을 정의합니다.
   * - 'UNLOCK': 한 번만 구매 가능한 아이템 (e.g., 전략, 꾸미기 아이템)
   * - 'CONSUMABLE': 여러 번 구매하여 수량을 쌓을 수 있는 아이템 (e.g., 쿠폰, 크레딧)
   */
  inventoryType: "UNLOCK" | "CONSUMABLE";

  displayProperties: {
    icon: LucideIconName;
    tier?: "BRONZE" | "SILVER" | "GOLD";
    stats: {
      label: string; // 예: "최적화 횟수"
      value: string; // 예: "100회"
    }[];
  };
}

/**
 * 사용자가 보유한 아이템의 정보입니다.
 * (다음 단계에서 사용될 타입)
 */
export interface UserInventoryItem {
  instanceId: string; // 사용자가 보유한 아이템의 고유 ID
  itemId: string; // ShopItem의 ID
  name: string;
  isUsed: boolean;
  metadata: ShopItem["displayProperties"];
}

/**
 * 마켓플레이스에 표시될 단일 전략의 정보입니다.
 */
export interface MarketplaceStrategy {
  id: string;
  name: string;
  author: {
    username: string;
    avatarUrl?: string; // 프로필 이미지 (선택 사항)
  };
  price: number;
  description: string;
  // 대표 성과 지표
  summaryMetrics: {
    totalReturnPct: number;
    mddPct: number;
    winRatePct: number;
  };
  tags?: string[]; // 향후 확장용 (예: ["Scalping", "Swing", "Trending"])
  createdAt: string; // 최신순 정렬을 위해 추가
}

/**
 * 마켓플레이스 전략 상세 페이지에서 사용할 전체 데이터 구조입니다.
 * GET /api/marketplace/strategies/{id} 응답의 형태입니다.
 */
export interface MarketplaceStrategyDetail {
  id: string;
  name: string;
  author: {
    username: string;
    avatarUrl?: string;
  };
  price: number;
  description: string;
  tags?: string[];

  // 이 전략을 대표하는 백테스트의 전체 결과 데이터를 포함합니다.
  representativeBacktest: Backtest;
}
