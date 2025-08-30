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
  const loginAndUpdateUser = useUserStore((state) => state.loginAndUpdateUser);
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

          const tokens = response.data;

          if (tokens.accessToken) {
            await loginAndUpdateUser(tokens);

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
  }, [router, searchParams, loginAndUpdateUser]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner size="lg" />
      <p className="ml-4">로그인 정보를 확인 중입니다...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    // Suspense는 searchParams를 안전하게 사용하기 위해 필요하므로 그대로 둡니다.
    <Suspense>
      <AuthCallback />
    </Suspense>
  );
}
