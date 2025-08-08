"use client";

import { useUserStore } from "@/store/userStore";

// User 객체 내부의 subscription 객체 타입을 명확히 정의합니다.
interface Subscription {
  planId: number;
  status: string;
  planName: "basic" | "trader" | "pro";
  currentPeriodEnd: string;
}

// 스토어에서 가져오는 User 객체의 타입을 정의합니다.
export interface UserWithSubscription {
  id: number;
  email: string;
  role: string;
  subscription?: Subscription | null;
}

type PlanName = "basic" | "trader" | "pro";

export function useUserSubscription() {
  // 👈 useQuery 대신, useUserStore에서 직접 사용자 정보를 가져옵니다.
  const { user } = useUserStore();

  const typedUser = user as UserWithSubscription | null;

  // 👈 스토어의 user 객체에서 planName을 camelCase로 접근합니다.
  const currentPlan: PlanName = typedUser?.subscription?.planName || "basic";

  const allowedTimeframesByPlan: Record<PlanName, string[]> = {
    basic: ["1h"],
    trader: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
    pro: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
  };

  const maxBacktestsPerDayByPlan: Record<PlanName, number> = {
    basic: 5,
    trader: 50,
    pro: 9999,
  };

  return {
    user,
    isLoading: false, // 👈 더 이상 자체 로딩 상태가 없음
    error: null,
    currentPlan,
    allowedTimeframes: allowedTimeframesByPlan[currentPlan] || ["1h"],
    maxBacktestsPerDay: maxBacktestsPerDayByPlan[currentPlan] || 5,
    isProOrTrader: currentPlan === "trader" || currentPlan === "pro",
    // refetchUserSubscription는 useQuery를 사용하지 않으므로 제거하거나
    // userStore에 별도의 refetch 액션을 만들어 연결할 수 있습니다.
  };
}
