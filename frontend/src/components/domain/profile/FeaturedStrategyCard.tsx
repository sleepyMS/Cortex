// file: frontend/src/components/domain/profile/FeaturedStrategyCard.tsx

"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Star, HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Strategy } from "@/types/strategy";

// --- 재사용 컴포넌트 임포트 ---
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { KeyIndicatorBadges } from "../strategy/KeyIndicatorBadges";

interface FeaturedStrategyCardProps {
  strategy: Strategy;
}

export function FeaturedStrategyCard({ strategy }: FeaturedStrategyCardProps) {
  const t = useTranslations("FeaturedStrategyCard");
  const summary = strategy.latestBacktestSummary;

  return (
    <TooltipProvider delayDuration={100}>
      <Card className="transition-all hover:shadow-xl hover:border-primary/50 w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-500">
            <Star className="h-5 w-5 fill-current" />
            <p className="font-semibold">{t("featuredLabel")}</p>
          </div>
          <CardTitle className="mt-2 text-xl font-bold">
            {strategy.name}
          </CardTitle>
          <CardDescription className="line-clamp-2 min-h-[40px]">
            {strategy.description || t("noDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 1. BacktestCard의 핵심 성과 표시 UI를 차용 */}
          <div className="flex justify-around text-center border-y py-4">
            <div className="w-1/2 border-r">
              <Tooltip>
                <TooltipTrigger className="cursor-help w-full">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    {t("totalReturn")}
                    <HelpCircle className="h-3.5 w-3.5" />
                  </div>
                  <p
                    className={cn(
                      "text-2xl font-bold mt-1",
                      summary && summary.totalReturnPct !== null
                        ? summary.totalReturnPct >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                        : "text-muted-foreground"
                    )}
                  >
                    {summary?.totalReturnPct?.toFixed(2) ?? "N/A"}%
                  </p>
                </TooltipTrigger>
                <TooltipContent>{t("totalReturnTooltip")}</TooltipContent>
              </Tooltip>
            </div>
            <div className="w-1/2">
              <Tooltip>
                <TooltipTrigger className="cursor-help w-full">
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    {t("winRate")}
                    <HelpCircle className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {summary?.winRatePct?.toFixed(1) ?? "N/A"}%
                  </p>
                </TooltipTrigger>
                <TooltipContent>{t("winRateTooltip")}</TooltipContent>
              </Tooltip>
            </div>
          </div>
          {/* 2. StrategyCard의 핵심 지표 뱃지 UI를 재사용 */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
              {t("keyIndicators")}
            </h4>
            <div className="min-h-[24px]">
              <KeyIndicatorBadges strategy={strategy} />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href={`/strategies/${strategy.id}`}>{t("viewStrategy")}</Link>
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
