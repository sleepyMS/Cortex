"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { WizardData } from "../BotWizard";
import { CheckCircle2 } from "lucide-react";

interface StrategySelectionStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

// Mock Strategies - In real app, fetch from API
const STRATEGIES = [
  {
    id: "strat_1",
    name: "MACD Trend Follower",
    description: "Classic trend following strategy using MACD crossover.",
    tags: ["Trend", "Low Risk"],
    winRate: 65,
    return: 120,
  },
  {
    id: "strat_2",
    name: "RSI Mean Reversion",
    description: "Buy oversold and sell overbought conditions.",
    tags: ["Reversion", "Medium Risk"],
    winRate: 58,
    return: 150,
  },
  {
    id: "strat_3",
    name: "Bollinger Breakout",
    description: "Catch volatility breakouts from Bollinger Bands.",
    tags: ["Volatility", "High Risk"],
    winRate: 45,
    return: 210,
  },
];

export function StrategySelectionStep({
  data,
  updateData,
}: StrategySelectionStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Select a Strategy</h2>
        <p className="text-muted-foreground">
          Choose a trading strategy to power your bot.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STRATEGIES.map((strategy) => {
          const isSelected = data.strategyId === strategy.id;
          return (
            <div
              key={strategy.id}
              className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all hover:border-primary/50 ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-muted/50"
              }`}
              onClick={() => updateData({ strategyId: strategy.id })}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
              <div className="mb-2">
                <h3 className="font-semibold">{strategy.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {strategy.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] px-1 py-0 h-5"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {strategy.description}
              </p>
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">
                    Win Rate
                  </span>
                  <span className="font-medium">{strategy.winRate}%</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-xs">
                    Est. Return
                  </span>
                  <span className="font-medium text-green-500">
                    +{strategy.return}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
