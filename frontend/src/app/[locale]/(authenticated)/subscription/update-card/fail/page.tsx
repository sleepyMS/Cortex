"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function UpdateCardFailPage() {
  const t = useTranslations("UpdateCard");
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    toast.error(err ?? t("errorToast"));
  }, [t]);

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("failTitle")}</CardTitle>
          <CardDescription>{t("failDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <XCircle className="h-16 w-16 text-destructive" />
          <p className="text-lg font-semibold text-destructive">
            {t("failTitle")}
          </p>
          <p className="text-sm text-muted-foreground">{t("failDesc")}</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/settings")}
            >
              {t("goToSettings")}
            </Button>
            <Button onClick={() => router.back()}>{t("retry")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
