// file: frontend/src/app/[locale]/payment/fail/page.tsx
"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { XCircle } from "lucide-react";

// --- 실제 로직을 처리할 내부 컴포넌트 ---
const FailPageContent = () => {
  const t = useTranslations("PaymentFailPage");
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. URL 쿼리 파라미터에서 실패 정보 추출
  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");
  const orderId = searchParams.get("orderId");

  return (
    <div className="flex flex-col items-center justify-center text-center w-full max-w-lg">
      <XCircle className="h-16 w-16 text-destructive" />
      <h2 className="mt-4 text-3xl font-bold">{t("title")}</h2>
      <p className="mt-2 text-muted-foreground">{t("description")}</p>

      {/* 2. 에러 메시지가 있을 경우, 상세 내용 표시 */}
      {errorMessage && (
        <Alert variant="destructive" className="mt-6 text-left">
          <AlertTitle>
            {t("errorDetailsTitle")} (Code: {errorCode})
          </AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {orderId && (
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            {t("orderIdLabel")}: {orderId}
          </p>
        </div>
      )}

      {/* 3. 다음 행동을 유도하는 버튼 제공 */}
      <div className="mt-8 flex gap-4">
        <Button onClick={() => router.back()}>{t("retryPayment")}</Button>
        <Button variant="outline" onClick={() => router.push("/marketplace")}>
          {t("goToMarketplace")}
        </Button>
      </div>
    </div>
  );
};

// --- 페이지 진입점 ---
export default function PaymentFailPage() {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
      <Suspense fallback={<Spinner size="lg" />}>
        <FailPageContent />
      </Suspense>
    </div>
  );
}
