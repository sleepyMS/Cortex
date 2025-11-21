"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

const NotificationItem = ({
  id,
  label,
  description,
}: {
  id: string;
  label: string;
  description: string;
}) => (
  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
    <div className="flex-grow">
      <Label htmlFor={id} className="font-medium">
        {label}
      </Label>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <Switch id={id} />
  </div>
);

export function NotificationSettingsCard() {
  const t = useTranslations("Dashboard.settings.notifications");

  return (
    <div className="bg-card border rounded-lg">
      <div className="p-6 space-y-4">
        <NotificationItem
          id="bot-trades"
          label={t("botTrades.label")}
          description={t("botTrades.description")}
        />
        <NotificationItem
          id="community-comments"
          label={t("communityComments.label")}
          description={t("communityComments.description")}
        />
        <NotificationItem
          id="billing-reminders"
          label={t("billingReminders.label")}
          description={t("billingReminders.description")}
        />
        <div className="flex justify-end pt-2">
          <Button>{t("saveButton")}</Button>
        </div>
      </div>
    </div>
  );
}
