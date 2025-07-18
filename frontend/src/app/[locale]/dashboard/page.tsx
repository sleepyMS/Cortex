// file: frontend/src/app/[locale]/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import useAuthStore, {
  useAuthHydration,
  UserInfo as AuthStoreUserInfo,
} from "@/store/authStore"; // UserInfo as AuthStoreUserInfo 임포트 및 useAuthHydration 임포트

// UserInfo 인터페이스를 useAuthStore에서 임포트한 AuthStoreUserInfo로 대체합니다.
// 인터페이스 UserInfo { // 주석 처리 또는 제거
//   id: number;
//   email: string;
//   role: string;
// }

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const router = useRouter();

  const { isLoggedIn, userInfo, logout } = useAuthStore();
  const hasHydrated = useAuthHydration(); // useAuthHydration 훅 사용

  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log("DashboardPage Render:", {
    isLoggedIn,
    hasHydrated,
    pageLoading,
    error,
    userInfo,
  });

  useEffect(() => {
    console.log("DashboardPage useEffect Triggered:", {
      isLoggedIn,
      hasHydrated,
    });

    // 1. Zustand 스토어의 Hydration(로딩)이 완료될 때까지 기다립니다.
    if (!hasHydrated) {
      console.log("DEBUG: hasHydrated is false, waiting for hydration...");
      setPageLoading(true);
      return;
    }

    // 2. Hydration 완료 후 로그인 상태 확인
    if (!isLoggedIn) {
      console.log(
        "DEBUG: hasHydrated is true, but not logged in. Redirecting to login."
      );
      alert(t("authRequired"));
      router.push("/login");
      setPageLoading(false);
      return;
    }

    // 3. 로그인 상태이면 (isLoggedIn === true), 사용자 정보 가져오기 시도
    console.log(
      "DEBUG: Logged in and hydrated. Attempting to fetch user info..."
    );
    async function fetchAndSetUserInfo() {
      try {
        // API 호출 결과의 타입을 AuthStoreUserInfo로 명시
        const response = await apiClient.get<AuthStoreUserInfo>("/users/me");
        console.log("DEBUG: /users/me API call successful:", response.data);
        // 로그인 시 userInfo가 없었다면 여기서 업데이트 (선택 사항)
        // useAuthStore.setState({ userInfo: response.data });

        setPageLoading(false);
      } catch (err: any) {
        console.error("ERROR: /users/me API call failed:", err);
        setPageLoading(false);

        if (err.response && err.response.status === 401) {
          console.warn(
            "WARN: 401 Unauthorized handled by apiClient interceptor."
          );
        } else {
          setError(
            t("fetchError", {
              errorDetail: err.message || err.response?.data?.detail,
            })
          );
        }
      }
    }

    fetchAndSetUserInfo();
  }, [hasHydrated, isLoggedIn, router, t]); // logout 제거

  // Hydration 중이거나 페이지 데이터 로딩 중
  if (!hasHydrated || pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] bg-background">
        <Spinner size="lg" />
        <p className="mt-4 text-lg text-muted-foreground">
          {t("loadingDashboard")}
        </p>
      </div>
    );
  }

  // 오류 발생 시
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] bg-background text-destructive-foreground">
        <p className="text-xl font-semibold">{t("errorTitle")}</p>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button onClick={() => router.push("/login")} className="mt-4">
          {t("loginAgain")}
        </Button>
      </div>
    );
  }

  // 모든 로딩 및 에러 처리 후 최종 렌더링
  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <section className="bg-card p-6 rounded-lg shadow-md border border-border">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {t("welcomeMessage", { email: userInfo?.email || "User" })}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-6">
            {t("dashboardOverview")}
          </p>

          <div className="mt-6 p-4 border border-border rounded-md bg-secondary/20">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3">
              {t("yourInfo")}
            </h2>
            <div className="space-y-2 text-muted-foreground text-sm sm:text-base">
              <p>
                <span className="font-medium">{t("idLabel")}:</span>{" "}
                {userInfo?.id}
              </p>
              <p>
                <span className="font-medium">{t("emailLabel")}:</span>{" "}
                {userInfo?.email}
              </p>
              <p>
                <span className="font-medium">{t("roleLabel")}:</span>{" "}
                {userInfo?.role || t("roleNotSet")}
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg shadow-md border border-border flex flex-col items-center justify-center min-h-[150px]">
              <h3 className="text-xl font-semibold text-foreground">
                {t("portfolioOverviewTitle")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("portfolioOverviewDescription")}
              </p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow-md border border-border flex flex-col items-center justify-center min-h-[150px]">
              <h3 className="text-xl font-semibold text-foreground">
                {t("activeBotsTitle")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("activeBotsDescription")}
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
