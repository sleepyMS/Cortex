// file: frontend/src/components/domain/backtesting/DynamicDrawdownChart.tsx

"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChartDataPoint } from "./DrawdownChart";

const DrawdownChartClient = dynamic(() => import("./DrawdownChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] w-full" />, // 높이를 DrawdownChart 기본값과 맞춤
});

interface DynamicDrawdownChartProps {
  drawdownData: ChartDataPoint[];
  title?: string;
}

export const DynamicDrawdownChart = ({
  drawdownData,
  title,
}: DynamicDrawdownChartProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "드로우다운 곡선 (Drawdown Curve)"}</CardTitle>
      </CardHeader>
      <CardContent>
        <DrawdownChartClient
          drawdownData={drawdownData ?? []}
          dark={resolvedTheme === "dark"}
        />
      </CardContent>
    </Card>
  );
};
