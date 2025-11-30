"use client";

import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { WizardData } from "../BotWizard";
import { Badge } from "@/components/ui/Badge";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { Strategy } from "@/types/strategy";
import { Skeleton } from "@/components/ui/Skeleton";

interface StrategySelectionStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function StrategySelectionStep({
  data,
  updateData,
}: StrategySelectionStepProps) {
  const t = useTranslations("LiveTrading.Wizard.Strategy");

  const { data: strategies, isLoading } = useQuery<Strategy[]>({
    queryKey: ["strategies"],
    queryFn: async () => (await apiClient.get("/strategies")).data,
  });

  const handleSelect = (strategyId: string) => {
    const selected = strategies?.find((s) => s.id === strategyId);
    updateData({
      strategyId,
      selectedStrategy: selected || null,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <RadioGroup
        value={data.strategyId || ""}
        onValueChange={handleSelect}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        {strategies?.map((strategy) => (
          <div key={strategy.id}>
            <RadioGroupItem
              value={strategy.id}
              id={strategy.id}
              className="peer sr-only"
            />
            <Label
              htmlFor={strategy.id}
              className="flex flex-col justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="font-semibold truncate pr-2"
                    title={strategy.name}
                  >
                    {strategy.name}
                  </span>
                  {/* Mock Risk Level - In real app, calculate or fetch */}
                  <Badge variant="outline">Medium</Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                  {strategy.description || "No description available."}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">
                    Symbol
                  </span>
                  <span className="font-medium">
                    {strategy.targetCoins?.[0]?.ticker || "Any"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-xs">
                    Timeframe
                  </span>
                  <span className="font-medium">
                    {/* Assuming timeframe is stored somewhere or just showing default */}
                    1h
                  </span>
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {strategies?.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          No strategies found. Please create a strategy first.
        </div>
      )}
    </div>
  );
}
