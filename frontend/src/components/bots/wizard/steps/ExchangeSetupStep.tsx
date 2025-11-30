"use client";

import { Label } from "@/components/ui/Label";
import { WizardData } from "../BotWizard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ExchangeSetupStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function ExchangeSetupStep({
  data,
  updateData,
}: ExchangeSetupStepProps) {
  const t = useTranslations("LiveTrading.Wizard.Exchange");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("account")}</Label>
          <Select
            value={data.exchangeAccountId || ""}
            onValueChange={(value) => updateData({ exchangeAccountId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectAccount")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acc_1">
                Binance Main Account (***3f8a)
              </SelectItem>
              <SelectItem value="acc_2">Bybit Sub Account (***9k2p)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("initialCapital")}</Label>
            <Input
              type="number"
              value={data.initialCapital}
              onChange={(e) =>
                updateData({ initialCapital: parseFloat(e.target.value) })
              }
              min={0}
            />
          </div>

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
        </div>

        {data.leverage > 1 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("riskWarning")}</AlertTitle>
            <AlertDescription>{t("riskWarningDesc")}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
