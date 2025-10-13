// file: src/components/domain/dashboard/AccountSettingsTab.tsx
"use client";

import { useTranslations } from "next-intl";
import { ChangePasswordForm } from "@/components/domain/settings/ChangePasswordForm";
import { SubscriptionCard } from "@/components/domain/settings/SubscriptionCard";
import { NotificationSettingsCard } from "@/components/domain/settings/NotificationSettingsCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { DangerZoneCard } from "../settings/DangerZoneCard";

export function AccountSettingsTab() {
  const t = useTranslations("Dashboard.settings");

  return (
    <div className="space-y-8">
      {/* 1. 구독 관리 카드 */}
      <SubscriptionCard />

      {/* 2. 알림 설정 카드 */}
      <NotificationSettingsCard />

      {/* 3. 비밀번호 변경 카드 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("password.title")}</CardTitle>
          <CardDescription>{t("password.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      {/* 4. 계정 삭제 등 위험 구역 카드 */}
      <DangerZoneCard />
    </div>
  );
}
