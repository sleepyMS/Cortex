"use client";

import { useUserStore } from "@/store/userStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthInitialized, accessToken } = useUserStore();

  useEffect(() => {
    // 인증 초기화가 완료될 때까지 기다립니다.
    if (!isAuthInitialized) {
      return;
    }

    // 초기화 후에도 토큰이 없으면 로그인 페이지로 보냅니다.
    if (!accessToken) {
      // alert("로그인이 필요합니다."); // alert는 제거하거나 toast로 변경하는 것을 권장
      router.push("/login");
    }
  }, [isAuthInitialized, accessToken, router]);

  // 인증 초기화가 진행 중일 때는 로딩 스피너를 표시합니다.
  if (!isAuthInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // 👇 초기화가 끝났지만 토큰이 없는 경우 (리디렉션 대기) 잠시 로딩 표시
  if (!accessToken) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // 모든 조건이 충족되면 자식 컴포넌트(대시보드)를 렌더링합니다.
  return <>{children}</>;
}
