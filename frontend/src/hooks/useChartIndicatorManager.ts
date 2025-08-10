"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp,
  ColorType,
  LineData,
  HistogramData,
  CrosshairMode,
  LogicalRange,
  DeepPartial,
  ChartOptions,
  SeriesType,
  // 사용자 환경에 맞는 v3 스타일 시리즈 클래스 임포트
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import { INDICATOR_METADATA } from "@/lib/indicators";
import { LegendData, LegendDataValue } from "@/types/chart";

/**
 * --- 타입 정의 ---
 */
type SeriesMapValue = {
  series: ISeriesApi<SeriesType>;
  chart: IChartApi;
};

interface ChartManagerProps {
  mainChartContainerRef: React.RefObject<HTMLDivElement>;
  paneIndicators: string[];
  getPaneContainer: (key: string) => HTMLDivElement | null | undefined;
  ohlcvData?: CandlestickData<UTCTimestamp>[];
  indicatorData?: Record<string, (LineData | HistogramData)[]>;
  resolvedTheme?: string;
  setLegendData: (data: LegendData) => void;
}

/**
 * --- 헬퍼 함수 ---
 */
const timeToSeconds = (time: UTCTimestamp | string): number => {
  if (typeof time === "string") {
    return Math.floor(new Date(time).getTime() / 1000);
  }
  return time;
};

/**
 * ----------------------------------------------------------------
 * ## 메인 커스텀 훅
 * ----------------------------------------------------------------
 */
