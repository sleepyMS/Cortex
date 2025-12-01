// file: frontend/src/components/domain/backtesting/EquityChart.tsx

"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "next-themes";
import { UTCTimestamp } from "lightweight-charts";

export interface ChartDataPoint {
  time: UTCTimestamp;
  value: number;
}

interface EquityChartProps {
  pnlData: ChartDataPoint[];
  benchmarkData?: ChartDataPoint[];
  height?: number;
  dark?: boolean;
}

const EquityChart: React.FC<EquityChartProps> = ({
  pnlData,
  benchmarkData,
  height = 280,
  dark = false,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = dark || resolvedTheme === "dark";

  // Transform data for Recharts
  const chartData = useMemo(() => {
    if (!pnlData || pnlData.length === 0) return [];

    // Create a map of benchmark data by timestamp
    const benchmarkMap = new Map(
      benchmarkData?.map((d) => [d.time, d.value]) || []
    );

    return pnlData.map((point) => ({
      date: new Date(point.time * 1000).toLocaleDateString(),
      timestamp: point.time,
      pnl: point.value,
      benchmark: benchmarkMap.get(point.time) || null,
    }));
  }, [pnlData, benchmarkData]);

  const hasBenchmark = benchmarkData && benchmarkData.length > 0;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={isDark ? "#818cf8" : "#2563eb"}
              stopOpacity={0.4}
            />
            <stop
              offset="95%"
              stopColor={isDark ? "#818cf8" : "#2563eb"}
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
          tickFormatter={(value) => `$${value.toLocaleString()}`}
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
                      <span className="text-muted-foreground">PnL:</span>
                      <span className="font-mono font-bold text-primary">
                        ${data.pnl.toLocaleString()}
                      </span>
                    </div>
                    {hasBenchmark && data.benchmark != null && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          Benchmark:
                        </span>
                        <span className="font-mono font-semibold text-yellow-500">
                          ${data.benchmark.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        {hasBenchmark && (
          <Legend
            wrapperStyle={{
              paddingTop: "10px",
              fontSize: "12px",
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="pnl"
          stroke={isDark ? "#818cf8" : "#2563eb"}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorPnl)"
          name="PNL"
        />
        {hasBenchmark && (
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke={isDark ? "#eab308" : "#f59e0b"}
            strokeWidth={2}
            dot={false}
            name="Benchmark"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default EquityChart;
