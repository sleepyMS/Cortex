"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/apiClient";
import { useTranslations } from "next-intl";

export default function UpdateCardSuccessPage() {
  const t = useTranslations("UpdateCard");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const authKey = searchParams.get("authKey");

  useEffect(() => {
    if (!authKey) {
      toast.error(t("errorToast"));
      router.push("/dashboard/settings");
      return;
    }

    const updateBillingKey = async () => {
      try {
        await apiClient.post("/subscriptions/update-billing-key", { authKey });
        setIsSuccess(true);
        toast.success(t("successTitle"));
        setTimeout(() => router.push("/dashboard/settings"), 2000);
      } catch (e: any) {
        toast.error(e.response?.data?.detail || t("errorToast"));
        setIsProcessing(false);
      }
    };
    updateBillingKey();
  }, [authKey, router, t]);

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          {isProcessing ? (
            <>
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t("processing")}</p>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-lg font-semibold">{t("successTitle")}</p>
              <p className="text-sm text-muted-foreground">
                {t("successDesc")}
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
