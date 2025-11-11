// file: frontend/src/components/domain/strategy/KeyIndicatorBadges.tsx (신규 파일)
"use client";

import { useMemo } from "react";
import { Strategy, LogicBlock } from "@/types/strategy";
import { Badge } from "@/components/ui/Badge";
import { TrendingUp, TrendingDown, ArrowRightLeft, Code } from "lucide-react";

interface Props {
  strategy: Strategy;
}

export const KeyIndicatorBadges = ({ strategy }: Props) => {
  const { keyIndicators, strategyType } = useMemo(() => {
    const hasLong = (strategy.longEntryRules?.blocks?.length ?? 0) > 0;
    const hasShort = (strategy.shortEntryRules?.blocks?.length ?? 0) > 0;

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
      keyIndicators: Array.from(indicators).slice(0, 3), // 최대 3개까지만 표시
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
