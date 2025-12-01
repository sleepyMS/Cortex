// file: frontend/src/components/domain/bots/detail/DynamicPriceCandlestickChart.tsx

"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp } from "lucide-react";

const PriceCandlestickChartClient = dynamic(
  () =>
    import("./PriceCandlestickChart").then((mod) => ({
      default: mod.PriceCandlestickChart,
    })),
  {
    ssr: false,
    loading: () => (
      <Card className="h-full border-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Loading Chart...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[500px] rounded-lg" />
        </CardContent>
      </Card>
    ),
  }
);

export default function DynamicPriceCandlestickChart(
  props: React.ComponentProps<typeof PriceCandlestickChartClient>
) {
  return <PriceCandlestickChartClient {...props} />;
}
