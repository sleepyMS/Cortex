"use client";

import { useUserStore } from "@/store/userStore";

export function useUserSubscription() {
  const { user } = useUserStore();

  // 1. 스토어에서 직접 구독 정보와 기본값을 가져옵니다.
  const subscription = user?.subscription;
  const features = subscription?.plan?.features;

  // 2. 백엔드에서 받은 데이터를 기반으로 현재 플랜과 기능들을 동적으로 계산합니다.
  const currentPlan = subscription?.plan?.name?.toLowerCase() || "basic";

  // 3. 더 이상 하드코딩된 객체가 필요 없습니다.
  const allowedTimeframes = features?.supportedTimeframes.split(",") || [
    "1h",
    "4h",
    "1d",
  ];
  const maxBacktestsPerDay = features?.dailyBacktestCount ?? 10;
  const liveBotsLimit = features?.liveBotsLimit ?? 0;
  const maxCoinsPerBacktest = features?.maxCoinsPerBacktest ?? 1;

  // 4. 플랜 등급에 따른 파생 상태 계산
  const isTrader = currentPlan === "trader";
  const isPro = currentPlan === "pro";
  const isProOrTrader = isTrader || isPro;

  return {
    user,
    isLoading: false,
    error: null,
    currentPlan,
    features, // 👈 전체 feature 객체를 반환하여 유연성 확보
    allowedTimeframes,
    maxBacktestsPerDay,
    liveBotsLimit,
    maxCoinsPerBacktest,
    isProOrTrader,
    isPro,
    isTrader,
  };
}
