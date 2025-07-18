// file: frontend/src/app/[locale]/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Spinner";
// Header는 RootLayout에서 이미 포함되므로 여기서 임포트하지 않습니다.
// import Header from '@/components/layout/Header';
import { Button } from "@/components/ui/Button"; // Button 컴포넌트 임포트

// 사용자 정보의 타입을 정의합니다. (schemas.ts 파일에 정의될 User 스키마와 일치해야 합니다)
interface UserInfo {
  id: number;
  email: string;
  role: string;
  // TODO: 필요에 따라 다른 사용자 정보 필드 추가 (예: subscription)
}

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const response = await apiClient.get<UserInfo>("/users/me"); // /api/users/me 호출
        setUserInfo(response.data);
        setLoading(false);
      } catch (err: any) {
        setLoading(false);
        // 401 Unauthorized 에러는 토큰이 없거나 만료되었을 가능성이 높으므로 로그인 페이지로 리디렉션
        if (err.response && err.response.status === 401) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          alert(t("authRequired"));
          router.push("/login");
        } else {
          setError(
            t("fetchError", {
              errorDetail: err.message || err.response?.data?.detail,
            })
          );
        }
      }
    }

    if (!localStorage.getItem("accessToken")) {
      alert(t("authRequired"));
      router.push("/login");
      setLoading(false);
    } else {
      fetchUserInfo();
    }
  }, [router, t]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] bg-background">
        <Spinner size="lg" />
        <p className="mt-4 text-lg text-muted-foreground">
          {t("loadingDashboard")}
        </p>
      </div>
    );
  }

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

  return (
    <>
      {/* Header는 RootLayout에서 이미 추가되므로 여기서 추가하지 않습니다. */}
      {/* <Header /> */}

      {/* main 태그에 max-w-5xl 및 mx-auto를 추가하여 Header, Footer와 너비 일관성을 맞춥니다. */}
      {/* px-4는 모바일 기본 패딩, sm:px-6 md:px-8 등으로 확장 가능 */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {" "}
        {/* 메인 콘텐츠 컨테이너 */}
        {/* <Sidebar /> {/* Sidebar는 필요에 따라 주석 해제 후 구현 */}
        <section className="bg-card p-6 rounded-lg shadow-md border border-border">
          {" "}
          {/* 섹션에 border 추가 */}
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            {t("welcomeMessage", { email: userInfo?.email || "User" })}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-6">
            {t("dashboardOverview")}
          </p>
          {/* 회원 정보 섹션 */}
          <div className="mt-6 p-4 border border-border rounded-md bg-secondary/20">
            {" "}
            {/* 배경색 추가 */}
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
          {/* TODO: 여기에 PortfolioOverview, ActiveBotCard 등 대시보드 핵심 컴포넌트 배치 */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 예시: PortfolioOverview 카드 자리 */}
            <div className="bg-card p-6 rounded-lg shadow-md border border-border flex flex-col items-center justify-center min-h-[150px]">
              <h3 className="text-xl font-semibold text-foreground">
                {t("portfolioOverviewTitle")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("portfolioOverviewDescription")}
              </p>
              {/* 실제 PortfolioOverview 컴포넌트가 들어갈 자리 */}
            </div>

            {/* 예시: ActiveBotCard 자리 */}
            <div className="bg-card p-6 rounded-lg shadow-md border border-border flex flex-col items-center justify-center min-h-[150px]">
              <h3 className="text-xl font-semibold text-foreground">
                {t("activeBotsTitle")}
              </h3>
              <p className="text-muted-foreground mt-2">
                {t("activeBotsDescription")}
              </p>
              {/* 실제 ActiveBotCard 컴포넌트가 들어갈 자리 */}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
