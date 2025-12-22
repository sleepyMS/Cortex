// file: frontend/src/components/domain/optimization/OOSPerformanceChart.tsx

"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { AreaData, UTCTimestamp } from "lightweight-charts";

import { Skeleton } from "@/components/ui/Skeleton";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { Info } from "lucide-react";

// 백테스팅 도메인의 EquityChart를 재사용합니다.
const EquityChartClient = dynamic(
  () => import("@/components/domain/backtesting/EquityChart"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[310px] w-full" />,
  }
);

interface OOSPerformanceChartProps {
  /**
   * WFO 결과로 생성된 OOS 수익 곡선 데이터
   * lightweight-charts의 AreaData<UTCTimestamp> 배열 형태여야 합니다.
   */
  oosCurveData: AreaData<UTCTimestamp>[];
}

export const OOSPerformanceChart = ({
  oosCurveData,
}: OOSPerformanceChartProps) => {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("OptimizationDetailPage.WfoAnalysis");

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">
            {t("oosPerformanceTitle")}
          </CardTitle>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground opacity-70" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{t("oosPerformanceTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Out-of-Sample
        </Badge>
      </CardHeader>
      <CardContent className="pt-4 animate-fadeIn">
        <div className="h-[310px] w-full">
          {oosCurveData && oosCurveData.length > 0 ? (
            <EquityChartClient
              pnlData={oosCurveData}
              dark={resolvedTheme === "dark"}
              // WFO 차트는 일반적으로 벤치마크 없이 전략 자체의 순수 성과 검증에 집중합니다.
              // 필요시 benchmarkData props를 추가할 수 있습니다.
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/20 rounded-md border border-dashed">
              <p className="text-sm text-muted-foreground">
                {t("noChartData")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
