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

  // Mock fetching balance when account changes
  useEffect(() => {
    if (data.exchangeAccountId) {
      // Simulate API call
      setBalance(10000); // Mock 10,000 USDT
    } else {
      setBalance(null);
    }
  }, [data.exchangeAccountId]);

  // Update initial capital based on percentage
  useEffect(() => {
    if (balance !== null) {
      const amount = Math.floor(balance * (allocationPct / 100));
      updateData({ initialCapital: amount });
    }
  }, [balance, allocationPct]);

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
          </div>

          {data.exchangeAccountId && balance !== null && (
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

        {/* Right Column: Execution & Trailing Stop */}
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

          <Separator />

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

      {data.leverage > 1 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("riskWarning")}</AlertTitle>
          <AlertDescription>{t("riskWarningDesc")}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
