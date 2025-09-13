"use client";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
// 예시: 비밀번호 변경 컴포넌트
import { ChangePasswordForm } from "@/components/domain/settings/ChangePasswordForm";
// 예시: API 키 관리 컴포넌트
import { ApiKeyManager } from "@/components/domain/settings/ApiKeyManager";

export function AccountSettingsTab() {
  const t = useTranslations("Dashboard.settings");

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("password.title")}</CardTitle>
          <CardDescription>{t("password.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("apiKeys.title")}</CardTitle>
          <CardDescription>{t("apiKeys.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyManager />
        </CardContent>
      </Card>
      {/* 구독 관리, 계정 삭제 등 추가 가능 */}
    </div>
  );
}
