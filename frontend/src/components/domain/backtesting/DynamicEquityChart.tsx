// file: frontend/src/components/domain/backtesting/DynamicEquityChart.tsx

"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/Skeleton";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChartDataPoint } from "./EquityChart";
import { AreaData, UTCTimestamp } from "lightweight-charts";

const EquityChartClient = dynamic(() => import("./EquityChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full" />,
});

interface DynamicEquityChartProps {
  // result 객체에서 pnl_curve_json을 추출하여 내려줍니다.
  pnlData: AreaData<UTCTimestamp>[];
  benchmarkData?: ChartDataPoint[]; // Optional benchmark data
  title?: string;
}

export const DynamicEquityChart = ({
  pnlData,
  benchmarkData,
  title,
}: DynamicEquityChartProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "자산 곡선 (Equity Curve)"}</CardTitle>
      </CardHeader>
      <CardContent className="animate-fadeIn">
        <EquityChartClient
          pnlData={pnlData ?? []}
          benchmarkData={benchmarkData ?? []}
          dark={resolvedTheme === "dark"}
        />
      </CardContent>
    </Card>
  );
};
