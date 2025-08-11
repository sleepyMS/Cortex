"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { useHasHydrated } from "./useHasHydrated";

/**
 * 페이지 로드 시 사용자의 로그인 세션을 복원하는 훅입니다.
 * 실제 인증 로직은 `userStore`의 `rehydrateAndSetUser` 액션에 위임하고,
 * 이 훅은 해당 액션을 적절한 시점에 호출하는 '트리거' 역할만 수행합니다.
 */
export function useReAuth() {
  const hasHydrated = useHasHydrated();

  // 스토어에서 중앙화된 재인증 액션을 가져옵니다.
  const rehydrateAndSetUser = useUserStore(
    (state) => state.rehydrateAndSetUser
  );

  useEffect(() => {
    // 클라이언트 사이드에서 localStorage 데이터 로딩(Hydration)이 완료되면 실행됩니다.
    if (hasHydrated) {
      // 스토어에 있는 세션 복원 로직을 호출합니다.
      rehydrateAndSetUser();
    }
  }, [hasHydrated, rehydrateAndSetUser]); // 앱 로드 시 단 한 번만 실행되도록 보장합니다.
}
