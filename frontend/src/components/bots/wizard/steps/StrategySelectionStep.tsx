"use client";

import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { WizardData } from "../BotWizard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useTranslations } from "next-intl";

interface StrategySelectionStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

// Mock Strategies
const STRATEGIES = [
  {
    id: "strat_1",
    name: "MACD Trend Follower",
    description: "Captures trends using MACD crossover signals.",
    winRate: "65%",
    return: "+120%",
    risk: "Medium",
  },
  {
    id: "strat_2",
    name: "RSI Mean Reversion",
    description: "Buys oversold and sells overbought conditions.",
    winRate: "72%",
    return: "+85%",
    risk: "Low",
  },
  {
    id: "strat_3",
    name: "Bollinger Breakout",
    description: "Trades volatility breakouts from Bollinger Bands.",
    winRate: "55%",
    return: "+150%",
    risk: "High",
  },
];

export function StrategySelectionStep({
  data,
  updateData,
}: StrategySelectionStepProps) {
  const t = useTranslations("LiveTrading.Wizard.Strategy");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <RadioGroup
        value={data.strategyId || ""}
        onValueChange={(value) => updateData({ strategyId: value })}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {STRATEGIES.map((strategy) => (
          <div key={strategy.id}>
            <RadioGroupItem
              value={strategy.id}
              id={strategy.id}
              className="peer sr-only"
            />
            <Label
              htmlFor={strategy.id}
              className="flex flex-col justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{strategy.name}</span>
                  <Badge variant="outline">{strategy.risk}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {strategy.description}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">
                    {t("winRate")}
                  </span>
                  <span className="font-medium text-green-500">
                    {strategy.winRate}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-xs">
                    {t("estReturn")}
                  </span>
                  <span className="font-medium text-green-500">
                    {strategy.return}
                  </span>
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
