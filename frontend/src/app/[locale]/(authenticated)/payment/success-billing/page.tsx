"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSubscriptionCheckoutMutation } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslations } from "next-intl";

export default function PaymentSuccessBillingPage() {
  const t = useTranslations("PaymentResult");
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutMutation = useSubscriptionCheckoutMutation();
  const hasMutated = useRef(false);

  useEffect(() => {
    if (hasMutated.current) return;

    const authKey = searchParams.get("authKey");
    const planId = searchParams.get("planId");

    if (!authKey || !planId) {
      toast.error(t("invalidAccess"));
      router.push("/pricing");
      return;
    }

    (async () => {
      hasMutated.current = true;
      try {
        await checkoutMutation.mutateAsync({ authKey, planId });
        toast.success(t("billing.successToast"));
        router.push("/dashboard");
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.detail ||
          error?.message ||
          t("common.unknownErrorDesc");
        toast.error(t("billing.failToast", { message: errorMessage }));
        router.push("/pricing");
      }
    })();
  }, [searchParams, router, t]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <Spinner size="lg" />
      <p className="text-lg text-muted-foreground">{t("processingBilling")}</p>
    </div>
  );
}
