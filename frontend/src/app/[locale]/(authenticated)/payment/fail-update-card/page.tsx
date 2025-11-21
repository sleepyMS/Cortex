"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function FailUpdateCardPage() {
  const t = useTranslations("PaymentResult");
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  useEffect(() => {
    toast.error(
      t("updateCard.failToast", {
        message: errorMessage || t("common.unknownError"),
      })
    );
  }, [errorMessage, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <CardTitle className="text-2xl font-bold">
            {t("updateCard.failTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="bg-destructive/10 p-4 rounded-md">
            <p className="text-sm font-medium text-destructive">
              {t("common.failReason", {
                message: errorMessage || t("common.unknownErrorDesc"),
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("common.errorCode", { code: errorCode || "N/A" })}
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard?tab=settings")}
            className="w-full"
            variant="primary"
          >
            {t("updateCard.goToSettings")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
