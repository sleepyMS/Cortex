// file: frontend/src/hooks/useCreditBalance.ts

"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import apiClient from "@/lib/apiClient";
import { useUserStore } from "@/store/userStore";
import { CreditBalanceSummary } from "@/store/userStore"; // userStore에서 정의한 타입 재사용

/**
 * 백엔드로부터 최신 크레딧 잔액 정보를 가져오는 API fetcher 함수
 */
const fetchCreditBalance = async (): Promise<CreditBalanceSummary> => {
  const { data } = await apiClient.get("/credits/balance-summary");
  return data;
};

/**
 * 사용자의 크레딧 잔액을 관리하는 중앙 집중식 훅.
 * React Query를 통해 서버 상태를 가져오고, Zustand를 통해 전역 상태를 업데이트합니다.
 */
export function useCreditBalance() {
  // Zustand 스토어에서 상태와 액션을 가져옵니다.
  const { creditBalance, setCreditBalance, accessToken } = useUserStore(
    (state) => ({
      creditBalance: state.creditBalance,
      setCreditBalance: state.setCreditBalance,
      accessToken: state.accessToken,
    })
  );

  // React Query를 사용하여 데이터를 가져옵니다.
  const { data, isLoading, isError, error, isSuccess } = useQuery({
    // 이 쿼리의 고유 키입니다. 다른 곳에서 이 키로 캐시를 무효화할 수 있습니다.
    queryKey: ["creditBalance"],
    // 데이터를 가져올 함수입니다.
    queryFn: fetchCreditBalance,
    // accessToken(로그인 상태)이 있을 때만 쿼리를 실행합니다.
    enabled: !!accessToken,
    // 1분 동안은 데이터를 '신선한' 상태로 간주하여, 불필요한 재호출을 방지합니다.
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // React Query를 통해 가져온 최신 데이터를 Zustand 스토어에 동기화합니다.
  useEffect(() => {
    if (isSuccess && data) {
      setCreditBalance(data);
    }
  }, [isSuccess, data, setCreditBalance]);

  // 컴포넌트에서는 이 훅을 통해 일관된 데이터와 상태를 제공받습니다.
  return {
    creditBalance, // Zustand 스토어에서 제공하는 최신 잔액 정보
    isLoading, // 데이터 로딩 중 여부
    isError, // 에러 발생 여부
    error, // 에러 객체
  };
}
