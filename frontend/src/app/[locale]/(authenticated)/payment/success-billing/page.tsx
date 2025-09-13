// frontend/src/app/[locale]/payment/success-billing/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSubscriptionCheckoutMutation } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";

export default function PaymentSuccessBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutMutation = useSubscriptionCheckoutMutation();

  const hasMutated = useRef(false);

  useEffect(() => {
    if (hasMutated.current) return;

    const authKey = searchParams.get("authKey");
    const planId = searchParams.get("planId");

    if (!authKey || !planId) {
      toast.error("결제 정보를 찾을 수 없습니다.");
      router.push("/pricing");
      return;
    }

    // 마운트 직후 바로 시도 (비동기 IIFE)
    (async () => {
      hasMutated.current = true;
      try {
        // mutateAsync가 없다면 checkoutMutation.mutate를 Promise로 래핑하거나
        // mutateAsync를 지원하도록 훅을 개선하길 권장.
        if (checkoutMutation.mutateAsync) {
          await checkoutMutation.mutateAsync({ authKey, planId });
        } else {
          // fallback: mutate에 콜백 의존성이 있다면 Promise로 래핑
          await new Promise<void>((resolve, reject) => {
            checkoutMutation.mutate(
              { authKey, planId },
              {
                onSuccess: () => resolve(),
                onError: (err: any) => reject(err),
              }
            );
          });
        }

        toast.success(
          "결제 수단 등록 및 첫 구독 결제가 요청되었습니다. 잠시 후 구독 상태가 활성화됩니다."
        );
        router.push("/dashboard");
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.detail ||
          error?.message ||
          "결제 처리 중 오류가 발생했습니다.";
        toast.error(`결제 실패: ${errorMessage}`);
        // 실패 시 수동으로 플랜 페이지로 복귀
        router.push("/pricing");
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, checkoutMutation]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <Spinner size="lg" />
      <p className="text-lg text-muted-foreground">
        결제 정보를 처리 중입니다. 잠시만 기다려주세요...
      </p>
    </div>
  );
}
