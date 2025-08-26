import React from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ChartDataPoint } from "./EquityChart"; // 타입 공유

// 'EquityChart' 컴포넌트를 dynamic import로 불러오기
// ssr: false 옵션이 핵심입니다.
const EquityChartClient = dynamic(() => import("./EquityChart"), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full">
      <Skeleton className="h-full w-full" />
    </div>
  ),
});

interface DynamicEquityChartProps {
  // result 객체에서 pnl_curve_json을 추출하여 내려줍니다.
  pnlData: ChartDataPoint[];
  benchmarkData?: ChartDataPoint[]; // Optional benchmark data
  title?: string;
}

export const DynamicEquityChart = ({
  pnlData,
  benchmarkData,
  title,
}: DynamicEquityChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "자산 곡선 (Equity Curve)"}</CardTitle>
      </CardHeader>
      <CardContent>
        <EquityChartClient
          pnlData={pnlData ?? []}
          benchmarkData={benchmarkData ?? []}
        />
      </CardContent>
    </Card>
  );
};
