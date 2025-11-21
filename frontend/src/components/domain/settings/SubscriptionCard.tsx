"use client";

import { useTranslations } from "next-intl";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import {
  useCancelPlanChangeMutation,
  useCancelSubscriptionMutation,
} from "@/hooks/useSubscription";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/AlertDialog";
import {
  ArrowRight,
  CheckCircle,
  ExternalLink,
  CreditCard,
  X,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

export function SubscriptionCard() {
  const t = useTranslations("Dashboard.settings.subscription");
  const router = useRouter();
  const cancelPlanChangeMutation = useCancelPlanChangeMutation();
  const cancelSubscriptionMutation = useCancelSubscriptionMutation();
  const {
    user,
    currentPlan,
    status,
    endDate,
    features,
    subscription,
    isLoading,
  } = useUserSubscription();

  const handleChangeCard = async () => {
    if (!user) return;

    try {
      const clientKey = process.env.NEXT_PUBLIC_TOSS_BILLING_CLIENT_KEY!;
      const customerKey = String(user.id);

      const tossPayments = await loadTossPayments(clientKey);

      // [수정] payment 객체 생성
      const payment = tossPayments.payment({ customerKey });

      // [수정] payment 객체에서 requestBillingAuth 호출
      await payment.requestBillingAuth({
        method: "CARD", // 메서드 이름이 아니라 객체 속성으로 전달해야 할 수도 있습니다. 확인 필요하지만 PricingCard 참고함
        successUrl: `${window.location.origin}/payment/success-update-card?planId=${subscription?.planId}`,
        failUrl: `${window.location.origin}/payment/fail-update-card`,
        customerEmail: user.email,
        customerName: user.username || user.email,
      });
    } catch (error) {
      console.error("Failed to request billing auth:", error);
    }
  };

  const handleCancelPlanChange = () => {
    cancelPlanChangeMutation.mutate();
  };

  const handleCancelSubscription = () => {
    cancelSubscriptionMutation.mutate();
  };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="bg-card border rounded-lg">
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center p-4 border rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">{t("currentPlan")}</p>
            <p className="text-xl font-bold">{currentPlan}</p>

            {/* 다운그레이드 예약 표시 */}
            {subscription?.nextPlan && (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <ArrowRight className="h-4 w-4" />
                  <span>
                    {t("scheduledChange", {
                      planName: subscription.nextPlan.name,
                    })}
                  </span>
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t("cancelScheduledChange")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("cancelConfirmTitle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("cancelConfirmDescription", {
                          currentPlan: currentPlan,
                          nextPlan: subscription.nextPlan.name,
                        })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("cancelConfirmCancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelPlanChange}>
                        {t("cancelConfirmButton")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
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
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/pricing")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("changePlanButton")}
          </Button>

          {/* 카드 등록된 경우에만 카드 변경 버튼 표시 */}
          {subscription?.paymentGatewayCustomerKey && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleChangeCard}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {t("changeCardButton")}
            </Button>
          )}
        </div>

        {/* Basic 플랜이 아닌 경우 구독 해지 버튼 표시 */}
        {currentPlan !== "Basic" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full mt-2">
                <X className="mr-2 h-4 w-4" />
                {t("cancelSubscription.button")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("cancelSubscription.confirmTitle")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("cancelSubscription.confirmDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("cancelConfirmCancel")}
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelSubscription}>
                  {t("cancelSubscription.confirmButton")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
