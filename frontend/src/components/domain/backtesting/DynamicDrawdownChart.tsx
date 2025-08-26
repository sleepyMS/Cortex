import React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChartDataPoint } from "./DrawdownChart";

const DrawdownChartClient = dynamic(() => import("./DrawdownChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full" />,
});

interface DynamicDrawdownChartProps {
  drawdownData: ChartDataPoint[];
  title?: string;
}

export const DynamicDrawdownChart = ({
  drawdownData,
  title,
}: DynamicDrawdownChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "드로우다운 곡선 (Drawdown Curve)"}</CardTitle>
      </CardHeader>
      <CardContent>
        <DrawdownChartClient drawdownData={drawdownData ?? []} />
      </CardContent>
    </Card>
  );
};
