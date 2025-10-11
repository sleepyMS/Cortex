// file: frontend/src/app/[locale]/(auth)/auth/check-email/page.tsx

"use client";

import { Suspense, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MailCheck, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import apiClient from "@/lib/apiClient";
import AuthLayout from "@/components/layout/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import Link from "next/link";

// 이메일 주소를 기반으로 주요 메일 서비스의 바로가기 링크를 반환하는 함수
const getEmailProviderLink = (email: string | null): string | null => {
  if (!email) return null;
  const domain = email.split("@")[1];
  switch (domain) {
    case "gmail.com":
      return "https://mail.google.com";
    case "naver.com":
      return "https://mail.naver.com";
    case "hanmail.net":
    case "daum.net":
    case "kakao.com":
      return "https://mail.daum.net";
    default:
      return null; // 지원하지 않는 도메인이면 null 반환
  }
};

function CheckEmailContent() {
  const t = useTranslations("Auth.CheckEmail");
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 이메일이 변경될 때만 링크를 다시 계산하도록 useMemo 사용
  const inboxLink = useMemo(() => getEmailProviderLink(email), [email]);

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

      <div className="w-full flex flex-col sm:flex-row gap-2">
        {/* '내 메일함 바로가기' 버튼 (inboxLink가 있을 때만 렌더링) */}
        {inboxLink && (
          <Button asChild variant="outline" className="w-full">
            <Link href={inboxLink} target="_blank" rel="noopener noreferrer">
              {t("goToInboxButton")}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
        {/* '이메일 재전송' 버튼 */}
        <Button onClick={handleResend} disabled={isLoading} className="w-full">
          {isLoading && <Spinner size="sm" className="mr-2" />}
          {t("resendButton")}
        </Button>
      </div>

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
