"use client";

import { WizardData } from "../BotWizard";
import { Card } from "@/components/ui/Card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

interface ReviewStepProps {
  data: WizardData;
}

export function ReviewStep({ data }: ReviewStepProps) {
  const t = useTranslations("LiveTrading.Wizard.Review");
  const tMode = useTranslations("LiveTrading.Wizard.Mode");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4 space-y-4">
          <h3 className="font-medium border-b pb-2">{t("strategy")}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tMode("title")}</span>
              <span className="font-medium text-primary">
                {data.mode === "live"
                  ? tMode("liveTitle")
                  : tMode("paperTitle")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("name")}</span>
              <span className="font-medium">
                {data.selectedStrategy?.name || t("unknown")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("symbol")}</span>
              <span className="font-medium">
                {data.selectedStrategy?.targetCoins?.[0]?.ticker || t("any")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("executionInterval")}
              </span>
              <span className="font-medium">{data.executionInterval}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h3 className="font-medium border-b pb-2">{t("capitalRisk")}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t("initialCapital")}
              </span>
              <span className="font-medium">
                ${data.initialCapital.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("leverage")}</span>
              <span className="font-medium">{data.leverage}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("dailyMaxLoss")}</span>
              <span className="font-medium text-red-500">
                {data.riskSettings.dailyMaxLoss}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("trailingStop")}</span>
              <span
                className={
                  data.trailingStopConfig.enabled
                    ? "text-green-500 font-medium"
                    : "text-muted-foreground"
                }
              >
                {data.trailingStopConfig.enabled ? t("enabled") : t("disabled")}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("disclaimer")}</AlertTitle>
        <AlertDescription>{t("disclaimerText")}</AlertDescription>
      </Alert>
    </div>
  );
}
