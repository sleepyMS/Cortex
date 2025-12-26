// file: frontend/src/components/domain/strategy/StrategyPerformanceBadges.tsx
"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Strategy } from "@/types/strategy";
import {
  Zap,
  ShieldCheck,
  TrendingDown,
  Sigma,
  Scaling,
  Filter,
} from "lucide-react";

// UI 컴포넌트
import { Badge } from "@/components/ui/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

interface Props {
  summary: Strategy["latestBacktestSummary"];
}

// 개별 뱃지 컴포넌트
const MetricBadge = ({
  label,
  value,
  unit,
  tooltip,
  icon: Icon,
  colorClass,
}: any) => {
  if (value === null || value === undefined) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 hover:scale-105 cursor-help shadow-sm",
            colorClass
          )}
        >
          <Icon className="h-3.5 w-3.5 opacity-80" />
          <span className="tabular-nums">
            {value.toFixed(2)}
            {unit}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="p-2 max-w-[200px]">
        <p className="font-bold text-xs mb-0.5">{label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">
          {tooltip}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export const StrategyPerformanceBadges = ({ summary }: Props) => {
  const t = useTranslations("StrategyPerformanceBadges");
  if (!summary) return null;

  const totalReturnPct = summary.totalReturnPct;
  const winRatePct = summary.winRatePct;
  const mddPct = summary.mddPct;
  const sharpeRatio = (summary as any).sharpeRatio;
  const profitFactor = (summary as any).profitFactor;
  const sortinoRatio = (summary as any).sortinoRatio;
  const isProfitable = totalReturnPct !== null && totalReturnPct >= 0;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center flex-wrap gap-2">
        <MetricBadge
          label={t("totalReturnLabel")}
          value={totalReturnPct}
          unit="%"
          tooltip={t("totalReturnTooltip")}
          icon={Zap}
          colorClass={
            isProfitable
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300/50"
              : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300/50"
          }
        />
        <MetricBadge
          label={t("winRateLabel")}
          value={winRatePct}
          unit="%"
          tooltip={t("winRateTooltip")}
          icon={ShieldCheck}
          colorClass="bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-300/50"
        />
        <MetricBadge
          label={t("mddLabel")}
          value={mddPct}
          unit="%"
          tooltip={t("mddTooltip")}
          icon={TrendingDown}
          colorClass="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300/50"
        />
        <MetricBadge
          label={t("sharpeLabel")}
          value={sharpeRatio}
          unit=""
          tooltip={t("sharpeTooltip")}
          icon={Sigma}
          colorClass="bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-violet-300/50"
        />
        <MetricBadge
          label={t("profitFactorLabel")}
          value={profitFactor}
          unit=""
          tooltip={t("profitFactorTooltip")}
          icon={Scaling}
          colorClass="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-400/50"
        />
        <MetricBadge
          label={t("sortinoLabel")}
          value={sortinoRatio}
          unit=""
          tooltip={t("sortinoTooltip")}
          icon={Filter}
          colorClass="bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-300/50"
        />
      </div>
    </TooltipProvider>
  );
};
