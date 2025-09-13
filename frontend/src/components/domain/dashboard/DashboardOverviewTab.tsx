"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/userStore";
import apiClient from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Package,
  TrendingUp,
  BarChart2,
  Zap,
  Hourglass,
  CheckCircle,
  Clock,
  Calendar,
  DollarSign,
  Wallet,
  Activity,
  Code,
  KeyRound,
  Bot,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";

interface UserDashboardSummary {
  email: string;
  username: string | null;
  userId: number;
  createdAt: string; // ISO 8601 string
  isEmailVerified: boolean;

  currentPlanName: string;
  currentPlanPrice: number;
  subscriptionEndDate: string | null; // ISO 8601 string
  subscriptionIsActive: boolean;
  maxBacktestsPerDay: number;
  concurrentBotsLimit: number;
  allowedTimeframes: string[];

  totalBacktestsRunByUser: number;
  successfulBacktestsByUser: number;

  totalLiveBotsByUser: number;
  activeLiveBotsByUser: number;

  latestBacktests: Array<{
    id: number;
    status: string;
    createdAt: string;
    strategy: { name: string };
  }>;
  latestLiveBots: Array<{
    id: number;
    status: string;
    startedAt: string;
    strategy: { name: string };
    apiKey: { exchange: string };
  }>;
}

const fetchUserDashboardSummary = async (): Promise<UserDashboardSummary> => {
  const { data } = await apiClient.get("/users/me/dashboard_summary");
  return data;
};

export function DashboardOverviewTab() {
  const t = useTranslations("Dashboard.overview");
  const { user } = useUserStore();
  const router = useRouter();

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
  } = useQuery<UserDashboardSummary, Error>({
    queryKey: ["userDashboardSummary", user?.id],
    queryFn: fetchUserDashboardSummary,
    enabled: !!user?.id && user?.role === "user",
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
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center text-muted-foreground">
        <p>{t("noDataAvailable")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {t("welcomeMessage", { email: dashboardData.email })}
        </h1>
        <p className="mt-2 text-base text-muted-foreground sm:text-lg">
          {t("userDashboardOverview")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-3 text-xl font-semibold text-foreground">
            {t("yourInfo")}
          </h3>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("emailLabel")}:
            </span>{" "}
            {dashboardData.email}{" "}
            {dashboardData.isEmailVerified ? (
              <CheckCircle size={16} className="inline text-green-500" />
            ) : (
              <span className="text-red-500">({t("unverified")})</span>
            )}
          </p>
          {dashboardData.username && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("usernameLabel")}:
              </span>{" "}
              {dashboardData.username}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("memberSince")}:
            </span>{" "}
            {new Date(dashboardData.createdAt).toLocaleDateString()}
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="mb-3 text-xl font-semibold text-foreground">
            {t("subscriptionInfo")}
          </h3>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("currentPlan")}:
            </span>{" "}
            <span className="font-bold text-primary">
              {dashboardData.currentPlanName}
            </span>{" "}
            (
            {dashboardData.currentPlanPrice > 0
              ? `$${dashboardData.currentPlanPrice.toFixed(2)}/월`
              : t("free")}
            )
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("subscriptionStatus")}:
            </span>{" "}
            <span
              className={
                dashboardData.subscriptionIsActive
                  ? "text-green-500 font-bold"
                  : "text-red-500 font-bold"
              }
            >
              {dashboardData.subscriptionIsActive ? t("active") : t("inactive")}
            </span>
          </p>
          {dashboardData.subscriptionEndDate && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("subscriptionEndDate")}:
              </span>{" "}
              {new Date(dashboardData.subscriptionEndDate).toLocaleDateString()}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("backtestLimit")}:
            </span>{" "}
            {dashboardData.maxBacktestsPerDay} {t("timesPerDay")}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("concurrentBotsLimit")}:
            </span>{" "}
            {dashboardData.concurrentBotsLimit} {t("bots")}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {t("allowedTimeframes")}:
            </span>{" "}
            {dashboardData.allowedTimeframes.join(", ")}
          </p>
          <Button
            variant="outline"
            className="mt-4 w-full"
            onClick={() => router.push("/pricing")}
          >
            {t("manageSubscription")}
          </Button>
        </Card>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("totalBacktests")}
          value={dashboardData.totalBacktestsRunByUser}
          icon={<BarChart2 className="text-blue-500" />}
        />
        <StatCard
          title={t("successfulBacktests")}
          value={dashboardData.successfulBacktestsByUser}
          icon={<CheckCircle className="text-green-500" />}
        />
        <StatCard
          title={t("totalLiveBots")}
          value={dashboardData.totalLiveBotsByUser}
          icon={<Bot className="text-red-500" />}
        />
        <StatCard
          title={t("activeLiveBots")}
          value={dashboardData.activeLiveBotsByUser}
          icon={<Zap className="text-yellow-500" />}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {dashboardData.latestBacktests?.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 text-xl font-semibold text-foreground">
              {t("latestBacktests")}
            </h3>
            <ul className="space-y-3">
              {dashboardData.latestBacktests.map((bt) => (
                <li
                  key={bt.id}
                  className="flex items-center justify-between text-sm text-muted-foreground"
                >
                  <div className="flex items-center">
                    <BarChart2 size={16} className="mr-2 text-blue-400" />
                    <span className="font-medium text-foreground">
                      {bt.strategy?.name || t("unknownStrategy")}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({bt.status})
                    </span>
                  </div>
                  <span className="text-xs">
                    {new Date(bt.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              variant="link"
              className="mt-3 px-0 text-primary"
              onClick={() => router.push("/backtests")}
            >
              {t("viewAllBacktests")}
            </Button>
          </Card>
        )}

        {dashboardData.latestLiveBots?.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-4 text-xl font-semibold text-foreground">
              {t("latestLiveBots")}
            </h3>
            <ul className="space-y-3">
              {dashboardData.latestLiveBots.map((bot) => (
                <li
                  key={bot.id}
                  className="flex items-center justify-between text-sm text-muted-foreground"
                >
                  <div className="flex items-center">
                    <Bot size={16} className="mr-2 text-red-400" />
                    <span className="font-medium text-foreground">
                      {bot.strategy?.name || t("unknownStrategy")}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({bot.apiKey?.exchange || t("unknownExchange")})
                    </span>
                  </div>
                  <span className="text-xs">{bot.status}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="link"
              className="mt-3 px-0 text-primary"
              onClick={() => router.push("/live-bots")}
            >
              {t("viewAllLiveBots")}
            </Button>
          </Card>
        )}
      </div>

      <div className="mt-8 text-center">
        <h3 className="mb-4 text-xl font-semibold text-foreground">
          {t("quickLinks")}
        </h3>
        <div className="flex justify-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push("/settings/keys")}
          >
            <KeyRound className="mr-2 h-4 w-4" /> {t("manageApiKeys")}
          </Button>
          <Button onClick={() => router.push("/strategies/new")}>
            <Code className="mr-2 h-4 w-4" /> {t("createNewStrategy")}
          </Button>
        </div>
      </div>
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
