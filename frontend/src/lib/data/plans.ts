import { PlanSchema } from "@/hooks/usePlans"; // 이미 정의된 타입을 재활용합니다.
import { cache } from "react";

/**
 * 백엔드 API 호출 실패 시 사용할 폴백 플랜 데이터.
 * 실제 배포 시 백엔드가 없어도 pricing 페이지가 정상 동작하도록 보장합니다.
 */
const FALLBACK_PLANS: PlanSchema[] = [
  {
    id: "fallback-basic",
    name: "Basic",
    price: 0,
    creditSurchargeMultiplier: 2.0,
    monthlyCreditReward: 0,
    features: {
      maxStrategies: 3,
      maxCoinsPerBacktest: 3,
      liveBotsLimit: 0,
      supportedTimeframes: "1h,4h,1d",
      communityAccess: true,
      telegramAlerts: false,
      advancedFeaturesAccess: false,
      portfolioBacktestAccess: false,
    },
  },
  {
    id: "fallback-trader",
    name: "Trader",
    price: 15000,
    creditSurchargeMultiplier: 1.5,
    monthlyCreditReward: 1000,
    features: {
      maxStrategies: 10,
      maxCoinsPerBacktest: 10,
      liveBotsLimit: 3,
      supportedTimeframes: "1m,5m,15m,30m,1h,4h,1d,1w,1M",
      communityAccess: true,
      telegramAlerts: true,
      advancedFeaturesAccess: true,
      portfolioBacktestAccess: false,
    },
  },
  {
    id: "fallback-pro",
    name: "Pro",
    price: 45000,
    creditSurchargeMultiplier: 1.0,
    monthlyCreditReward: 5000,
    features: {
      maxStrategies: -1, // unlimited
      maxCoinsPerBacktest: -1, // unlimited
      liveBotsLimit: -1, // unlimited
      supportedTimeframes: "1m,5m,15m,30m,1h,4h,1d,1w,1M",
      communityAccess: true,
      telegramAlerts: true,
      advancedFeaturesAccess: true,
      portfolioBacktestAccess: true,
    },
  },
];

/**
 * 서버 컴포넌트에서 사용할 플랜 데이터 페칭 함수.
 * Next.js의 fetch 캐시와 React의 cache를 사용해 중복 호출을 방지하고,
 * 1시간(3600초) 주기로 데이터를 갱신합니다 (ISR).
 * API 호출 실패 시 폴백 데이터를 반환합니다.
 */
export const getPlans = cache(async (): Promise<PlanSchema[]> => {
  try {
    // process.env.NEXT_PUBLIC_API_URL은 lib/apiClient.ts에 정의된 것을 따릅니다.
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/plans`, {
      method: "GET",
      next: {
        revalidate: 3600, // 1시간 (초 단위)
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch plans: ${res.statusText}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching plans in Server Component:", error);
    // API 호출 실패 시 폴백 데이터 반환
    return FALLBACK_PLANS;
  }
});
