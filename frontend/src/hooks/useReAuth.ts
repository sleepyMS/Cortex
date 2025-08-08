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
      try {
        if (accessToken) {
          apiClient.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${accessToken}`;
          if (!user) {
            const response = await apiClient.get("/users/me");
            setUser(response.data);
          }
        }
      } catch (error) {
        console.error("재인증 실패:", error);
        // 토큰이 유효하지 않으면 로그아웃 처리
        logout();
      } finally {
        // 👈 성공하든, 실패하든, 토큰이 아예 없든,
        // 모든 초기 인증 시도가 끝나면 상태를 true로 설정
        setAuthInitialized(true);
      }
    };

    attemptReAuth();
    //
  }, [hasHydrated, accessToken]); // 👈 의존성 배열 최적화
}
