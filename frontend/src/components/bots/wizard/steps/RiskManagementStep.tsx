"use client";

import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { WizardData } from "../BotWizard";
import { Switch } from "@/components/ui/Switch";

interface RiskManagementStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function RiskManagementStep({
  data,
  updateData,
}: RiskManagementStepProps) {
  const updateRisk = (key: keyof WizardData["riskSettings"], value: number) => {
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
        <h2 className="text-xl font-semibold">Risk Management</h2>
        <p className="text-muted-foreground">
          Set safety limits to protect your capital.
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Take Profit (%)</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                value={data.riskSettings.takeProfit}
                onChange={(e) =>
                  updateRisk("takeProfit", parseFloat(e.target.value))
                }
                className="pr-8"
              />
              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stop Loss (%)</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                value={data.riskSettings.stopLoss}
                onChange={(e) =>
                  updateRisk("stopLoss", parseFloat(e.target.value))
                }
                className="pr-8"
              />
              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-medium">Safety Switches</h3>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Daily Max Loss (Kill Switch)</Label>
              <p className="text-sm text-muted-foreground">
                Stop the bot if daily loss exceeds this percentage.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-24">
                <Input
                  type="number"
                  step="0.1"
                  value={data.riskSettings.dailyMaxLoss}
                  onChange={(e) =>
                    updateRisk("dailyMaxLoss", parseFloat(e.target.value))
                  }
                  className="pr-8 h-9"
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
