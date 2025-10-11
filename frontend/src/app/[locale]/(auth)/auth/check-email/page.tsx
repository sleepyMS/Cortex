// file: frontend/src/app/[locale]/(auth)/auth/check-email/page.tsx

"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import apiClient from "@/lib/apiClient";
import AuthLayout from "@/components/layout/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";

function CheckEmailContent() {
  const t = useTranslations("Auth.CheckEmail");
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post("/auth/request-email-verification", { email });
      setSuccess(t("resendSuccess"));
    } catch (err: any) {
      setError(err.response?.data?.detail || t("resendErrorGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>{t("emailMissingError")}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <MailCheck className="h-16 w-16 text-primary mb-6" />
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-muted-foreground mb-6">
        {t.rich("description", {
          email: () => <strong className="text-foreground">{email}</strong>,
        })}
      </p>

      {success && (
        <Alert variant="default" className="my-4">
          <AlertTitle>{t("successTitle")}</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button onClick={handleResend} disabled={isLoading} className="w-full">
        {isLoading && <Spinner size="sm" className="mr-2" />}
        {t("resendButton")}
      </Button>

      <p className="mt-4 text-xs text-muted-foreground">{t("resendHint")}</p>
    </div>
  );
}

// useSearchParams를 사용하기 위해 Suspense로 감싸줍니다.
export default function CheckEmailPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<Spinner />}>
        <CheckEmailContent />
      </Suspense>
    </AuthLayout>
  );
}
