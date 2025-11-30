"use client";

import { createChart, ColorType, IChartApi } from "lightweight-charts";
import { useEffect, useRef } from "react";

export function BotChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#334155" },
        horzLines: { color: "#334155" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    chartRef.current = chart;

    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    // Mock Data
    const data = [
      { time: "2023-12-01", open: 100, high: 105, low: 98, close: 103 },
      { time: "2023-12-02", open: 103, high: 106, low: 101, close: 104 },
      { time: "2023-12-03", open: 104, high: 110, low: 104, close: 108 },
      { time: "2023-12-04", open: 108, high: 109, low: 102, close: 102 },
      { time: "2023-12-05", open: 102, high: 105, low: 100, close: 104 },
    ];

    candleSeries.setData(data);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Live Chart (BTC/USDT)</h3>
        <div className="flex gap-2">
          {/* Timeframe selectors could go here */}
          <span className="text-xs text-muted-foreground">1H</span>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full h-[400px]" />
    </div>
  );
}
