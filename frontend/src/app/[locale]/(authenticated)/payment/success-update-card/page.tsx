"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useUpdateCardMutation } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslations } from "next-intl";

export default function PaymentSuccessUpdateCardPage() {
  const t = useTranslations("PaymentResult");
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateCardMutation = useUpdateCardMutation();
  const hasMutated = useRef(false);

  useEffect(() => {
    if (hasMutated.current) return;

    const authKey = searchParams.get("authKey");
    const planId = searchParams.get("planId");

    if (!authKey || !planId) {
      toast.error(t("invalidAccess"));
      router.push("/dashboard?tab=settings");
      return;
    }

    (async () => {
      hasMutated.current = true;
      try {
        await updateCardMutation.mutateAsync({ authKey, planId });
        // 성공 메시지는 hook 내부에서 처리됨 (필요시 hook도 수정 가능하지만 일단 유지)
        router.push("/dashboard?tab=settings");
      } catch (error) {
        router.push("/dashboard?tab=settings");
      }
    })();
  }, [searchParams, router, t]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <Spinner size="lg" />
      <p className="text-lg text-muted-foreground">{t("processingUpdate")}</p>
    </div>
  );
}
