// file: frontend/src/components/domain/strategy/StrategyListingPreview.tsx (최종 수정)
"use client";

import { useTranslations } from "next-intl";
import { Strategy } from "@/types/strategy";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { Separator } from "@/components/ui/Separator";
import { useMemo } from "react";
import { StrategyPerformanceBadges } from "./StrategyPerformanceBadges";
import { KeyIndicatorBadges } from "./KeyIndicatorBadges";

interface StrategyListingPreviewProps {
  strategy: Strategy;
}

export const StrategyListingPreview = ({
  strategy,
}: StrategyListingPreviewProps) => {
  const t = useTranslations("StrategyListingPreview");

  return (
    <Card className="bg-muted/50 border-dashed">
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
          {/* [변경] 신규 컴포넌트 사용 */}
          <StrategyPerformanceBadges summary={strategy.latestBacktestSummary} />
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
