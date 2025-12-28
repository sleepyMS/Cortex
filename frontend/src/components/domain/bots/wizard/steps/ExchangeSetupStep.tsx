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
import { AlertTriangle, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { Separator } from "@/components/ui/Separator";
import { useState, useEffect } from "react";

interface ExchangeSetupStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function ExchangeSetupStep({
  data,
  updateData,
}: ExchangeSetupStepProps) {
  const t = useTranslations("LiveTrading.Wizard.Exchange");

  // Mock Balance State
  const [balance, setBalance] = useState<number | null>(null);
  const [allocationPct, setAllocationPct] = useState(10); // Default 10%

  // Mock fetching balance when account changes (only for Live mode)
  useEffect(() => {
    if (data.mode === "live" && data.exchangeAccountId) {
      // Simulate API call
      setBalance(10000); // Mock 10,000 USDT
    } else if (data.mode === "live") {
      setBalance(null);
    }
  }, [data.exchangeAccountId, data.mode]);

  // Update initial capital based on percentage (only for Live mode)
  useEffect(() => {
    if (data.mode === "live" && balance !== null) {
      const amount = Math.floor(balance * (allocationPct / 100));
      updateData({ initialCapital: amount });
    }
  }, [balance, allocationPct, data.mode, updateData]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column: Exchange & Capital */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>{t("account")}</Label>
            {data.mode === "live" ? (
              <Select
                value={data.exchangeAccountId || ""}
                onValueChange={(value) =>
                  updateData({ exchangeAccountId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectAccount")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acc_1">Binance Main (***3f8a)</SelectItem>
                  <SelectItem value="acc_2">Bybit Sub (***9k2p)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t("virtualAccount")}
                </span>
              </div>
            )}
          </div>

          {data.mode === "live" &&
            data.exchangeAccountId &&
            balance !== null && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    {t("availableBalance")}
                  </Label>
                  <span className="font-mono font-medium">
                    ${balance.toLocaleString()} USDT
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>
                      {t("allocation")}: {allocationPct}%
                    </span>
                    <span className="font-bold text-primary">
                      ${data.initialCapital.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={[allocationPct]}
                    onValueChange={(vals) => setAllocationPct(vals[0])}
                    max={100}
                    step={1}
                    className="py-2"
                  />
                </div>
              </div>
            )}

          {data.mode === "paper" && (
            <div className="space-y-2">
              <Label>{t("initialCapital")}</Label>
              <Input
                type="number"
                value={data.initialCapital}
                onChange={(e) =>
                  updateData({ initialCapital: parseFloat(e.target.value) })
                }
              />
            </div>
          )}
        </div>

        {/* Right Column: Execution Settings */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>{t("executionInterval")}</Label>
            <Select
              value={data.executionInterval}
              onValueChange={(value) =>
                updateData({ executionInterval: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectInterval")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">{t("intervals.1m")}</SelectItem>
                <SelectItem value="5m">{t("intervals.5m")}</SelectItem>
                <SelectItem value="15m">{t("intervals.15m")}</SelectItem>
                <SelectItem value="1h">{t("intervals.1h")}</SelectItem>
                <SelectItem value="4h">{t("intervals.4h")}</SelectItem>
                <SelectItem value="1d">{t("intervals.1d")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("intervalHelp")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
