// file: frontend/src/components/domain/backtesting/DrawdownChart.tsx

import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  PriceScaleMode,
  LineStyle,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type AreaData,
  type UTCTimestamp,
  type DeepPartial,
  type ChartOptions,
  type AreaSeriesOptions,
} from "lightweight-charts";

export type ChartDataPoint = AreaData<UTCTimestamp>;

interface DrawdownChartProps {
  drawdownData: ChartDataPoint[];
  height?: number;
  dark?: boolean;
}

const getThemeOptions = (dark: boolean): DeepPartial<ChartOptions> => ({
  layout: {
    background: { type: ColorType.Solid, color: dark ? "#020817" : "#FFFFFF" },
    textColor: dark ? "rgba(219,222,227,0.9)" : "#191919",
  },
  grid: {
    vertLines: { color: dark ? "rgba(42,46,57,0.3)" : "rgba(197,203,206,0.3)" },
    horzLines: { color: dark ? "rgba(42,46,57,0.3)" : "rgba(197,203,206,0.3)" },
  },
});

const getAreaSeriesTheme = (dark: boolean): DeepPartial<AreaSeriesOptions> => ({
  lineColor: dark ? "rgba(244, 63, 94, 1)" : "#EF4444",
  topColor: dark ? "rgba(244, 63, 94, 0.4)" : "rgba(239, 68, 68, 0.4)",
  bottomColor: dark ? "rgba(244, 63, 94, 0.0)" : "rgba(239, 68, 68, 0.0)",
});

const DrawdownChart: React.FC<DrawdownChartProps> = ({
  drawdownData,
  height = 280,
  dark = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      ...getThemeOptions(dark), // 초기 테마 적용
      rightPriceScale: { borderVisible: false },
      timeScale: {
        rightOffset: 8,
        barSpacing: 6,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { style: LineStyle.Dashed },
        horzLine: { style: LineStyle.Dashed },
      },
    });
    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      ...getAreaSeriesTheme(dark), // 초기 테마 적용
      priceLineVisible: false,
      lastValueVisible: true,
      title: "Drawdown",
      priceFormat: {
        type: "custom",
        formatter: (price: number) => `${price.toFixed(2)}%`,
      },
    });

    areaRef.current = areaSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions(getThemeOptions(dark));
    areaRef.current?.applyOptions(getAreaSeriesTheme(dark));
  }, [dark]);

  useEffect(() => {
    if (areaRef.current && drawdownData) {
      areaRef.current.setData(drawdownData);
      chartRef.current?.timeScale().fitContent();
    }
  }, [drawdownData]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height }}
      aria-label="drawdown-chart"
    />
  );
};

export default DrawdownChart;
