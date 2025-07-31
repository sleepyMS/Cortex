// frontend/src/hooks/useUserSubscription.ts

"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";

// 사용자 및 구독 정보 타입 정의
// 06_API_Specification.md의 GET /users/me 응답을 기반으로 합니다.
export interface UserSubscription {
  id: number;
  email: string;
  role: string;
  subscription?: {
    // 구독 정보는 선택적일 수 있습니다 (e.g., Free 플랜 사용자)
    plan_id: number;
    status: string; // e.g., "active", "canceled", "past_due"
    plan_name: "basic" | "trader" | "pro"; // plans 테이블의 name 필드와 매핑
    current_period_end: string; // ISO 8601 형식의 날짜 문자열
  };
}

// 명시적으로 플랜 이름 타입 정의
type PlanName = "basic" | "trader" | "pro";

export function useUserSubscription() {
  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery<UserSubscription, Error>({
    // 👈 error 타입을 Error로 명시 (AxiosError는 여기서 필요 없음)
    queryKey: ["currentUser"],
    queryFn: async () => {
      // 06_API_Specification.md에 따라 /users/me 엔드포인트 호출
      const response = await apiClient.get<UserSubscription>("/users/me");
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5분 동안 fresh 상태 유지
    gcTime: 1000 * 60 * 30, // 👈 cacheTime 대신 gcTime으로 이름 변경
    retry: 1,
  });

  // 사용자의 현재 플랜 이름을 반환 (구독 정보 없으면 기본 플랜으로 간주)
  // 👈 currentPlan의 타입을 명시적으로 PlanName으로 지정
  const currentPlan: PlanName = user?.subscription?.plan_name || "basic";

  // 각 플랜이 허용하는 타임프레임 목록 (백엔드 plans.features에 정의될 내용)
  const allowedTimeframesByPlan: Record<PlanName, string[]> = {
    // 👈 Record<PlanName, string[]>으로 명시
    basic: ["1h"],
    trader: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
    pro: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
  };

  // 플랜별 일일 백테스팅 횟수 제한 (예시)
  const maxBacktestsPerDayByPlan: Record<PlanName, number> = {
    // 👈 Record<PlanName, number>로 명시
    basic: 5,
    trader: 50,
    pro: 9999,
  };

  return {
    user,
    isLoading,
    error,
    currentPlan, // 👈 currentPlan은 이제 PlanName 타입
    allowedTimeframes: allowedTimeframesByPlan[currentPlan] || ["1h"],
    maxBacktestsPerDay: maxBacktestsPerDayByPlan[currentPlan] || 5,
    isProOrTrader: currentPlan === "trader" || currentPlan === "pro",
    refetchUserSubscription: refetch,
  };
}
