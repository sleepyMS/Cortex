"use client";

import { WizardData } from "../BotWizard";
import { useTranslations } from "next-intl";
import { StrategyParameterViewer } from "../StrategyParameterViewer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Info } from "lucide-react";

interface ParameterConfigurationStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function ParameterConfigurationStep({
  data,
}: ParameterConfigurationStepProps) {
  const t = useTranslations("LiveTrading.Wizard.Parameters");

  if (!data.selectedStrategy) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        {t("selectStrategyFirst")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("readOnlyTitle")}</AlertTitle>
        <AlertDescription>{t("readOnlyDesc")}</AlertDescription>
      </Alert>

      <StrategyParameterViewer
        strategy={data.selectedStrategy}
        singleColumn={true}
      />
    </div>
  );
}
