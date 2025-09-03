// file: frontend/src/app/[locale]/payment/success-billing/page.tsx (신규 파일)
"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSubscriptionCheckoutMutation } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner"; // 로딩 스피너 컴포넌트 (가정)

export default function PaymentSuccessBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutMutation = useSubscriptionCheckoutMutation();

  useEffect(() => {
    // URL로부터 authKey와 planId를 추출합니다.
    const authKey = searchParams.get("authKey");
    const planId = searchParams.get("planId");

    if (authKey && planId) {
      // authKey와 planId를 사용하여 서버에 카드 등록 및 첫 결제 요청을 보냅니다.
      checkoutMutation.mutate(
        { authKey, planId },
        {
          onSuccess: () => {
            toast.success(
              "결제 수단 등록 및 첫 구독 결제가 요청되었습니다. 잠시 후 구독 상태가 활성화됩니다."
            );
            // 성공 시 사용자를 대시보드나 설정 페이지로 이동시킵니다.
            router.push("/dashboard");
          },
          onError: (error) => {
            // 뮤테이션 자체에서 toast.error를 처리하지만, 추가적인 에러 핸들링이 필요하면 여기에 작성합니다.
            // 실패 시 사용자를 가격 정책 페이지로 다시 보냅니다.
            router.push("/pricing");
          },
        }
      );
    } else {
      // 비정상적인 접근 처리
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
