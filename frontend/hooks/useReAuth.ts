import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import apiClient from "@/lib/apiClient";
import { useHasHydrated } from "./useHasHydrated";

export function useReAuth() {
  const hasHydrated = useHasHydrated(); // 👈 2. 스토어가 아닌 이 훅을 통해 마운트 상태를 가져옵니다.

  // 👇 3. userStore에서는 더 이상 hasHydrated를 가져오지 않습니다.
  const { accessToken, user, setUser, logout } = useUserStore();

  useEffect(() => {
    // 1. 클라이언트 마운트가 완료될 때까지 기다립니다.
    if (!hasHydrated) {
      return;
    }

    // console.log("[useReAuth] Hydration 완료! 현재 상태:", {
    //   hasToken: !!accessToken,
    //   hasUser: !!user,
    // });

    // 2. 마운트 완료 후, 토큰은 있는데 유저 정보가 없는 경우 API 호출
    if (accessToken && !user) {
      // console.log("[useReAuth] 토큰 확인, 사용자 정보 API를 호출합니다.");

      const fetchUser = async () => {
        try {
          apiClient.defaults.headers.common[
            "Authorization"
          ] = `Bearer ${accessToken}`;
          const response = await apiClient.get("/users/me");
          setUser(response.data);
          // console.log("[useReAuth] 사용자 정보 API 호출 성공:", response.data);
        } catch (error) {
          console.error("[useReAuth] 재인증 실패", error);
          logout();
        }
      };

      fetchUser();
    }
  }, [hasHydrated, accessToken, user, setUser, logout]); // hasHydrated를 의존성 배열에 유지합니다.
}
