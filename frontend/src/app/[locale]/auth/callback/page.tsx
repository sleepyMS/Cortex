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
  // 1. setUser 액션을 스토어에서 가져옵니다.
  const { setTokens, setUser } = useUserStore.getState();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const provider = localStorage.getItem("social_provider");

    if (hasProcessed.current) {
      return;
    }

    if (code && provider) {
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
            // 2. 토큰을 스토어에 저장합니다.
            setTokens({ accessToken, refreshToken });

            // 3. 다음 API 요청을 위해 apiClient의 기본 헤더를 즉시 설정합니다.
            apiClient.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${accessToken}`;

            // 4. 사용자 정보를 바로 요청합니다.
            const userResponse = await apiClient.get("/users/me");

            // 5. 받은 사용자 정보를 스토어에 저장합니다.
            setUser(userResponse.data);

            // 6. 모든 상태 저장이 완료된 후 대시보드로 이동합니다.
            toast.success("로그인되었습니다. 환영합니다!");
            router.push("/dashboard");
          } else {
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
    // setUser를 의존성 배열에 추가합니다.
  }, [router, searchParams]);

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
