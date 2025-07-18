// file: frontend/src/app/[locale]/auth/callback/page.tsx

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl"; // useTranslations 임포트
import { Spinner } from "@/components/ui/Spinner"; // Spinner 컴포넌트 임포트

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("AuthCallback"); // "AuthCallback" 네임스페이스 사용

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const error = searchParams.get("error");

    if (error) {
      alert(t("authError", { errorDetail: error })); // 언어팩 사용
      router.push("/login");
      return;
    }

    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
      alert(t("loginSuccess")); // 언어팩 사용
      router.push("/dashboard");
    } else {
      alert(t("loginProcessError")); // 언어팩 사용
      router.push("/login");
    }
  }, [searchParams, router, t]); // t를 의존성 배열에 추가

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
      <Spinner size="lg" /> {/* 스피너 컴포넌트 사용 */}
      <p className="mt-4 text-lg text-muted-foreground">
        {t("processingLogin")}
      </p>{" "}
      {/* 언어팩 사용 */}
    </div>
  );
}
