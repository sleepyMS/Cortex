// file: frontend/src/app/[locale]/payment/success-billing/page.tsx
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
      toast.error("잘못된 접근입니다. 결제 정보를 찾을 수 없습니다.");
      router.push("/pricing");
      return;
    }

    (async () => {
      hasMutated.current = true;
      try {
        await checkoutMutation.mutateAsync({ authKey, planId });
        toast.success("결제 수단 등록 및 첫 구독 결제가 완료되었습니다.");
        router.push("/dashboard");
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.detail ||
          error?.message ||
          "결제 처리 중 알 수 없는 오류가 발생했습니다.";
        toast.error(`결제 실패: ${errorMessage}`);
        router.push("/pricing");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <Spinner size="lg" />
      <p className="text-lg text-muted-foreground">
        결제 정보를 처리 중입니다. 잠시만 기다려주세요...
      </p>
    </div>
  );
}
