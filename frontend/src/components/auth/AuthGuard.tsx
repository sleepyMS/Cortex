"use client";

import { useUserStore } from "@/store/userStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useHasHydrated } from "hooks/useHasHydrated";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useHasHydrated();
  const accessToken = useUserStore((state) => state.accessToken);

  useEffect(() => {
    // 상태 복원이 아직 안됐으면 아무것도 안함
    if (!hasHydrated) return;

    // 복원 후에도 토큰이 없으면 로그인 페이지로 이동
    if (!accessToken) {
      router.push("/login");
    }
  }, [hasHydrated, accessToken, router]);

  // 복원 중이거나, 토큰이 없어서 리디렉션 대기 중일 때 로딩 표시
  if (!hasHydrated || !accessToken) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // 모든 조건 통과 시, 보호된 페이지 콘텐츠 표시
  return <>{children}</>;
}
