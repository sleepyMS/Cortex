// file: frontend/src/components/domain/strategy/StrategyListingPreview.tsx
"use client";

import { useTranslations } from "next-intl";
import { Strategy, LogicBlock } from "@/types/strategy";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Zap,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Code,
} from "lucide-react";

// StrategyCard에서 가져온 성과 뱃지 컴포넌트 (재사용)
const PerformanceBadges = ({ strategy }: { strategy: Strategy }) => {
  if (!strategy.latestBacktestSummary) {
    return null;
  }
  const { totalReturnPct, winRatePct } = strategy.latestBacktestSummary;
  const isProfitable = totalReturnPct !== null && totalReturnPct >= 0;

  return (
    <div className="flex items-center gap-2">
      <Badge
        className={cn(
          "flex items-center gap-1.5",
          isProfitable
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300/50"
            : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300/50"
        )}
      >
        <Zap className="h-3.5 w-3.5" />
        <span>{totalReturnPct?.toFixed(2) ?? "N/A"}%</span>
      </Badge>
      <Badge variant="secondary" className="flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>{winRatePct?.toFixed(1) ?? "N/A"}%</span>
      </Badge>
    </div>
  );
};

// StrategyCard에서 가져온 핵심 지표 로직 (재사용)
const KeyIndicatorBadges = ({ strategy }: { strategy: Strategy }) => {
  const { keyIndicators, strategyType } = useMemo(() => {
    const hasLong =
      strategy.longEntryRules && strategy.longEntryRules.blocks.length > 0;
    const hasShort =
      strategy.shortEntryRules && strategy.shortEntryRules.blocks.length > 0;

    let type = { label: "Custom", icon: Code };
    if (hasLong && hasShort)
      type = { label: "Long/Short", icon: ArrowRightLeft };
    else if (hasLong) type = { label: "Long Only", icon: TrendingUp };
    else if (hasShort) type = { label: "Short Only", icon: TrendingDown };

    const indicators = new Set<string>();
    const rulesets = [
      strategy.longEntryRules,
      strategy.longExitRules,
      strategy.shortEntryRules,
      strategy.shortExitRules,
    ];

    const extractIndicators = (blocks: LogicBlock[]) => {
      blocks.forEach((block) => {
        if ("indicator" in block && block.indicator)
          indicators.add(block.indicator.indicatorKey);
        if (
          "operandA" in block &&
          typeof block.operandA === "object" &&
          block.operandA
        )
          indicators.add(block.operandA.indicatorKey);
        if (
          "operandB" in block &&
          typeof block.operandB === "object" &&
          block.operandB
        )
          indicators.add(block.operandB.indicatorKey);
        if (
          "mainLine" in block &&
          block.mainLine &&
          typeof block.mainLine === "object"
        )
          indicators.add(block.mainLine.indicatorKey);
        if (block.children) extractIndicators(block.children);
      });
    };

    rulesets.forEach((rs) => {
      if (rs) extractIndicators(rs.blocks);
    });

    return {
      strategyType: type,
      keyIndicators: Array.from(indicators).slice(0, 3),
    };
  }, [strategy]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="flex items-center gap-1">
        <strategyType.icon className="h-3 w-3" />
        <span>{strategyType.label}</span>
      </Badge>
      {keyIndicators.map((key) => (
        <Badge key={key} variant="secondary">
          {key}
        </Badge>
      ))}
    </div>
  );
};

interface StrategyListingPreviewProps {
  strategy: Strategy;
}

export const StrategyListingPreview = ({
  strategy,
}: StrategyListingPreviewProps) => {
  const t = useTranslations("StrategyListingPreview");

  return (
    <Card className="bg-muted/50 border-dashed h-full">
      <CardHeader>
        <CardTitle className="text-2xl">{strategy.name}</CardTitle>
        <CardDescription className="line-clamp-3 min-h-[60px]">
          {strategy.description || t("noDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Separator />
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            {t("performanceTitle")}
          </h4>
          <PerformanceBadges strategy={strategy} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">
            {t("indicatorsTitle")}
          </h4>
          <KeyIndicatorBadges strategy={strategy} />
        </div>
      </CardContent>
    </Card>
  );
};
