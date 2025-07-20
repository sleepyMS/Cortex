"use client";

import { useEffect, useRef, Suspense } from "react"; // 👈 useRef 임포트
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Spinner";

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens } = useUserStore();
  const hasProcessed = useRef(false); // 👈 1. 처리 여부를 저장할 ref 생성

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const provider = localStorage.getItem("social_provider");

    // 👇 2. 이미 처리했다면, 즉시 실행을 중단
    if (hasProcessed.current) {
      return;
    }

    if (code && provider) {
      // 👇 3. 처리 시작을 동기적으로 표시 (리렌더링 없음)
      hasProcessed.current = true;

      const exchangeCodeForToken = async () => {
        try {
          const response = await apiClient.post(`/auth/callback/${provider}`, {
            code,
            state,
          });

          localStorage.removeItem("social_provider");

          const { access_token, refresh_token } = response.data;
          if (access_token) {
            setTokens({
              accessToken: access_token,
              refreshToken: refresh_token,
            });
            router.push("/dashboard");
          }
        } catch (error) {
          console.error("소셜 로그인 처리 실패:", error);
          alert("로그인에 실패했습니다. 로그인 페이지로 이동합니다.");
          localStorage.removeItem("social_provider");
          router.push("/login");
        }
      };

      exchangeCodeForToken();
    }
  }, [router, searchParams, setTokens]); // 👈 ref는 의존성 배열에 넣지 않음

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
