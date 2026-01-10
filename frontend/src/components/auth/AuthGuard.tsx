"use client";

import { useUserStore } from "@/store/userStore";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthInitialized, accessToken } = useUserStore();

  useEffect(() => {
    if (isAuthInitialized && !accessToken) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthInitialized, accessToken, router, pathname]);

  // 인증 초기화 중이거나 토큰이 없으면 스피너만 표시 (children 렌더링 방지)
  if (!isAuthInitialized || !accessToken) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
