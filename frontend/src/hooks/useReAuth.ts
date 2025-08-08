"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { useHasHydrated } from "./useHasHydrated";
import apiClient from "@/lib/apiClient";

export function useReAuth() {
  const hasHydrated = useHasHydrated();
  // 👈 1. useEffect 외부에서는 setAuthInitialized만 가져옵니다.
  const setAuthInitialized = useUserStore((state) => state.setAuthInitialized);

  useEffect(() => {
    // Hydration이 완료되기 전까지는 아무 작업도 하지 않습니다.
    if (!hasHydrated) {
      return;
    }

    const attemptReAuth = async () => {
      // 👈 2. 필요한 모든 상태와 액션을 이 함수 내부에서 직접 가져옵니다.
      // 이렇게 하면 useEffect가 이 값들의 변경에 반응하지 않게 됩니다.
      const { accessToken, user, setUser, logout } = useUserStore.getState();

      try {
        if (accessToken) {
          apiClient.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${accessToken}`;
          // 사용자 정보가 스토어에 없는 경우에만 API 호출
          if (!user) {
            const response = await apiClient.get("/users/me");
            setUser(response.data);
          }
        }
      } catch (error) {
        console.error("재인증 실패:", error);
        logout(); // 토큰이 유효하지 않으면 로그아웃 처리
      } finally {
        // 성공하든, 실패하든, 토큰이 아예 없든,
        // 모든 초기 인증 시도가 끝나면 상태를 true로 설정
        setAuthInitialized(true);
      }
    };

    attemptReAuth();

    // 👈 3. 의존성 배열에서 hasHydrated와 setAuthInitialized만 남겨, 딱 한 번만 실행되도록 보장합니다.
  }, [hasHydrated, setAuthInitialized]);
}
