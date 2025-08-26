// EquityChart.tsx
import React, { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  PriceScaleMode,
  LineStyle,
  AreaSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type AreaData,
  type LineData,
} from "lightweight-charts";

type Props = {
  /** 영역(면적) 시리즈 데이터: { time, value } */
  data: AreaData[];
  /** 벤치마크 라인 시리즈(선택): { time, value } */
  benchmark?: LineData[];
  /** 외부 컨테이너가 넓이 100%일 때 내부 리사이즈 처리 */
  height?: number;
  /** 다크 모드 여부 */
  dark?: boolean;
};

const EquityChart: React.FC<Props> = ({
  data,
  benchmark,
  height = 320,
  dark = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaRef = useRef<ISeriesApi<"Area"> | null>(null);
  const benchRef = useRef<ISeriesApi<"Line"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 기존 차트 정리
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      areaRef.current = null;
      benchRef.current = null;
    }

    // 차트 생성 (v5 레이아웃/스케일 옵션)
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

    chartRef.current = chart;

    // v5: 시리즈 추가는 addSeries(SeriesToken, options)
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

    if (benchmark && benchmark.length) {
      const bench = chart.addSeries(LineSeries, {
        color: dark ? "rgba(234,179,8,1)" : "#F59E0B",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        title: "Benchmark",
      });
      benchRef.current = bench;
      bench.setData(benchmark);
    }

    // 초기 데이터 세팅
    if (data && data.length > 0) {
      area.setData(data);
    }

    // 컨테이너 리사이즈 대응 (width 자동)
    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      const { width } = containerRef.current.getBoundingClientRect();
      chartRef.current.applyOptions({ width: Math.max(0, Math.floor(width)) });
      chartRef.current.timeScale().fitContent();
    };

    const ro = new ResizeObserver(handleResize);
    resizeObserverRef.current = ro;
    ro.observe(containerRef.current);
    handleResize();

    return () => {
      ro.disconnect();
      chart.remove();
    };
  }, [height, dark]);

  // 데이터/벤치마크 업데이트
  useEffect(() => {
    if (areaRef.current) {
      areaRef.current.setData(data);
      chartRef.current?.timeScale().fitContent();
    }
    if (benchRef.current) {
      if (benchmark && benchmark.length) {
        benchRef.current.setData(benchmark);
      } else {
        // 벤치마크 제거가 필요하면 시리즈를 숨김 처리
        benchRef.current.applyOptions({ visible: false });
      }
    }
  }, [data, benchmark]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height }}
      aria-label="equity-chart"
    />
  );
};

export default EquityChart;
