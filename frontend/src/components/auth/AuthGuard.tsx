"use client";

import { useUserStore } from "@/store/userStore";
import { useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthInitialized, accessToken } = useUserStore();

  useEffect(() => {
    // 인증 상태 확인이 끝난 후에만 리디렉션 로직을 실행합니다.
    if (isAuthInitialized && !accessToken) {
      router.push("/login");
    }
  }, [isAuthInitialized, accessToken, router]);

  // 1. 인증이 확인되었고, 토큰이 없는 경우 (리디렉션을 기다리는 동안)
  //    사용자가 보호된 콘텐츠를 잠시라도 보는 것을 막기 위해 스피너를 표시합니다.
  if (isAuthInitialized && !accessToken) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // 2. 그 외 모든 경우 (인증 확인 중이거나, 인증이 완료된 경우)
  //    자식 컴포넌트(페이지)를 그대로 렌더링합니다.
  //    이제 페이지가 자신의 isAuthInitialized 상태를 보고
  //    스스로 스켈레톤 UI를 보여줄 것입니다.
  return <>{children}</>;
}
