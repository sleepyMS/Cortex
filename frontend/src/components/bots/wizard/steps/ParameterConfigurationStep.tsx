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
import { useTranslations } from "next-intl";

interface ParameterConfigurationStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function ParameterConfigurationStep({
  data,
  updateData,
}: ParameterConfigurationStepProps) {
  const t = useTranslations("LiveTrading.Wizard.Parameters");

  const handleParameterChange = (key: string, value: any) => {
    updateData({
      parameters: {
        ...data.parameters,
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
        <div className="space-y-2">
          <Label>{t("symbol")}</Label>
          <Select
            value={data.parameters.symbol || ""}
            onValueChange={(value) => handleParameterChange("symbol", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectSymbol")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
              <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
              <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
              <SelectItem value="XRP/USDT">XRP/USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("timeframe")}</Label>
          <Select
            value={data.parameters.timeframe || ""}
            onValueChange={(value) => handleParameterChange("timeframe", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectTimeframe")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 Minute</SelectItem>
              <SelectItem value="5m">5 Minutes</SelectItem>
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="4h">4 Hours</SelectItem>
              <SelectItem value="1d">1 Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic parameters based on strategy would go here */}
        {/* For now, we'll add some mock strategy-specific params */}
        <div className="space-y-2">
          <Label>Fast Period (MACD)</Label>
          <Input
            type="number"
            value={data.parameters.fastPeriod || 12}
            onChange={(e) =>
              handleParameterChange("fastPeriod", parseInt(e.target.value))
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Slow Period (MACD)</Label>
          <Input
            type="number"
            value={data.parameters.slowPeriod || 26}
            onChange={(e) =>
              handleParameterChange("slowPeriod", parseInt(e.target.value))
            }
          />
        </div>
      </div>
    </div>
  );
}
