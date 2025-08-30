// file: src/types/marketplace.ts

// 아이템 샵에서 판매될 아이템의 정보
export interface ShopItem {
  id: string;
  type: "OPTIMIZATION_COUPON" | "BACKTEST_CREDIT";
  name: string; // 예: "골드 최적화 쿠폰"
  description: string;
  price: number;
  metadata: {
    tier?: "BRONZE" | "SILVER" | "GOLD";
    trials?: number; // 최적화 쿠폰의 경우
    credits?: number; // 백테스트 추가권의 경우
  };
}

// 사용자가 보유한 최적화 쿠폰 정보
export interface UserOptimizationCoupon {
  instanceId: string; // 사용자가 보유한 쿠폰의 고유 ID
  name: string; // 예: "골드 최적화 쿠폰"
  tier: "BRONZE" | "SILVER" | "GOLD";
  trials: number; // 이 쿠폰으로 시도 가능한 횟수
  isUsed: boolean;
}
