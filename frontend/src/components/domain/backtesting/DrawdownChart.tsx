// file: frontend/src/components/domain/backtesting/DrawdownChart.tsx

"use client";

import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useTheme } from "next-themes";
import { UTCTimestamp } from "lightweight-charts";
import { formatChartDate } from "@/lib/dateUtils";

export interface ChartDataPoint {
  time: UTCTimestamp;
  value: number;
}

interface DrawdownChartProps {
  drawdownData: ChartDataPoint[];
  height?: number;
  dark?: boolean;
}

const DrawdownChart: React.FC<DrawdownChartProps> = ({
  drawdownData,
  height = 280,
  dark = false,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = dark || resolvedTheme === "dark";

  // Transform data for Recharts
  const chartData = useMemo(() => {
    if (!drawdownData || drawdownData.length === 0) return [];

    return drawdownData.map((point) => ({
      date: formatChartDate(point.time as number),
      timestamp: point.time,
      drawdown: point.value,
      drawdownPct: point.value.toFixed(2), // Already in decimal format
    }));
  }, [drawdownData]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={isDark ? "#ef4444" : "#dc2626"}
              stopOpacity={0.4}
            />
            <stop
              offset="95%"
              stopColor={isDark ? "#ef4444" : "#dc2626"}
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke={isDark ? "rgba(42,46,57,0.3)" : "rgba(197,203,206,0.3)"}
        />
        <XAxis
          dataKey="date"
          stroke={isDark ? "#9ca3af" : "#6b7280"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke={isDark ? "#9ca3af" : "#6b7280"}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value.toFixed(0)}%`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-md text-sm max-w-[280px]">
                  <p className="font-semibold mb-2 text-foreground">
                    {data.date}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Drawdown:</span>
                      <span className="font-mono font-bold text-red-500">
                        {data.drawdownPct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine
          y={0}
          stroke={isDark ? "#4b5563" : "#d1d5db"}
          strokeDasharray="3 3"
        />
        <Area
          type="monotone"
          dataKey="drawdown"
          stroke={isDark ? "#ef4444" : "#dc2626"}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorDrawdown)"
          name="Drawdown"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default DrawdownChart;
