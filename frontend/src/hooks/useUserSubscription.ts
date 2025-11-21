// file: frontend/src/hooks/useUserSubscription.ts
"use client";

import { useUserStore } from "@/store/userStore";

export function useUserSubscription() {
  const { user, isAuthInitialized } = useUserStore();

  const subscription = user?.subscription;
  const features = subscription?.plan?.features;

  // --- 필요한 모든 데이터를 추출하고 명확한 이름으로 할당합니다. ---
  const status = subscription?.status || "inactive";
  const endDate = subscription?.currentPeriodEnd || null;
  const currentPlan = subscription?.plan?.name || "Basic";

  const allowedTimeframes = features?.supportedTimeframes?.split(",") || [
    "1h",
    "4h",
    "1d",
  ];
  const maxBacktestsPerDay = features?.dailyBacktestCount ?? 10;
  const liveBotsLimit = features?.liveBotsLimit ?? 0;
  const maxCoinsPerBacktest = features?.maxCoinsPerBacktest ?? 1;

  const isTrader = currentPlan === "Trader";
  const isPro = currentPlan === "Pro";
  const isProOrTrader = isTrader || isPro;

  return {
    user,
    // isAuthInitialized가 false이면 아직 사용자 정보를 로딩 중이라는 의미입니다.
    isLoading: !isAuthInitialized,
    subscription,
    features,
    status,
    endDate,
    currentPlan,
    allowedTimeframes,
    maxBacktestsPerDay,
    liveBotsLimit,
    maxCoinsPerBacktest,
    isProOrTrader,
    isPro,
    isTrader,
  };
}
