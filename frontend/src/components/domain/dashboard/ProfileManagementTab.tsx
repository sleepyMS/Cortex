"use client";

import { useTranslations } from "next-intl";
import { useUserStore } from "@/store/userStore";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { useRouter } from "@/i18n/navigation";
import { Link } from "lucide-react";

export function ProfileManagementTab() {
  const t = useTranslations("Dashboard.profile");
  const { user } = useUserStore();
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`/profile/${user?.username}`)}
          >
            <Link className="mr-2 h-4 w-4" />
            {t("viewPublicProfile")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username">{t("usernameLabel")}</Label>
          <Input id="username" defaultValue={user?.username || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">{t("bioLabel")}</Label>
          <Textarea id="bio" placeholder={t("bioPlaceholder")} rows={4} />
        </div>
        {/* 아바타 업로드, 소셜 링크 등 추가 가능 */}
        <div className="flex justify-end">
          <Button>{t("saveChanges")}</Button>
        </div>
      </CardContent>
    </Card>
  );
}
