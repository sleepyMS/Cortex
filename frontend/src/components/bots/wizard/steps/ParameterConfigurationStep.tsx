"use client";

import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { WizardData } from "../BotWizard";

interface ParameterConfigurationStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function ParameterConfigurationStep({
  data,
  updateData,
}: ParameterConfigurationStepProps) {
  const handleParamChange = (key: string, value: any) => {
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
        <h2 className="text-xl font-semibold">Configure Parameters</h2>
        <p className="text-muted-foreground">
          Fine-tune the strategy settings for this bot instance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Trading Symbol</Label>
          <Select
            value={data.parameters.symbol || "BTC/USDT"}
            onValueChange={(val) => handleParamChange("symbol", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select symbol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
              <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
              <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Timeframe</Label>
          <Select
            value={data.parameters.timeframe || "1h"}
            onValueChange={(val) => handleParamChange("timeframe", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">5 Minutes</SelectItem>
              <SelectItem value="15m">15 Minutes</SelectItem>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="4h">4 Hours</SelectItem>
              <SelectItem value="1d">1 Day</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dynamic Parameters based on Strategy - Mocked for now */}
        <div className="space-y-2">
          <Label>Fast Period (MACD)</Label>
          <Input
            type="number"
            value={data.parameters.fastPeriod || 12}
            onChange={(e) =>
              handleParamChange("fastPeriod", parseInt(e.target.value))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Slow Period (MACD)</Label>
          <Input
            type="number"
            value={data.parameters.slowPeriod || 26}
            onChange={(e) =>
              handleParamChange("slowPeriod", parseInt(e.target.value))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Signal Period</Label>
          <Input
            type="number"
            value={data.parameters.signalPeriod || 9}
            onChange={(e) =>
              handleParamChange("signalPeriod", parseInt(e.target.value))
            }
          />
        </div>
      </div>
    </div>
  );
}
