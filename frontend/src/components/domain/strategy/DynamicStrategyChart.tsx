// file: frontend/src/components/domain/strategy/DynamicStrategyChart.tsx

"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/Skeleton";

const Chart = dynamic(() => import("./StrategyChart"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-[400px] rounded-lg" />,
});

export default function DynamicStrategyChart(
  props: React.ComponentProps<typeof Chart>
) {
  return <Chart {...props} />;
}
