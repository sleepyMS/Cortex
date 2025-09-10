// file: frontend/src/components/domain/backtesting/EquityChart.tsx

import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  PriceScaleMode,
  LineStyle,
  AreaSeries,
  LineSeries,
  type UTCTimestamp,
  type IChartApi,
  type ISeriesApi,
  type AreaData,
  type LineData,
} from "lightweight-charts";

export type ChartDataPoint = AreaData<UTCTimestamp>;
export type BenchmarkDataPoint = LineData<UTCTimestamp>;

interface EquityChartProps {
  pnlData: ChartDataPoint[]; // AreaData[] 대신 더 명확한 타입 사용
  benchmarkData?: BenchmarkDataPoint[];
  height?: number;
  dark?: boolean;
}

const EquityChart: React.FC<EquityChartProps> = ({
  pnlData,
  benchmarkData,
  height = 320,
  dark = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);
  const benchRef = useRef<ISeriesApi<"Line"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // 차트 생성 및 옵션 설정을 담당하는 useEffect
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: {
          type: ColorType.Solid,
          color: dark ? "#0B1221" : "#FFFFFF",
        },
        textColor: dark ? "rgba(219,222,227,0.9)" : "#191919",
      },
      grid: {
        vertLines: {
          color: dark ? "rgba(42,46,57,0.3)" : "rgba(197,203,206,0.3)",
        },
        horzLines: {
          color: dark ? "rgba(42,46,57,0.3)" : "rgba(197,203,206,0.3)",
        },
      },
      rightPriceScale: { mode: PriceScaleMode.Normal, borderVisible: false },
      timeScale: {
        rightOffset: 8,
        barSpacing: 6,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { width: 1, style: LineStyle.Dashed, labelVisible: true },
        horzLine: { width: 1, style: LineStyle.Dashed, labelVisible: true },
      },
    });
    chartRef.current = chart;

    const area = chart.addSeries(AreaSeries, {
      lineColor: dark ? "rgba(129,140,248,1)" : "#2563EB",
      topColor: dark ? "rgba(129,140,248,0.40)" : "rgba(37,99,235,0.40)",
      bottomColor: dark ? "rgba(129,140,248,0.00)" : "rgba(37,99,235,0.00)",
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      priceLineVisible: false,
      lastValueVisible: true,
      title: "PNL",
    });
    areaRef.current = area;

    const bench = chart.addSeries(LineSeries, {
      color: dark ? "rgba(234,179,8,1)" : "#F59E0B",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      priceLineVisible: false,
      lastValueVisible: true,
      title: "Benchmark",
    });
    benchRef.current = bench;

    // 리사이즈 옵저버 설정
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    // 올바른 정리(cleanup) 함수
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null; // 참조도 정리
    };
  }, [height, dark]); // 이 useEffect는 차트의 기본 옵션이 변경될 때만 재실행

  // 데이터 업데이트만 담당하는 useEffect
  useEffect(() => {
    if (areaRef.current && pnlData) {
      areaRef.current.setData(pnlData);
      chartRef.current?.timeScale().fitContent();
    }
    if (benchRef.current) {
      if (benchmarkData && benchmarkData.length > 0) {
        benchRef.current.setData(benchmarkData);
        benchRef.current.applyOptions({ visible: true });
      } else {
        // 데이터가 없으면 시리즈를 숨김
        benchRef.current.setData([]);
        benchRef.current.applyOptions({ visible: false });
      }
    }
  }, [pnlData, benchmarkData]); // 이 useEffect는 데이터가 변경될 때만 재실행

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height }}
      aria-label="equity-chart"
    />
  );
};

export default EquityChart;
