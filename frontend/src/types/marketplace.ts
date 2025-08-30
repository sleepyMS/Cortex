// file: frontend/src/types/marketplace.ts

import { Backtest } from "./backtest";

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
  // ▼▼▼ [핵심] 백엔드가 UI를 제어하기 위한 메타데이터 ▼▼▼
  displayProperties: {
    icon: string; // 사용할 Lucide 아이콘의 이름 (예: "TestTubeDiagonal")
    tier?: "BRONZE" | "SILVER" | "GOLD";
    stats: {
      label: string; // 예: "최적화 횟수"
      value: string; // 예: "100회"
    }[];
  };
  // ▲▲▲ [완료] ▲▲▲
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
  metadata: ShopItem["metadata"];
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
