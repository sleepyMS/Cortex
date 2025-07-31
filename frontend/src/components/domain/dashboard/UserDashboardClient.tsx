// frontend/src/components/domain/dashboard/UserDashboardClient.tsx

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
} from "lucide-react"; // 아이콘 임포트

// 백엔드 schemas.UserDashboardSummary와 일치하도록 타입 정의를 확장합니다.
// (backend/app/schemas.py의 UserDashboardSummary 스키마 참조)
interface UserDashboardSummary {
  email: string;
  username: string | null;
  user_id: number;
  created_at: string; // ISO 8601 string
  is_email_verified: boolean;

  current_plan_name: string;
  current_plan_price: number;
  subscription_end_date: string | null; // ISO 8601 string
  subscription_is_active: boolean;
  max_backtests_per_day: number;
  concurrent_bots_limit: number;
  allowed_timeframes: string[];

  total_backtests_run_by_user: number;
  successful_backtests_by_user: number;

  total_live_bots_by_user: number;
  active_live_bots_by_user: number;

  latest_backtests: Array<{
    id: number;
    name: string; // StrategyBase.name
    status: string;
    created_at: string;
    strategy: { name: string }; // StrategyBase
  }>;
  latest_live_bots: Array<{
    id: number;
    status: string;
    started_at: string;
    strategy: { name: string }; // StrategyBase
    api_key: { exchange: string }; // ApiKeyResponse
  }>;
}

// 데이터를 페칭하는 함수
const fetchUserDashboardSummary = async (): Promise<UserDashboardSummary> => {
  // 👈 일반 사용자 대시보드 API 엔드포인트 호출
  const { data } = await apiClient.get("/users/me/dashboard_summary");
  return data;
};

export function UserDashboardClient() {
  const t = useTranslations("Dashboard");
  const { user } = useUserStore(); // 전역 스토어에서 사용자 정보를 읽습니다.

  // TanStack Query를 사용하여 사용자 대시보드 데이터를 가져옵니다.
  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
  } = useQuery<UserDashboardSummary, Error>({
    queryKey: ["userDashboardSummary", user?.id], // 사용자 ID별로 캐시 키 분리
    queryFn: fetchUserDashboardSummary,
    enabled: !!user?.id && user?.role === "user", // 👈 로그인한 'user' 역할일 때만 쿼리 실행
  });

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
        <p className="ml-4 text-muted-foreground">{t("loadingDashboard")}</p>
      </div>
    );
  }

  // 에러 상태 처리
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

  // 데이터가 없거나, 일반 사용자가 아닌 경우 (UserDashboardClient는 일반 사용자 전용이므로)
  if (!dashboardData) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center text-muted-foreground">
        <p>{t("noDataAvailable")}</p>
      </div>
    );
  }

  // 성공 상태 처리 (일반 사용자 대시보드 렌더링)
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <section className="rounded-lg border border-border bg-card p-6 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
          {t("welcomeMessage", { email: dashboardData.email })}
        </h1>
        <p className="mb-6 text-base text-muted-foreground sm:text-lg">
          {t("userDashboardOverview")}
        </p>

        {/* 사용자 정보 및 구독 섹션 */}
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
              {dashboardData.is_email_verified ? (
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
              {new Date(dashboardData.created_at).toLocaleDateString()}
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
                {dashboardData.current_plan_name}
              </span>{" "}
              (
              {dashboardData.current_plan_price > 0
                ? `$${dashboardData.current_plan_price.toFixed(2)}/월`
                : t("free")}
              )
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("subscriptionStatus")}:
              </span>{" "}
              <span
                className={
                  dashboardData.subscription_is_active
                    ? "text-green-500 font-bold"
                    : "text-red-500 font-bold"
                }
              >
                {dashboardData.subscription_is_active
                  ? t("active")
                  : t("inactive")}
              </span>
            </p>
            {dashboardData.subscription_end_date && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {t("subscriptionEndDate")}:
                </span>{" "}
                {new Date(
                  dashboardData.subscription_end_date
                ).toLocaleDateString()}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("backtestLimit")}:
              </span>{" "}
              {dashboardData.max_backtests_per_day} {t("timesPerDay")}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("concurrentBotsLimit")}:
              </span>{" "}
              {dashboardData.concurrent_bots_limit} {t("bots")}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {t("allowedTimeframes")}:
              </span>{" "}
              {dashboardData.allowed_timeframes.join(", ")}
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => (window.location.href = "/pricing")}
            >
              {t("manageSubscription")}
            </Button>
          </Card>
        </div>

        {/* 통계 요약 섹션 */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title={t("totalBacktests")}
            value={dashboardData.total_backtests_run_by_user}
            icon={<BarChart2 className="text-blue-500" />}
          />
          <StatCard
            title={t("successfulBacktests")}
            value={dashboardData.successful_backtests_by_user}
            icon={<CheckCircle className="text-green-500" />}
          />
          <StatCard
            title={t("totalLiveBots")}
            value={dashboardData.total_live_bots_by_user}
            icon={<Bot className="text-red-500" />}
          />
          <StatCard
            title={t("activeLiveBots")}
            value={dashboardData.active_live_bots_by_user}
            icon={<Zap className="text-yellow-500" />}
          />
        </div>

        {/* 최근 활동 섹션 */}
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {dashboardData.latest_backtests &&
            dashboardData.latest_backtests.length > 0 && (
              <Card className="p-6">
                <h3 className="mb-4 text-xl font-semibold text-foreground">
                  {t("latestBacktests")}
                </h3>
                <ul className="space-y-3">
                  {dashboardData.latest_backtests.map((bt) => (
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
                        {new Date(bt.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="link"
                  className="mt-3 px-0 text-primary"
                  onClick={() => (window.location.href = "/backtests")}
                >
                  {t("viewAllBacktests")}
                </Button>
              </Card>
            )}

          {dashboardData.latest_live_bots &&
            dashboardData.latest_live_bots.length > 0 && (
              <Card className="p-6">
                <h3 className="mb-4 text-xl font-semibold text-foreground">
                  {t("latestLiveBots")}
                </h3>
                <ul className="space-y-3">
                  {dashboardData.latest_live_bots.map((bot) => (
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
                          ({bot.api_key?.exchange || t("unknownExchange")})
                        </span>
                      </div>
                      <span className="text-xs">{bot.status}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="link"
                  className="mt-3 px-0 text-primary"
                  onClick={() => (window.location.href = "/live-bots")}
                >
                  {t("viewAllLiveBots")}
                </Button>
              </Card>
            )}
        </div>

        {/* 기타 빠른 링크 (예: API 키 관리, 전략 생성) */}
        <div className="mt-8 text-center">
          <h3 className="mb-4 text-xl font-semibold text-foreground">
            {t("quickLinks")}
          </h3>
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/settings/keys")}
            >
              <KeyRound className="mr-2 h-4 w-4" /> {t("manageApiKeys")}
            </Button>
            <Button onClick={() => (window.location.href = "/strategies/new")}>
              <Code className="mr-2 h-4 w-4" /> {t("createNewStrategy")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

// 통계 카드 컴포넌트 (DashboardClient.tsx에서 가져옴)
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
