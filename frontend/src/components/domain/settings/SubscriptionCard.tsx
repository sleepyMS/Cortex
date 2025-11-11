"use client";

import { useTranslations } from "next-intl";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { CheckCircle, ExternalLink } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

export function SubscriptionCard() {
  const t = useTranslations("Dashboard.settings.subscription");
  const router = useRouter();
  const { currentPlan, status, endDate, features, isLoading } =
    useUserSubscription();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center p-4 border rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">{t("currentPlan")}</p>
            <p className="text-xl font-bold">{currentPlan}</p>
          </div>
          <Badge variant={status === "active" ? "default" : "destructive"}>
            {/* @ts-expect-error */}
            {t(status)}
          </Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("endDate")}</span>
            <span className="font-medium">
              {endDate
                ? new Date(endDate).toLocaleDateString()
                : t("notApplicable")}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("dailyBacktests")}</span>
            <span className="font-medium">
              {features?.dailyBacktestCount ?? "N/A"}
            </span>
          </div>
        </div>
        <div className="flex gap-4 pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/pricing")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("changePlanButton")}
          </Button>
          {/* 실제 결제 포탈이 있다면 아래 버튼을 활성화합니다. */}
          {/* <Button variant="outline" className="w-full">{t("billingHistoryButton")}</Button> */}
        </div>
      </CardContent>
    </Card>
  );
}
