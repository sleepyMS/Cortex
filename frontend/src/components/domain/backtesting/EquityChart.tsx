"use client";

import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineStyle,
  PriceScaleMode,
} from "lightweight-charts";
import { useTheme } from "next-themes";

// lightweight-charts가 기대하는 데이터 형식
export interface ChartDataPoint {
  time: string; // 'YYYY-MM-DD' 형식
  value: number;
}

interface EquityChartProps {
  pnlData: ChartDataPoint[];
  // 향후 벤치마크 비교 기능 추가를 위한 확장 포인트
  benchmarkData?: ChartDataPoint[];
}

export const EquityChart = ({ pnlData, benchmarkData }: EquityChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const benchmarkSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartContainerRef.current || pnlData.length === 0) return;

    // --- 테마에 따른 차트 옵션 설정 ---
    const isDarkMode = theme === "dark";
    const chartOptions = {
      layout: {
        background: { color: "transparent" },
        textColor: isDarkMode ? "#D1D5DB" : "#1F2937",
      },
      grid: {
        vertLines: { color: isDarkMode ? "#374151" : "#E5E7EB" },
        horzLines: { color: isDarkMode ? "#374151" : "#E5E7EB" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: isDarkMode ? "#374151" : "#E5E7EB",
      },
      rightPriceScale: {
        borderColor: isDarkMode ? "#374151" : "#E5E7EB",
      },
      crosshair: {
        // ... (필요 시 커스텀)
      },
    };

    // --- 차트 생성 및 시리즈 추가 ---
    // 차트가 없으면 새로 생성, 있으면 옵션만 업데이트
    if (!chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, chartOptions);

      // 1. PNL(자산) 곡선 시리즈 (Area 차트)
      seriesRef.current = chartRef.current.addAreaSeries({
        lineColor: "#2563EB",
        topColor: "rgba(37, 99, 235, 0.4)",
        bottomColor: "rgba(37, 99, 235, 0.0)",
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });

      // 2. 벤치마크 시리즈 (Line 차트) - 데이터가 있을 경우에만 추가
      if (benchmarkData) {
        benchmarkSeriesRef.current = chartRef.current.addLineSeries({
          color: "#F59E0B", // Amber color
          lineWidth: 2,
          lineStyle: LineStyle.Dotted,
        });
      }
    } else {
      chartRef.current.applyOptions(chartOptions);
    }

    // --- 데이터 설정 ---
    seriesRef.current?.setData(pnlData);
    if (benchmarkData && benchmarkSeriesRef.current) {
      benchmarkSeriesRef.current.setData(benchmarkData);
    }

    chartRef.current.timeScale().fitContent();

    // --- 리사이즈 핸들러 ---
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && entries[0].contentRect.width > 0) {
        chartRef.current?.applyOptions({
          width: entries[0].contentRect.width,
        });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    // --- 컴포넌트 언마운트 시 클린업 ---
    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [pnlData, benchmarkData, theme]); // 데이터나 테마 변경 시 effect 재실행

  if (pnlData.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">
          차트를 표시할 데이터가 없습니다.
        </p>
      </div>
    );
  }

  return <div ref={chartContainerRef} className="h-96 w-full" />;
};
