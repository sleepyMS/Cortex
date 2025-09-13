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
    // 1. 뮤테이션이 성공적으로 완료되면, 즉시 대시보드로 이동합니다.
    if (checkoutMutation.isSuccess) {
      router.push("/dashboard");
      return;
    }

    // 2. 개발 모드에서 중복 호출을 막습니다.
    if (hasMutated.current) {
      return;
    }

    const authKey = searchParams.get("authKey");
    const planId = searchParams.get("planId");

    if (authKey && planId) {
      hasMutated.current = true;
      checkoutMutation.mutate(
        { authKey, planId },
        {
          onSuccess: () => {
            // 성공 토스트 알림만 표시하고, 라우팅은 useEffect에서 처리합니다.
            toast.success(
              "결제 수단 등록 및 첫 구독 결제가 요청되었습니다. 잠시 후 구독 상태가 활성화됩니다."
            );
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
    // `checkoutMutation.isSuccess`를 종속성 배열에 추가하여 상태 변화를 감지합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router, checkoutMutation.isSuccess]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      {/* 뮤테이션이 진행 중일 때만 스피너를 보여줍니다. */}
      {checkoutMutation.isPending && <Spinner size="lg" />}

      <p className="text-lg text-muted-foreground">
        결제 정보를 처리 중입니다. 잠시만 기다려주세요...
      </p>
    </div>
  );
}
