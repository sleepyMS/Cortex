// file: frontend/src/components/domain/profile/FeaturedStrategyCard.tsx

"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Star, HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";
// --- 👇 [1. 핵심 수정] 상세 타입 대신, 요약 타입(StrategyInList)을 임포트합니다. ---
import { StrategyInList } from "@/types/strategy";

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

// --- 👇 [2. 핵심 수정] Props 타입을 StrategyInList로 변경합니다. ---
interface FeaturedStrategyCardProps {
  strategy: StrategyInList;
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
        <CardContent>
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
          {/* --- 👆 [3. 핵심 수정] 상세 규칙을 보여주던 KeyIndicatorBadges를 제거합니다. --- */}
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            {/* 이 링크는 전략 '상세보기' 페이지가 아닌, 마켓플레이스 '상품' 페이지 등으로 변경될 수 있습니다. */}
            <Link href={`/strategies/${strategy.id}`}>{t("viewStrategy")}</Link>
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}
