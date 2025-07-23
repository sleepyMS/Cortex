import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { useHasHydrated } from "./useHasHydrated";
import apiClient from "@/lib/apiClient";

export function useReAuth() {
  const hasHydrated = useHasHydrated();
  const { accessToken, user, setUser, logout, setAuthInitialized } =
    useUserStore();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const attemptReAuth = async () => {
      // 👇 1. 토큰이 존재하면, API 호출 전에 즉시 헤더를 설정합니다.
      if (accessToken) {
        apiClient.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${accessToken}`;

        // 2. 사용자 정보가 없다면 가져옵니다.
        if (!user) {
          try {
            const response = await apiClient.get("/users/me");
            setUser(response.data);
          } catch (error) {
            console.error("재인증 실패", error);
            logout();
          }
        }
      }
      // 3. 모든 인증 시도가 끝났음을 알립니다.
      setAuthInitialized(true);
    };

    attemptReAuth();
  }, [hasHydrated, accessToken, user, setUser, logout, setAuthInitialized]);
}
