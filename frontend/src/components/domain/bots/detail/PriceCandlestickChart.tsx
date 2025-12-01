"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  CrosshairMode,
  CandlestickSeries,
} from "lightweight-charts";
import { TrendingUp } from "lucide-react";
import { useTheme } from "next-themes";

interface PriceCandlestickChartProps {
  ticker: string;
  ohlcvData?: CandlestickData<UTCTimestamp>[];
  entryPrice?: number | null | undefined;
}

export function PriceCandlestickChart({
  ticker,
  ohlcvData = [],
  entryPrice,
}: PriceCandlestickChartProps) {
  const t = useTranslations("LiveTrading.Detail");
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  // Chart initialization
  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = resolvedTheme === "dark";

    const chart = createChart(containerRef.current, {
      height: 500,
      layout: {
        background: {
          type: ColorType.Solid,
          color: isDark ? "#020817" : "#FFFFFF",
        },
        textColor: isDark ? "#D1D5DB" : "#1F2937",
      },
      grid: {
        vertLines: { color: isDark ? "#374151" : "#E5E7EB" },
        horzLines: { color: isDark ? "#374151" : "#E5E7EB" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: isDark ? "#374151" : "#E5E7EB",
      },
      timeScale: {
        borderColor: isDark ? "#374151" : "#E5E7EB",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) {
        chart.resize(width, 500);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
    };
  }, [resolvedTheme]);

  // Update data
  useEffect(() => {
    if (candlestickSeriesRef.current && ohlcvData.length > 0) {
      candlestickSeriesRef.current.setData(ohlcvData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [ohlcvData]);

  // Update entry price marker
  useEffect(() => {
    if (chartRef.current && entryPrice && candlestickSeriesRef.current) {
      candlestickSeriesRef.current.createPriceLine({
        price: entryPrice,
        color: "#f59e0b",
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: "Entry",
      });
    }
  }, [entryPrice]);

  return (
    <Card className="h-full border-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t("chartTitle")} - {ticker}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ohlcvData.length > 0 ? (
          <div ref={containerRef} className="w-full" />
        ) : (
          <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
            <div className="rounded-full bg-muted p-4 mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">Loading price data...</p>
            <p className="text-sm mt-2 text-center max-w-sm">
              Candlestick chart will display once market data is loaded
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
