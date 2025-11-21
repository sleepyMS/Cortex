"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useUpdateCardMutation } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/Spinner";

export default function PaymentSuccessUpdateCardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateCardMutation = useUpdateCardMutation();
  const hasMutated = useRef(false);

  useEffect(() => {
    if (hasMutated.current) return;

    const authKey = searchParams.get("authKey");
    const planId = searchParams.get("planId");

    if (!authKey || !planId) {
      toast.error("잘못된 접근입니다. 결제 정보를 찾을 수 없습니다.");
      router.push("/dashboard?tab=settings");
      return;
    }

    (async () => {
      hasMutated.current = true;
      try {
        await updateCardMutation.mutateAsync({ authKey, planId });
        // 성공 메시지는 hook 내부에서 처리됨
        router.push("/dashboard?tab=settings");
      } catch (error) {
        // 에러 메시지는 hook 내부에서 처리됨
        router.push("/dashboard?tab=settings");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center space-y-4">
      <Spinner size="lg" />
      <p className="text-lg text-muted-foreground">
        결제 수단을 변경 중입니다. 잠시만 기다려주세요...
      </p>
    </div>
  );
}
