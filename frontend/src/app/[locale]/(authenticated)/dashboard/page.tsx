// file: frontend/src/app/[locale]/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { DashboardHeader } from "@/components/domain/dashboard/DashboardHeader";
import { DashboardOverviewTab } from "@/components/domain/dashboard/DashboardOverviewTab";
import { AssetManagementTab } from "@/components/domain/dashboard/AssetManagementTab";
import { ProfileManagementTab } from "@/components/domain/dashboard/ProfileManagementTab";
import { AccountSettingsTab } from "@/components/domain/dashboard/AccountSettingsTab";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { ApiKeyManagerTab } from "@/components/domain/dashboard/ApiKeyManagerTab";

export default function DashboardPage() {
  const t = useTranslations("Dashboard.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab") || "overview";

  // 현재 활성 탭을 관리하기 위한 state를 선언합니다.
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // URL의 탭 값이 변경될 때(예: 헤더 메뉴 클릭), state를 동기화합니다.
  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  // 사용자가 탭을 직접 클릭했을 때 URL도 함께 변경하는 핸들러
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // URL을 변경하지만 페이지를 새로고침하지는 않습니다.
    router.push(`${pathname}?tab=${value}`);
  };

  return (
    <div className="container mx-auto max-w-screen-xl px-4 py-8 space-y-8">
      <DashboardHeader
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="assets">{t("assets")}</TabsTrigger>
          <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
          <TabsTrigger value="apiKeys">{t("apiKeys")}</TabsTrigger>
          <TabsTrigger value="settings">{t("settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <DashboardOverviewTab />
        </TabsContent>
        <TabsContent value="assets" className="mt-6">
          <AssetManagementTab />
        </TabsContent>
        <TabsContent value="profile" className="mt-6">
          <ProfileManagementTab />
        </TabsContent>
        <TabsContent value="apiKeys" className="mt-6">
          <ApiKeyManagerTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <AccountSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
