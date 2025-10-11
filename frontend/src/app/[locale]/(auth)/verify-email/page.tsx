// file: frontend/src/app/[locale]/verify-email/page.tsx

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle, XCircle } from "lucide-react";

import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import AuthLayout from "@/components/layout/AuthLayout";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <VerifyEmailComponent />
    </Suspense>
  );
}

function VerifyEmailComponent() {
  const t = useTranslations("Auth.VerifyEmail");
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // ... useEffect 로직은 이전과 동일 ...
    const verifyToken = async () => {
      const token = searchParams.get("token");
      if (!token) {
        setStatus("error");
        setErrorMessage(t("errorNoToken"));
        return;
      }
      try {
        await apiClient.post("/auth/verify-email", { token });
        setStatus("success");
      } catch (error: any) {
        setStatus("error");
        setErrorMessage(error.response?.data?.detail || t("errorInvalidToken"));
      }
    };
    verifyToken();
  }, [searchParams, t]);

  const renderContent = () => {
    switch (status) {
      case "verifying":
        // ... 로딩 상태는 이전과 동일 ...
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <Spinner size="lg" />
            <h1 className="text-2xl font-semibold">{t("verifyingTitle")}</h1>
            <p className="text-muted-foreground">{t("verifyingSubtitle")}</p>
          </div>
        );
      case "success":
        return (
          // Alert 컴포넌트는 그대로 사용합니다.
          <Alert variant="default">
            {/* 👇 1. 아이콘을 Alert의 직접적인 자식으로 둡니다. 크기를 h-8 w-8로 수정합니다. */}
            <CheckCircle className="h-8 w-8 text-green-500" />

            {/* 👇 2. Title, Description, Button을 div로 감싸고 text-center를 적용합니다. */}
            <div className="text-center pl-0">
              <AlertTitle className="text-2xl font-bold mb-2">
                {t("successTitle")}
              </AlertTitle>
              <AlertDescription className="mb-6">
                {t("successDescription")}
              </AlertDescription>
              {/* 👇 3. Button을 별도의 div로 감싸 중앙 정렬을 보장합니다. */}
              <div className="flex justify-center">
                <Button asChild>
                  <Link href="/login">{t("goToLoginButton")}</Link>
                </Button>
              </div>
            </div>
          </Alert>
        );
      case "error":
        return (
          // 실패 케이스에도 동일한 구조를 적용합니다.
          <Alert variant="destructive">
            <XCircle className="h-8 w-8 text-destructive" />
            <div className="text-center !pl-0">
              <AlertTitle className="text-2xl font-bold mb-2">
                {t("errorTitle")}
              </AlertTitle>
              <AlertDescription className="mb-6">
                {errorMessage}
              </AlertDescription>
              <div className="flex justify-center">
                <Button asChild variant="secondary">
                  <Link href="/login">{t("backToLoginButton")}</Link>
                </Button>
              </div>
            </div>
          </Alert>
        );
    }
  };

  return <AuthLayout>{renderContent()}</AuthLayout>;
}
