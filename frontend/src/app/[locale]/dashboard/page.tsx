// frontend/src/app/[locale]/dashboard/page.tsx

"use client";

import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/userStore"; // userStore 임포트
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { AdminDashboardClient } from "@/components/domain/dashboard/AdminDashboardClient";
import { UserDashboardClient } from "@/components/domain/dashboard/UserDashboardClient";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const { user } = useUserStore();
  const { isLoading: isUserSubscriptionLoading } = useUserSubscription();

  // 사용자 정보 로딩 중일 때
  // useUserSubscription의 로딩 상태를 사용합니다.
  if (isUserSubscriptionLoading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Spinner size="lg" />
        <p className="ml-4 text-muted-foreground">{t("loadingDashboard")}</p>
      </div>
    );
  }

  // 사용자 정보가 없거나, 로그인하지 않은 경우 (AuthGuard가 막겠지만, 방어적 코드)
  if (!user) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          {t("authRequiredTitle")}
        </h1>
        <p className="text-muted-foreground mb-6">{t("authRequiredMessage")}</p>
        <Button onClick={() => (window.location.href = "/login")}>
          {t("loginButton")}
        </Button>
      </div>
    );
  }

  // 사용자의 역할에 따라 대시보드 컴포넌트 렌더링
  if (user.role === "admin") {
    return <AdminDashboardClient />;
  } else if (
    user.role === "user" ||
    user.role === "pro" ||
    user.role === "trader"
  ) {
    return <UserDashboardClient />;
  } else {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">
          {t("unknownRoleTitle")}
        </h1>
        <p className="text-muted-foreground mb-6">{t("unknownRoleMessage")}</p>
        <Button onClick={() => (window.location.href = "/")}>
          {t("goToHomepage")}
        </Button>
      </div>
    );
  }
}
