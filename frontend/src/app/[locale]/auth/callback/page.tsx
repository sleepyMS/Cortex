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
    // URL에서 'code'와 'provider'를 추출합니다.
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // Naver 로그인 시 필요

    // 이 페이지로 리디렉션시킨 provider를 식별하는 로직이 필요합니다.
    // 간단하게는 localStorage를 사용하거나, state 파라미터에 정보를 담을 수 있습니다.
    // 여기서는 'google'로 가정합니다.
    const provider = "google"; // 실제로는 동적으로 이 값을 알아내야 합니다.

    if (code) {
      const exchangeCodeForToken = async () => {
        try {
          // 4. 프론트엔드가 백엔드 API로 'code'를 보냅니다.
          const response = await apiClient.post(`/auth/${provider}/callback`, {
            code,
            state,
          });

          const { access_token, refresh_token } = response.data;

          if (access_token) {
            // 7. 받은 토큰을 스토어에 저장합니다.
            setTokens({
              accessToken: access_token,
              refreshToken: refresh_token,
            });
            // 8. 대시보드로 리디렉션합니다.
            router.push("/dashboard");
          }
        } catch (error) {
          console.error("소셜 로그인 처리 실패:", error);
          alert("로그인에 실패했습니다. 로그인 페이지로 이동합니다.");
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

// Suspense로 감싸 useSearchParams 사용을 지원
export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}
