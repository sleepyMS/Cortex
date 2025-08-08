"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens } = useUserStore();
  const hasProcessed = useRef(false); //

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const provider = localStorage.getItem("social_provider");

    // 2. 이미 처리했다면, 즉시 실행을 중단
    if (hasProcessed.current) {
      return;
    }

    if (code && provider) {
      // 3. 처리 시작을 동기적으로 표시 (리렌더링 없음)
      hasProcessed.current = true;

      const exchangeCodeForToken = async () => {
        try {
          const response = await apiClient.post(`/auth/callback/${provider}`, {
            code,
            state,
          });

          localStorage.removeItem("social_provider");

          const { accessToken, refreshToken } = response.data;

          if (accessToken) {
            setTokens({
              accessToken: accessToken,
              refreshToken: refreshToken,
            });
            // 로그인 성공 후 대시보드로 즉시 이동
            router.push("/dashboard");
          } else {
            // 응답은 성공했지만 토큰이 없는 예외적인 경우
            throw new Error("인증 토큰을 응답에서 찾을 수 없습니다.");
          }
        } catch (error) {
          console.error("소셜 로그인 처리 실패:", error);
          toast.error("로그인에 실패했습니다. 로그인 페이지로 이동합니다.");
          localStorage.removeItem("social_provider");
          router.push("/login");
        }
      };

      exchangeCodeForToken();
    }
  }, [router, searchParams, setTokens]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner size="lg" />
      <p className="ml-4">로그인 정보를 확인 중입니다...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}
