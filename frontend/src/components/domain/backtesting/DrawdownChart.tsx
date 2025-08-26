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
} from "lightweight-charts";

// 이 컴포넌트에서 사용할 데이터 포인트 타입을 명확히 정의합니다.
export type ChartDataPoint = AreaData<UTCTimestamp>;

interface DrawdownChartProps {
  drawdownData: ChartDataPoint[];
  height?: number;
  dark?: boolean;
}

const DrawdownChart: React.FC<DrawdownChartProps> = ({
  drawdownData,
  height = 200, // MDD 차트는 조금 더 작게 설정
  dark = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // 차트의 생성, 업데이트, 정리를 모두 하나의 useEffect에서 관리합니다.
  useEffect(() => {
    if (!containerRef.current || !drawdownData) return;

    // 차트 생성
    const chart = createChart(containerRef.current, {
      height,
      width: containerRef.current.clientWidth,
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
      rightPriceScale: {
        mode: PriceScaleMode.Normal,
        borderVisible: false,
      },
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

    // MDD 시각화를 위한 Area 시리즈 추가 (붉은 계열 색상)
    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: dark ? "rgba(244, 63, 94, 1)" : "#EF4444",
      topColor: dark ? "rgba(244, 63, 94, 0.4)" : "rgba(239, 68, 68, 0.4)",
      bottomColor: dark ? "rgba(244, 63, 94, 0.0)" : "rgba(239, 68, 68, 0.0)",
      priceLineVisible: false,
      lastValueVisible: true,
      title: "Drawdown",
    });

    // [핵심] 가격 축(Y축) 포맷터를 사용하여 '%' 기호를 붙여줍니다.
    areaSeries.priceScale().applyOptions({
      format: {
        type: "custom",
        formatter: (price: number) => `${price.toFixed(2)}%`,
      },
    });

    // 데이터 설정
    areaSeries.setData(drawdownData);
    chart.timeScale().fitContent();

    // 리사이즈 핸들러
    const handleResize = () => {
      chart.applyOptions({ width: containerRef.current!.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    // React 18 Strict Mode 에러를 방지하는 올바른 정리(cleanup) 로직
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [drawdownData, height, dark]); // 모든 의존성을 포함

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height }}
      aria-label="drawdown-chart"
    />
  );
};

export default DrawdownChart;
