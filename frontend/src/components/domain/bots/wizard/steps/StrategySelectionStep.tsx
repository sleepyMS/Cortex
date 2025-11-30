"use client";

import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { WizardData } from "../BotWizard";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { Strategy, StrategyInList } from "@/types/strategy";
import { Skeleton } from "@/components/ui/Skeleton";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
                  {strategy.description || t("noDescription")}
                </p>

                {/* Performance Metrics */}
                <div className="pt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="flex flex-col bg-muted/50 p-2 rounded-lg">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      {t("score")}
                    </span>
                    <span className="font-bold text-sm text-primary">
                      {strategy.latestBacktestSummary?.backtestScore
                        ? Math.round(
                            strategy.latestBacktestSummary.backtestScore
                          )
                        : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col bg-muted/50 p-2 rounded-lg">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      {t("return")}
                    </span>
                    <span
                      className={cn(
                        "font-bold text-sm",
                        (strategy.latestBacktestSummary?.totalReturnPct || 0) >=
                          0
                          ? "text-green-500"
                          : "text-red-500"
                      )}
                    >
                      {strategy.latestBacktestSummary?.totalReturnPct
                        ? `${strategy.latestBacktestSummary.totalReturnPct.toFixed(
                            1
                          )}%`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex flex-col bg-muted/50 p-2 rounded-lg">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      {t("mdd")}
                    </span>
                    <span className="font-bold text-sm text-red-500">
                      {strategy.latestBacktestSummary?.mddPct
                        ? `${strategy.latestBacktestSummary.mddPct.toFixed(1)}%`
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 w-full">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      {t("symbol")}
                    </span>
                    <span className="font-semibold text-sm">
                      {strategy.targetCoins && strategy.targetCoins.length > 0
                        ? strategy.targetCoins[0].ticker
                        : t("any")}
                    </span>
                  </div>

                  {/* Timeframe is not directly available in StrategyInList, but we can show created date or just omit it if not critical */}
                  <div className="flex flex-col text-right ml-auto">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      {t("created")}
                    </span>
                    <span className="font-medium text-sm">
                      {new Date(strategy.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {strategies?.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          {t("noStrategies")}
        </div>
      )}
    </div>
  );
}
