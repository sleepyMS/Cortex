// file: frontend/src/app/[locale]/reset-password/page.tsx

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import ResetPasswordForm from "@/components/domain/ResetPasswordForm";
import AuthLayout from "@/components/layout/AuthLayout";
import { Spinner } from "@/components/ui/Spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { XCircle } from "lucide-react";

function ResetPasswordContent() {
  const t = useTranslations("Auth.ResetPassword");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // URL에 토큰이 없으면 에러 메시지를 표시
  if (!token) {
    return (
      <Alert variant="destructive" className="text-center">
        <div className="flex flex-col items-center text-center">
          <XCircle className="h-8 w-8 text-destructive mb-4" />
          <AlertTitle className="text-2xl font-bold mb-2">
            {t("errorTitle")}
          </AlertTitle>
          <AlertDescription>{t("tokenMissingError")}</AlertDescription>
        </div>
      </Alert>
    );
  }

  return <ResetPasswordForm token={token} />;
}

// useSearchParams를 사용하기 위해 Suspense로 감싸줍니다.
export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<Spinner />}>
        <ResetPasswordContent />
      </Suspense>
    </AuthLayout>
  );
}
