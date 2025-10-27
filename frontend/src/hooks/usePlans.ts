import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient"; // 04. Coding Conventions에 명시된 apiClient
// import { PlanSchema } from "@/types/api"; // 02. Tech Stack에 따라 API 타입을 정의해야 함

// API 응답에 대한 타입 정의 (예시: src/types/api.ts)
// schemas.py의 PlanSchema와 일치해야 합니다.

export interface PlanFeature {
  maxStrategies: number;
  maxCoinsPerBacktest: number;
  liveBotsLimit: number;
  supportedTimeframes: string;
  communityAccess: boolean;
  telegramAlerts: boolean;
  advancedFeaturesAccess: boolean;
  portfolioBacktestAccess: boolean;
}

export interface PlanSchema {
  id: string; // UUID는 string으로 받음
  name: "Basic" | "Trader" | "Pro"; // PlanType Enum
  price: number; // float은 number로 받음
  features: PlanFeature;
  creditSurchargeMultiplier: number;
  monthlyCreditReward: number;
}

// GET /plans API를 호출하는 비동기 함수
const fetchPlans = async (): Promise<PlanSchema[]> => {
  const { data } = await apiClient.get<PlanSchema[]>("/plans");
  return data;
};

// 플랜 데이터를 가져오기 위한 커스텀 훅
export const usePlans = () => {
  return useQuery<PlanSchema[], Error>({
    queryKey: ["plans"],
    queryFn: fetchPlans,
    staleTime: 1000 * 60 * 60, // 1시간 동안 캐시 유지
    refetchOnWindowFocus: false,
  });
};
