"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/userStore"; // 스토어 이름은 프로젝트에 맞게 수정
import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

// 대시보드 데이터 타입을 정의합니다.
interface DashboardSummary {
  activeBotsCount: number;
  totalProfitLoss: number;
  recentBacktests: any[];
}

// TanStack Query와 함께 사용할 데이터 페칭 함수
const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const { data } = await apiClient.get("/dashboard/summary"); // 예시 API 엔드포인트
  return data;
};

export function DashboardClient() {
  const t = useTranslations("Dashboard");
  // 전역 스토어에서 이미 가져온 사용자 정보를 읽기만 합니다.
  const { user } = useUserStore();

  // TanStack Query를 사용하여 대시보드 데이터를 가져옵니다.
  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
  } = useQuery<DashboardSummary, Error>({
    queryKey: ["dashboardSummary"], // 이 쿼리의 고유 키
    queryFn: fetchDashboardSummary, // 데이터를 가져올 함수
  });

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
        <p className="ml-4">{t("loadingDashboard")}</p>
      </div>
    );
  }

  // 에러 상태 처리
  if (isError) {
    return (
      <div className="text-destructive-foreground">
        <p>{t("fetchError", { errorDetail: error.message })}</p>
      </div>
    );
  }

  // 성공 상태 처리
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <section className="rounded-lg border border-border bg-card p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
          {t("welcomeMessage", { email: user?.email || "User" })}
        </h1>
        <p className="mb-6 text-base text-muted-foreground sm:text-lg">
          {t("dashboardOverview")}
        </p>

        {/* 사용자 정보 섹션 */}
        <div className="mt-6 rounded-md border border-border bg-secondary/20 p-4">
          <h2 className="mb-3 text-lg font-semibold text-foreground sm:text-xl">
            {t("yourInfo")}
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground sm:text-base">
            <p>
              <span className="font-medium">{t("emailLabel")}:</span>{" "}
              {user?.email}
            </p>
          </div>
        </div>

        {/* 대시보드 데이터 섹션 */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 shadow-md">
            <h3 className="text-xl font-semibold text-foreground">
              {t("activeBotsTitle")}
            </h3>
            <p className="mt-2 text-4xl font-bold">
              {dashboardData?.activeBotsCount}
            </p>
          </div>
          {/* 다른 데이터 카드들... */}
        </div>
      </section>
    </div>
  );
}
