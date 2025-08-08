"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/userStore";
import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Users,
  Bot,
  TrendingUp,
  BarChart2,
  Hash,
  CheckCircle,
} from "lucide-react";
import { AxiosError } from "axios";

// 👈 1. 백엔드 API 응답(camelCase)과 일치하도록 타입 정의 수정
interface DashboardSummary {
  totalUsers: number;
  activeUsers: number;
  totalStrategies: number;
  publicStrategies: number;
  totalBacktestsRun: number;
  totalSuccessfulBacktests: number;
  totalLiveBots: number;
  activeLiveBots: number;
  overallPnl: number;
  latestSignups: Array<{
    id: number;
    email: string;
    username: string | null;
    createdAt: string;
  }>;
}

// TanStack Query와 함께 사용할 데이터 페칭 함수
const fetchAdminDashboardSummary = async (): Promise<DashboardSummary> => {
  const { data } = await apiClient.get("/admin/dashboard_summary");
  return data;
};

export function AdminDashboardClient() {
  const t = useTranslations("Dashboard");
  const { user } = useUserStore();

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
  } = useQuery<DashboardSummary, AxiosError>({
    queryKey: ["adminDashboardSummary"],
    queryFn: fetchAdminDashboardSummary,
    enabled: user?.role === "admin",
  });

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
        <p className="ml-4 text-muted-foreground">{t("loadingDashboard")}</p>
      </div>
    );
  }

  if (isError) {
    if (error.response?.status === 403) {
      return (
        <div className="container mx-auto max-w-5xl px-4 py-8 text-center">
          <h1 className="text-3xl font-bold text-destructive mb-4">
            {t("accessDeniedTitle")}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("accessDeniedMessage")}
          </p>
          <Button onClick={() => (window.location.href = "/")}>
            {t("goToHomepage")}
          </Button>
        </div>
      );
    }
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 text-destructive-foreground text-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">
          {t("errorTitle")}
        </h1>
        <p className="mb-2">
          {t("fetchError", { errorDetail: error.message })}
        </p>
        <p className="text-sm text-muted-foreground">{t("tryAgainLater")}</p>
      </div>
    );
  }

  if (!dashboardData) {
    if (user?.role !== "admin") {
      return (
        <div className="container mx-auto max-w-5xl px-4 py-8 text-center">
          <h1 className="text-3xl font-bold text-destructive mb-4">
            {t("accessDeniedTitle")}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("accessDeniedMessage")}
          </p>
          <Button onClick={() => (window.location.href = "/")}>
            {t("goToHomepage")}
          </Button>
        </div>
      );
    }
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center text-muted-foreground">
        <p>{t("noDataAvailable")}</p>
      </div>
    );
  }

  // 👈 2. JSX 내부에서 dashboardData의 모든 속성을 camelCase로 접근하도록 수정
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <section className="rounded-lg border border-border bg-card p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
          {t("welcomeAdminMessage", { email: user?.email || "Admin" })}
        </h1>
        <p className="mb-6 text-base text-muted-foreground sm:text-lg">
          {t("adminDashboardOverview")}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title={t("totalUsers")}
            value={dashboardData.totalUsers}
            icon={<Users className="text-primary" />}
          />
          <StatCard
            title={t("activeUsers")}
            value={dashboardData.activeUsers}
            icon={<CheckCircle className="text-green-500" />}
          />
          <StatCard
            title={t("totalStrategies")}
            value={dashboardData.totalStrategies}
            icon={<BarChart2 className="text-blue-500" />}
          />
          <StatCard
            title={t("publicStrategies")}
            value={dashboardData.publicStrategies}
            icon={<Hash className="text-indigo-500" />}
          />
          <StatCard
            title={t("totalBacktestsRun")}
            value={dashboardData.totalBacktestsRun}
            icon={<TrendingUp className="text-yellow-500" />}
          />
          <StatCard
            title={t("totalSuccessfulBacktests")}
            value={dashboardData.totalSuccessfulBacktests}
            icon={<CheckCircle className="text-purple-500" />}
          />
          <StatCard
            title={t("totalLiveBots")}
            value={dashboardData.totalLiveBots}
            icon={<Bot className="text-red-500" />}
          />
          <StatCard
            title={t("activeLiveBots")}
            value={dashboardData.activeLiveBots}
            icon={<Bot className="text-teal-500" />}
          />
          <StatCard
            title={t("overallPnl")}
            value={`$${dashboardData.overallPnl.toFixed(2)}`}
            icon={<TrendingUp className="text-green-600" />}
          />
        </div>

        {dashboardData.latestSignups &&
          dashboardData.latestSignups.length > 0 && (
            <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-md">
              <h3 className="mb-4 text-xl font-semibold text-foreground">
                {t("latestSignups")}
              </h3>
              <ul className="space-y-2">
                {dashboardData.latestSignups.map((userSignup) => (
                  <li
                    key={userSignup.id}
                    className="flex items-center justify-between text-muted-foreground text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {userSignup.username || userSignup.email}
                    </span>
                    <span className="text-xs">
                      {new Date(userSignup.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
      </section>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
    </Card>
  );
}
