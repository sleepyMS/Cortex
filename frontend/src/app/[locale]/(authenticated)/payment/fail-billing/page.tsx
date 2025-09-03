// file: frontend/src/app/[locale]/payment/fail-billing/page.tsx

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function FailBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 쿼리 파라미터에서 에러 코드와 메시지를 가져옵니다.
  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  useEffect(() => {
    // 페이지에 진입하자마자 사용자에게 토스트 알림으로 에러를 명확히 알려줍니다.
    toast.error(`카드 등록 실패: ${errorMessage || "알 수 없는 오류"}`);
  }, [errorMessage]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <CardTitle className="text-2xl font-bold">
            카드 등록에 실패했습니다
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="bg-destructive/10 p-4 rounded-md">
            <p className="text-sm font-medium text-destructive">
              실패 사유: {errorMessage || "알 수 없는 오류가 발생했습니다."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              에러코드: {errorCode || "N/A"}
            </p>
          </div>
          <p className="text-muted-foreground">
            다른 카드를 이용하시거나, 문제가 지속될 경우 고객센터로
            문의해주세요.
          </p>
          <Button
            onClick={() => router.push("/pricing")}
            className="w-full"
            variant="primary"
          >
            가격 정책 페이지로 돌아가기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
