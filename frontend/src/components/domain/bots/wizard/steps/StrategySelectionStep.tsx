"use client";

import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { WizardData } from "../BotWizard";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { Strategy, StrategyInList } from "@/types/strategy";
import { Skeleton } from "@/components/ui/Skeleton";
import { StrategyPerformanceBadges } from "@/components/domain/strategy/StrategyPerformanceBadges";
import { KeyIndicatorBadges } from "@/components/domain/strategy/KeyIndicatorBadges";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface StrategySelectionStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
}

export function StrategySelectionStep({
  data,
  updateData,
}: StrategySelectionStepProps) {
  const t = useTranslations("LiveTrading.Wizard.Strategy");

  // 1. Fetch the list of strategies (Summary only)
  const { data: strategies, isLoading: isListLoading } = useQuery<
    StrategyInList[]
  >({
    queryKey: ["strategies"],
    queryFn: async () => (await apiClient.get("/strategies")).data,
  });

  // 2. Fetch the FULL strategy details when one is selected
  const { data: fullStrategy, isLoading: isFullStrategyLoading } =
    useQuery<Strategy>({
      queryKey: ["strategy", data.strategyId],
      queryFn: async () =>
        (await apiClient.get(`/strategies/${data.strategyId}`)).data,
      enabled: !!data.strategyId, // Only run if an ID is selected
    });

  // 3. Update the wizard data when the full strategy is loaded
  useEffect(() => {
    if (fullStrategy && fullStrategy.id === data.strategyId) {
      updateData({ selectedStrategy: fullStrategy });
    }
  }, [fullStrategy, data.strategyId]);

  const handleSelect = (strategyId: string) => {
    // Optimistically set the ID, selectedStrategy will be null until fetched
    updateData({
      strategyId,
      selectedStrategy: null, // Reset until full load
    });
  };

  if (isListLoading) {
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
          <div key={strategy.id} className="relative">
            <RadioGroupItem
              value={strategy.id}
              id={strategy.id}
              className="peer sr-only"
            />
            <Label
              htmlFor={strategy.id}
              className="flex flex-col justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="font-semibold truncate pr-2 text-base"
                    title={strategy.name}
                  >
                    {strategy.name}
                  </span>
                  {/* Loading spinner if this specific card is selected but loading */}
                  {data.strategyId === strategy.id && isFullStrategyLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                  {strategy.description || "No description available."}
                </p>

                {/* Performance Badges */}
                <div className="pt-1">
                  <StrategyPerformanceBadges
                    summary={strategy.latestBacktestSummary}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
                {/* Key Indicators (Mocked or if available in list) 
                     Note: KeyIndicatorBadges requires full Strategy object usually, 
                     but we can try to pass what we have or skip if not in list.
                     StrategyInList doesn't have rules, so we can't show indicators here 
                     unless we fetch them. For now, we'll skip KeyIndicatorBadges 
                     or use a simplified version if needed. 
                     Actually, StrategyInList doesn't have rules. 
                     So we will just show the target coin/timeframe if available.
                 */}
                <div className="text-xs text-muted-foreground">
                  {/* StrategyInList doesn't have targetCoins usually unless added. 
                        Assuming it might not be there. If not, show nothing or placeholder.
                        Let's check the type definition again. StrategyInList doesn't have targetCoins.
                        So we can't show symbol/timeframe here easily without full fetch.
                        We will rely on the Performance Badges which are the most important.
                    */}
                  <span className="block">
                    Created: {new Date(strategy.createdAt).toLocaleDateString()}
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
