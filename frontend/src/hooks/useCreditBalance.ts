// file: frontend/src/hooks/useCreditBalance.ts

"use client";

import { useShallow } from "zustand/react/shallow";
import { useUserStore } from "@/store/userStore";

/**
 * 사용자의 크레딧 잔액을 관리하는 중앙 집중식 훅.
 * creditBalance는 이미 /users/me API에서 가져와 userStore에 저장되어 있으므로,
 * 별도의 API 호출 없이 Zustand 스토어에서 직접 가져옵니다.
 */
export function useCreditBalance() {
  // Zustand 스토어에서 크레딧 잔액 정보를 가져옵니다.
  // useShallow를 사용하여 객체 참조 안정성을 보장합니다.
  const { creditBalance, isAuthInitialized } = useUserStore(
    useShallow((state) => ({
      creditBalance: state.creditBalance,
      isAuthInitialized: state.isAuthInitialized,
    })),
  );

  // 컴포넌트에서는 이 훅을 통해 일관된 데이터와 상태를 제공받습니다.
  return {
    creditBalance, // Zustand 스토어에서 제공하는 최신 잔액 정보
    isLoading: !isAuthInitialized, // 인증 초기화 전까지 로딩 상태
    isError: false, // 에러는 userStore에서 처리되므로 항상 false
    error: null, // 에러 객체 없음
  };
}
