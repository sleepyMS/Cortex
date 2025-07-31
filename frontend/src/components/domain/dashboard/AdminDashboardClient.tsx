// frontend/src/components/domain/dashboard/AdminDashboardClient.tsx

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
import { AxiosError } from "axios"; // 👈 AxiosError 임포트

// 백엔드 schemas.DashboardSummary와 일치하도록 타입 정의를 확장합니다.
interface DashboardSummary {
  total_users: number;
  active_users: number;
  total_strategies: number;
  public_strategies: number;
  total_backtests_run: number;
  total_successful_backtests: number;
  total_live_bots: number;
  active_live_bots: number;
  overall_pnl: number;
  latest_signups: Array<{
    id: number;
    email: string;
    username: string | null;
    created_at: string;
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
    // 👈 error 타입을 AxiosError로 명시
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
    // 👈 error가 AxiosError 타입임을 확실히 알 수 있음
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
            value={dashboardData.total_users}
            icon={<Users className="text-primary" />}
          />
          <StatCard
            title={t("activeUsers")}
            value={dashboardData.active_users}
            icon={<CheckCircle className="text-green-500" />}
          />
          <StatCard
            title={t("totalStrategies")}
            value={dashboardData.total_strategies}
            icon={<BarChart2 className="text-blue-500" />}
          />
          <StatCard
            title={t("publicStrategies")}
            value={dashboardData.public_strategies}
            icon={<Hash className="text-indigo-500" />}
          />
          <StatCard
            title={t("totalBacktestsRun")}
            value={dashboardData.total_backtests_run}
            icon={<TrendingUp className="text-yellow-500" />}
          />
          <StatCard
            title={t("totalSuccessfulBacktests")}
            value={dashboardData.total_successful_backtests}
            icon={<CheckCircle className="text-purple-500" />}
          />
          <StatCard
            title={t("totalLiveBots")}
            value={dashboardData.total_live_bots}
            icon={<Bot className="text-red-500" />}
          />
          <StatCard
            title={t("activeLiveBots")}
            value={dashboardData.active_live_bots}
            icon={<Bot className="text-teal-500" />}
          />
          <StatCard
            title={t("overallPnl")}
            value={`$${dashboardData.overall_pnl.toFixed(2)}`}
            icon={<TrendingUp className="text-green-600" />}
          />
        </div>

        {dashboardData.latest_signups &&
          dashboardData.latest_signups.length > 0 && (
            <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-md">
              <h3 className="mb-4 text-xl font-semibold text-foreground">
                {t("latestSignups")}
              </h3>
              <ul className="space-y-2">
                {dashboardData.latest_signups.map((user_signup) => (
                  <li
                    key={user_signup.id}
                    className="flex items-center justify-between text-muted-foreground text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {user_signup.username || user_signup.email}
                    </span>
                    <span className="text-xs">
                      {new Date(user_signup.created_at).toLocaleDateString()}
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
