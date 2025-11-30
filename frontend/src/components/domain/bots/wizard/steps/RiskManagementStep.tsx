"use client";

import { Label } from "@/components/ui/Label";
import { WizardData } from "../BotWizard";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Separator } from "@/components/ui/Separator";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";

interface RiskManagementStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function RiskManagementStep({
  data,
  updateData,
}: RiskManagementStepProps) {
  const t = useTranslations("LiveTrading.Wizard.Risk");

  const handleRiskChange = (key: string, value: number) => {
    updateData({
      riskSettings: {
        ...data.riskSettings,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Take Profit Section */}
        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
          <Label className="text-muted-foreground">{t("takeProfit")}</Label>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-500">
                {data.selectedStrategy?.tpslLogic?.atrTakeProfitMultiplier
                  ? `${data.selectedStrategy.tpslLogic.atrTakeProfitMultiplier}x ATR`
                  : `${data.selectedStrategy?.tpslLogic?.takeProfitPct || 0}%`}
              </span>
              <Badge variant="outline">Strategy Default</Badge>
            </div>
            {data.selectedStrategy?.tpslLogic?.atrTakeProfitMultiplier && (
              <span className="text-xs text-muted-foreground">
                Period: {data.selectedStrategy.tpslLogic.atrPeriod}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Defined in strategy logic. Cannot be changed here.
          </p>
        </div>

        {/* Stop Loss Section */}
        <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
          <Label className="text-muted-foreground">{t("stopLoss")}</Label>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-red-500">
                {data.selectedStrategy?.tpslLogic?.atrStopLossMultiplier
                  ? `${data.selectedStrategy.tpslLogic.atrStopLossMultiplier}x ATR`
                  : `${data.selectedStrategy?.tpslLogic?.stopLossPct || 0}%`}
              </span>
              <Badge variant="outline">Strategy Default</Badge>
            </div>
            {data.selectedStrategy?.tpslLogic?.atrStopLossMultiplier && (
              <span className="text-xs text-muted-foreground">
                Period: {data.selectedStrategy.tpslLogic.atrPeriod}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Defined in strategy logic. Cannot be changed here.
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="font-medium">{t("safetySwitches")}</h3>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">{t("dailyMaxLoss")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("dailyMaxLossDesc")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-24">
              <Input
                type="number"
                value={data.riskSettings.dailyMaxLoss}
                onChange={(e) =>
                  handleRiskChange("dailyMaxLoss", parseFloat(e.target.value))
                }
                className="pr-8 h-8"
              />
              <span className="absolute right-3 top-1.5 text-xs text-muted-foreground">
                %
              </span>
            </div>
            <Switch checked={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
