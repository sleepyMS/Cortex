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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Info } from "lucide-react";

interface ExchangeSetupStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function ExchangeSetupStep({
  data,
  updateData,
}: ExchangeSetupStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Exchange & Capital</h2>
        <p className="text-muted-foreground">
          Connect your exchange account and allocate capital.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Exchange Account (API Key)</Label>
          <Select
            value={data.exchangeAccountId || ""}
            onValueChange={(val) => updateData({ exchangeAccountId: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an API Key" />
            </SelectTrigger>
            <SelectContent>
              {/* Mock API Keys */}
              <SelectItem value="key_1">
                Binance Futures - Main (Read/Trade)
              </SelectItem>
              <SelectItem value="key_2">Binance Spot - Savings</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Only keys with trading permissions are shown.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Initial Capital (USDT)</Label>
            <Input
              type="number"
              min="10"
              value={data.initialCapital}
              onChange={(e) =>
                updateData({ initialCapital: parseFloat(e.target.value) })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Leverage (x)</Label>
            <Select
              value={data.leverage.toString()}
              onValueChange={(val) => updateData({ leverage: parseInt(val) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leverage" />
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

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Risk Warning</AlertTitle>
          <AlertDescription>
            Trading with leverage increases the risk of liquidation. Ensure you
            have sufficient margin.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
