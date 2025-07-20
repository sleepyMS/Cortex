"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Spinner";

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens } = useUserStore();

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const provider = localStorage.getItem("social_provider");

    if (code && provider) {
      const exchangeCodeForToken = async () => {
        try {
          // 👇 바로 이 부분의 URL을 올바른 최종 주소로 수정해야 합니다.
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
    } else {
      alert("인증 정보가 올바르지 않습니다.");
      router.push("/login");
    }
  }, [router, searchParams, setTokens]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner size="lg" />
      <p className="ml-4">로그인 정보를 확인 중입니다...</p>
    </div>
  );
}

// Suspense로 감싸 useSearchParams 사용을 지원
export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}
