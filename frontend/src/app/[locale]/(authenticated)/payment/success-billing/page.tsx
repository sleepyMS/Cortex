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

  // useRef를 사용하여 API 호출 상태를 관리합니다.
  const hasMutated = useRef(false);

  useEffect(() => {
    // 이미 API를 호출했거나, 현재 호출 중인 경우 함수를 종료합니다.
    if (hasMutated.current || checkoutMutation.isPending) {
      return;
    }

    const authKey = searchParams.get("authKey");
    const planId = searchParams.get("planId");

    if (authKey && planId) {
      // API 호출 시작 전에 플래그를 true로 설정합니다.
      hasMutated.current = true;

      checkoutMutation.mutate(
        { authKey, planId },
        {
          onSuccess: () => {
            toast.success(
              "결제 수단 등록 및 첫 구독 결제가 요청되었습니다. 잠시 후 구독 상태가 활성화됩니다."
            );
            router.push("/dashboard");
          },
          onError: (error) => {
            const errorMessage =
              error.response?.data?.detail ||
              "결제 처리 중 알 수 없는 오류가 발생했습니다.";
            toast.error(`결제 실패: ${errorMessage}`);
            router.push("/pricing");
          },
        }
      );
    } else {
      toast.error("잘못된 접근입니다. 결제 정보를 찾을 수 없습니다.");
      router.push("/pricing");
    }
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
