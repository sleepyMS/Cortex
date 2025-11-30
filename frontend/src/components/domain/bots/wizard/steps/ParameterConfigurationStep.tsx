"use client";

import { WizardData } from "../BotWizard";
import { useTranslations } from "next-intl";
import { StrategyParameterViewer } from "../StrategyParameterViewer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Info, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Separator } from "@/components/ui/Separator";

interface ParameterConfigurationStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function ParameterConfigurationStep({
  data,
  updateData,
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
    <div className="space-y-8">
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

      <Separator />

      <div className="grid gap-8 md:grid-cols-2">
        {/* Leverage Setting */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("leverage")}</Label>
            <Select
              value={data.leverage.toString()}
              onValueChange={(value) =>
                updateData({ leverage: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectLeverage")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1x (Spot)</SelectItem>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="5">5x</SelectItem>
                <SelectItem value="10">10x</SelectItem>
                <SelectItem value="20">20x</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.leverage > 1 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Risk Warning</AlertTitle>
              <AlertDescription>
                Using leverage increases the risk of liquidation. Please trade
                responsibly.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Trailing Stop Setting */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t("trailingStop")}</Label>
            <Switch
              checked={data.trailingStopConfig.enabled}
              onCheckedChange={(checked) =>
                updateData({
                  trailingStopConfig: {
                    ...data.trailingStopConfig,
                    enabled: checked,
                  },
                })
              }
            />
          </div>

          {data.trailingStopConfig.enabled && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-xs">{t("activation")}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={data.trailingStopConfig.activationPct}
                  onChange={(e) =>
                    updateData({
                      trailingStopConfig: {
                        ...data.trailingStopConfig,
                        activationPct: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t("callback")}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={data.trailingStopConfig.callbackPct}
                  onChange={(e) =>
                    updateData({
                      trailingStopConfig: {
                        ...data.trailingStopConfig,
                        callbackPct: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
