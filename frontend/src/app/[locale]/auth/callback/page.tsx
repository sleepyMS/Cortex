// file: frontend/src/app/[locale]/auth/callback/page.tsx (수정 부분)

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Spinner } from "@/components/ui/Spinner";
import useAuthStore from "@/store/authStore";
import apiClient from "@/lib/apiClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("AuthCallback");
  const { login, logout } = useAuthStore();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const error = searchParams.get("error");

    if (error) {
      alert(t("authError", { errorDetail: error }));
      router.push("/login");
      return;
    }

    if (accessToken) {
      async function fetchAndSetUserInfo() {
        try {
          const userInfoResponse = await apiClient.get("/users/me");
          // login 함수 호출 시 accessToken이 string임을 타입 단언 (!)
          login(userInfoResponse.data, accessToken!, refreshToken);
          alert(t("loginSuccess"));
          router.push("/dashboard");
        } catch (userFetchError: any) {
          console.error(
            "Failed to fetch user info after OAuth:",
            userFetchError
          );
          alert(t("loginProcessError"));
          // 로그아웃 액션을 통해 Zustand 상태 및 localStorage 모두 정리
          logout();
          router.push("/login");
        }
      }
      fetchAndSetUserInfo();
    } else {
      alert(t("loginProcessError"));
      router.push("/login");
    }
  }, [searchParams, router, t, login, logout]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
      <Spinner size="lg" />
      <p className="mt-4 text-lg text-muted-foreground">
        {t("processingLogin")}
      </p>
    </div>
  );
}
