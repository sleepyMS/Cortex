// file: frontend/src/components/domain/optimization/TrialDetailSheet.tsx
"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { TrialData } from "@/types/optimization";
import { Strategy } from "@/types/strategy";
import { getReadableParamLabel } from "@/lib/strategy-utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { Skeleton } from "@/components/ui/Skeleton";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { cn } from "@/lib/utils";
interface TrialDetailSheetProps {
  jobId: string;
  trialId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategy?: Strategy;
}
export function TrialDetailSheet({
  jobId,
  trialId,
  open,
  onOpenChange,
  strategy,
}: TrialDetailSheetProps) {
  const t = useTranslations("OptimizationDetailPage.TrialDetail");

  // Trial 데이터 fetch
  const { data: trial, isLoading } = useQuery<TrialData>({
    queryKey: ["trial", jobId, trialId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/optimizations/${jobId}/trials/${trialId}`
      );
      return response.data;
    },
    enabled: open && trialId !== null,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Trial #{trialId}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {isLoading ? (
            <LoadingSkeleton />
          ) : trial ? (
            <div className="space-y-6 pr-4">
              {/* Status Badge */}
              <div>
                <h3 className="text-sm font-medium mb-2">{t("status")}</h3>
                <Badge
                  variant={
                    trial.state === "COMPLETE"
                      ? "default"
                      : trial.state === "PRUNED"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {trial.state}
                </Badge>
              </div>
              <Separator />
              {/* Key Metrics */}
              {trial.metrics && (
                <>
                  <div>
                    <h3 className="text-sm font-medium mb-3">
                      {t("keyMetrics")}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCard
                        label={t("metrics.score")}
                        value={
                          trial.metrics.backtestScore?.toFixed(0) ?? undefined
                        }
                        suffix=""
                        trend={
                          (trial.metrics.backtestScore ?? 0) >= 70
                            ? "up"
                            : "down"
                        }
                      />
                      <MetricCard
                        label={t("metrics.totalReturn")}
                        value={
                          trial.metrics.totalReturnPct?.toFixed(2) ?? undefined
                        }
                        suffix="%"
                        trend={
                          (trial.metrics.totalReturnPct ?? 0) > 0
                            ? "up"
                            : "down"
                        }
                      />
                      <MetricCard
                        label={t("metrics.mdd")}
                        value={trial.metrics.mddPct?.toFixed(2) ?? undefined}
                        suffix="%"
                        trend="down"
                      />
                      <MetricCard
                        label={t("metrics.winRate")}
                        value={
                          trial.metrics.winRatePct?.toFixed(1) ?? undefined
                        }
                        suffix="%"
                        trend={
                          (trial.metrics.winRatePct ?? 0) >= 50 ? "up" : "down"
                        }
                      />
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              {/* Parameters */}
              {trial.params && (
                <div>
                  <h3 className="text-sm font-medium mb-3">
                    {t("parameters")}
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(trial.params).map(([key, value]) => {
                      // strategy-utils의 getReadableParamLabel 사용
                      const label = getReadableParamLabel(key, strategy);

                      return (
                        <div
                          key={key}
                          className="flex justify-between items-center p-2 bg-muted/30 rounded"
                        >
                          <span className="text-sm text-muted-foreground">
                            {label}
                          </span>
                          <span className="text-sm font-mono font-medium">
                            {typeof value === "number"
                              ? value.toFixed(2)
                              : String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <Separator />
              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  asChild
                  disabled={!trial.metrics}
                >
                  <a
                    href={`/backtester/trial_${jobId}_${trialId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t("viewFullBacktest")}
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("noData")}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
// Helper component for metric cards
function MetricCard({
  label,
  value,
  suffix,
  trend,
}: {
  label: string;
  value?: string;
  suffix: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="p-3 border rounded-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-lg font-bold font-mono">
          {value ?? "-"}
          {value && suffix}
        </p>
        {trend && value && (
          <>
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-500" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6 pr-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Separator />
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
      <Separator />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