export function useChartIndicatorManager({
  mainChartContainerRef,
  paneIndicators,
  getPaneContainer,
  ohlcvData,
  indicatorData,
  resolvedTheme,
  setLegendData,
}: ChartManagerProps) {
  // --- Refs ---
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const paneChartRefs = useRef<Map<string, IChartApi>>(new Map());
  const indicatorSeriesRef = useRef<Map<string, SeriesMapValue>>(new Map());
  const ohlcvCacheRef = useRef<Map<number, CandlestickData>>(new Map());
  const indicatorCacheRef = useRef<
    Map<string, Map<number, LineData | HistogramData>>
  >(new Map());

  // --- 동기화 함수 ---

  // 1. 시간축 동기화
  const syncTimeScale = (
    sourceChart: IChartApi,
    timeRange: LogicalRange | null
  ) => {
    if (!timeRange) return;
    [chartRef.current, ...paneChartRefs.current.values()].forEach((chart) => {
      if (chart && chart !== sourceChart) {
        chart.timeScale().setVisibleLogicalRange(timeRange);
      }
    });
  };

  // 2. 십자선 및 범례 동기화 (오류 수정 최종 버전)
  const syncCrosshair = (sourceChart: IChartApi, param: any) => {
    if (!param.point || param.time == null || param.logical == null) {
      setLegendData({});
      return;
    }

    // ✅ 오류 수정 1: 라이브러리 공식 동기화 방식 사용
    [chartRef.current, ...paneChartRefs.current.values()].forEach((chart) => {
      if (chart && chart !== sourceChart) {
        chart.timeScale().scrollToPosition(param.logical, false);
      }
    });

    const newLegendData: LegendData = {};
    const timeSec = timeToSeconds(param.time);

    const candleData = ohlcvCacheRef.current.get(timeSec);
    if (candleData) {
      // ✅ 오류 수정 2: `time` 속성을 `UTCTimestamp`(number)로 변환하여 할당
      newLegendData["CANDLE"] = {
        ...candleData,
        time: timeToSeconds(candleData.time),
      };
    }

    indicatorSeriesRef.current.forEach(({ series }, key) => {
      const indicatorMap = indicatorCacheRef.current.get(key);
      const indicatorPoint = indicatorMap?.get(timeSec);
      if (indicatorPoint) {
        const seriesOptions = series.options();
        newLegendData[key] = {
          ...indicatorPoint,
          time: timeToSeconds(indicatorPoint.time), // ✅ 오류 수정 2
          color:
            "color" in seriesOptions
              ? (seriesOptions.color as string)
              : undefined,
        };
      }
    });

    setLegendData(newLegendData);
  };

  // --- useEffect 훅 ---

  // 3. 메인 차트 생성 및 클린업
  useEffect(() => {
    if (!mainChartContainerRef.current || chartRef.current) return;

    const mainChart = createChart(mainChartContainerRef.current, {
      width: mainChartContainerRef.current.clientWidth,
      height: 400,
      crosshair: { mode: CrosshairMode.Normal },
    });
    chartRef.current = mainChart;

    candlestickSeriesRef.current = mainChart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    mainChart
      .timeScale()
      .subscribeVisibleLogicalRangeChange((range) =>
        syncTimeScale(mainChart, range)
      );
    mainChart.subscribeCrosshairMove((param) =>
      syncCrosshair(mainChart, param)
    );

    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) mainChart.resize(width, 400);
    });
    resizeObserver.observe(mainChartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      paneChartRefs.current.forEach((chart) => chart.remove());
      mainChart.remove();
      chartRef.current = null;
    };
  }, []);

  // 4. 보조 패널 차트 동적 생성 및 클린업
  useEffect(() => {
    const chartsMap = paneChartRefs.current;
    paneIndicators.forEach((paneKey) => {
      const container = getPaneContainer(paneKey);
      if (container && !chartsMap.has(paneKey)) {
        const paneChart = createChart(container, {
          width: container.clientWidth,
          height: 150,
          crosshair: { mode: CrosshairMode.Normal },
        });
        chartsMap.set(paneKey, paneChart);
        paneChart
          .timeScale()
          .subscribeVisibleLogicalRangeChange((range) =>
            syncTimeScale(paneChart, range)
          );
        paneChart.subscribeCrosshairMove((param) =>
          syncCrosshair(paneChart, param)
        );
      }
    });

    chartsMap.forEach((chart, key) => {
      if (!paneIndicators.includes(key)) {
        chart.remove();
        chartsMap.delete(key);
      }
    });
  }, [paneIndicators, getPaneContainer]);

  // 5. 테마 적용, 데이터 캐싱 및 시리즈 데이터 설정
  useEffect(() => {
    // 테마 적용
    const allCharts = [chartRef.current, ...paneChartRefs.current.values()];
    const options: DeepPartial<ChartOptions> = {
      layout: {
        background: {
          type: ColorType.Solid,
          color: resolvedTheme === "dark" ? "#171819" : "#FFFFFF",
        },
        textColor: resolvedTheme === "dark" ? "#D1D5DB" : "#1F2937",
      },
      grid: {
        vertLines: { color: resolvedTheme === "dark" ? "#374151" : "#E5E7EB" },
        horzLines: { color: resolvedTheme === "dark" ? "#374151" : "#E5E7EB" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
      },
    };
    allCharts.forEach((chart) => chart?.applyOptions(options));

    // OHLCV 데이터 캐싱 및 설정
    if (ohlcvData) {
      const cache = new Map<number, CandlestickData>();
      ohlcvData.forEach((d) => cache.set(timeToSeconds(d.time), d));
      ohlcvCacheRef.current = cache;
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(ohlcvData);
        chartRef.current?.timeScale().fitContent();
      }
    }
  }, [resolvedTheme, ohlcvData]);

  // 6. 지표 시리즈 동기화 및 데이터 캐싱
  useEffect(() => {
    const currentSeriesMap = indicatorSeriesRef.current;
    const newSeriesKeys = new Set(
      indicatorData ? Object.keys(indicatorData) : []
    );

    // 지표 데이터 캐싱
    if (indicatorData) {
      const cache = new Map<string, Map<number, LineData | HistogramData>>();
      Object.entries(indicatorData).forEach(([key, dataPoints]) => {
        const innerMap = new Map<number, LineData | HistogramData>();
        dataPoints.forEach((p) => innerMap.set(timeToSeconds(p.time), p));
        cache.set(key, innerMap);
      });
      indicatorCacheRef.current = cache;
    }

    // 시리즈 제거
    currentSeriesMap.forEach(({ chart, series }, key) => {
      if (!newSeriesKeys.has(key)) {
        chart.removeSeries(series);
        currentSeriesMap.delete(key);
        indicatorCacheRef.current.delete(key);
      }
    });

    // 시리즈 추가/업데이트
    if (indicatorData) {
      Object.entries(indicatorData).forEach(([key, data]) => {
        const indicatorKey = key.split("_")[0];
        const metadata = INDICATOR_METADATA.find(
          (ind) => ind.key === indicatorKey
        );
        const isHistogram =
          key.toLowerCase().includes("histogram") || metadata?.key === "Volume";
        const seriesType = isHistogram ? HistogramSeries : LineSeries;

        const targetChart =
          metadata?.paneType === "pane" || metadata?.key === "Volume"
            ? paneChartRefs.current.get(metadata.key)
            : chartRef.current;

        if (!targetChart || !data) return;

        if (currentSeriesMap.has(key)) {
          currentSeriesMap.get(key)!.series.setData(data as any);
        } else {
          let newSeries: ISeriesApi<SeriesType>;
          let options = {};

          if (isHistogram) {
            options = { color: "#26a69a", priceFormat: { type: "volume" } };
          } else {
            options = {
              color: `#${Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, "0")}`,
              lineWidth: 2,
            };
          }

          newSeries = targetChart.addSeries(seriesType, options);
          newSeries.setData(data as any);
          currentSeriesMap.set(key, { series: newSeries, chart: targetChart });
        }
      });
    }
  }, [indicatorData]);
}
