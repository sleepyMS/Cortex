"use client";

import { useUserStore } from "@/store/userStore";
import { useRouter, usePathname } from "@/i18n/navigation"; // 👈 1. usePathname 임포트
import { useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname(); // 👈 2. 현재 경로를 가져옵니다 (예: /strategies/new)
  const { isAuthInitialized, accessToken } = useUserStore();

  useEffect(() => {
    if (isAuthInitialized && !accessToken) {
      // 3. 로그인 페이지로 보낼 때, ?redirect= 쿼리 파라미터에 현재 경로를 담아서 보냅니다.
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthInitialized, accessToken, router, pathname]); // 👈 4. pathname 의존성 추가

  // (아래 로직은 기존과 동일)
  if (isAuthInitialized && !accessToken) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
