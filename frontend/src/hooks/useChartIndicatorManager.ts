// file: frontend/src/hooks/useChartIndicatorManager.ts

"use client";

import { useEffect, useRef, useCallback } from "react";
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
  DeepPartial,
  ChartOptions,
  SeriesType,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  TickMarkType,
  Time,
  BusinessDay,
  LineSeriesOptions,
  HistogramSeriesOptions,
  IRange,
  SeriesMarker,
  ISeriesMarkers,
  createSeriesMarkers,
} from "lightweight-charts";
import { INDICATOR_METADATA } from "@/lib/indicators";
import { LegendData } from "@/types/chart";
import { SignalData } from "@/types/market";

// =================================================================================
// #region 유틸리티 및 상수
// =================================================================================

const LEGEND_KEY_CANDLE = "CANDLE";
const INDICATOR_COLOR_PALETTE = [
  "#2962FF",
  "#C2185B",
  "#FF6D00",
  "#00897B",
  "#9E9D24",
  "#7E57C2",
  "#00BFA5",
  "#F57C00",
];

const timeToSeconds = (time: Time): number => {
  if (typeof time === "string") {
    return Math.floor(new Date(time).getTime() / 1000);
  }
  if (typeof time === "object" && time !== null && "year" in time) {
    const businessDay = time as BusinessDay;
    return Math.floor(
      new Date(
        Date.UTC(businessDay.year, businessDay.month - 1, businessDay.day)
      ).getTime() / 1000
    );
  }
  return time as number;
};

const dynamicTickMarkFormatter = (
  time: UTCTimestamp,
  tickMarkType: TickMarkType
): string => {
  const date = new Date((time as number) * 1000);
  const formatOptions: Intl.DateTimeFormatOptions = { timeZone: "Asia/Seoul" };
  switch (tickMarkType) {
    case TickMarkType.Year:
      return new Intl.DateTimeFormat("en-US", {
        ...formatOptions,
        year: "numeric",
      }).format(date);
    case TickMarkType.Month:
      return new Intl.DateTimeFormat("en-CA", {
        ...formatOptions,
        year: "numeric",
        month: "2-digit",
      }).format(date);
    case TickMarkType.DayOfMonth:
      return new Intl.DateTimeFormat("en-CA", {
        ...formatOptions,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    case TickMarkType.Time:
      return new Intl.DateTimeFormat("en-GB", {
        ...formatOptions,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
    default:
      return new Intl.DateTimeFormat("en-CA", {
        ...formatOptions,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
  }
};

const crosshairTimeFormatter = (time: UTCTimestamp): string => {
  const date = new Date((time as number) * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  })
    .format(date)
    .replace(/,/, "");
};

const createBaseChartOptions = (
  height: number,
  isPane: boolean = false
): DeepPartial<ChartOptions> => ({
  height,
  crosshair: { mode: CrosshairMode.Normal },
  rightPriceScale: { borderVisible: false },
  timeScale: {
    borderVisible: false,
    rightOffset: 12,
    fixRightEdge: true,
    tickMarkFormatter: dynamicTickMarkFormatter,
  },
  localization: { locale: "ko-KR", timeFormatter: crosshairTimeFormatter },
  handleScroll: { pressedMouseMove: !isPane, mouseWheel: true },
  handleScale: { axisPressedMouseMove: false, mouseWheel: true, pinch: true },
});

const getThemeOptions = (resolvedTheme?: string): DeepPartial<ChartOptions> => {
  const isDark = resolvedTheme === "dark";
  return {
    layout: {
      background: {
        type: ColorType.Solid,
        color: isDark ? "#171819" : "#FFFFFF",
      },
      textColor: isDark ? "#D1D5DB" : "#1F2937",
    },
    grid: {
      vertLines: { color: isDark ? "#374151" : "#E5E7EB" },
      horzLines: { color: isDark ? "#374151" : "#E5E7EB" },
    },
  };
};

// #endregion

interface IndicatorState {
  paneChart: IChartApi | null;
  series: Map<string, ISeriesApi<SeriesType>>;
}

interface ChartManagerProps {
  mainChartContainerRef: React.RefObject<HTMLDivElement>;
  paneIndicators: string[];
  getPaneContainer: (key: string) => HTMLDivElement | null | undefined;
  ohlcvData?: CandlestickData<UTCTimestamp>[];
  indicatorData?: Record<string, (LineData | HistogramData)[]>;
  signalData?: SignalData;
  resolvedTheme?: string;
  setLegendData: (data: LegendData) => void;
  mainChartHeight?: number;
  paneChartHeight?: number;
}

export function useChartIndicatorManager({
  mainChartContainerRef,
  paneIndicators,
  getPaneContainer,
  ohlcvData,
  indicatorData,
  signalData,
  resolvedTheme,
  setLegendData,
  mainChartHeight = 400,
  paneChartHeight = 150,
}: ChartManagerProps) {
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const indicatorManagerRef = useRef<Map<string, IndicatorState>>(new Map());
  const ohlcvCacheRef = useRef<Map<number, CandlestickData<UTCTimestamp>>>(
    new Map()
  );
  const indicatorCacheRef = useRef<
    Map<
      string,
      Map<number, LineData<UTCTimestamp> | HistogramData<UTCTimestamp>>
    >
  >(new Map());
  const markersPluginRef = useRef<ISeriesMarkers<Time> | null>(null);

  const setupChart = useCallback(
    (container: HTMLElement, options: DeepPartial<ChartOptions>): IChartApi => {
      const chart = createChart(container, options);

      chart
        .timeScale()
        .subscribeVisibleTimeRangeChange((range: IRange<Time> | null) => {
          if (range) {
            const newRange: IRange<UTCTimestamp> = {
              from: timeToSeconds(range.from) as UTCTimestamp,
              to: timeToSeconds(range.to) as UTCTimestamp,
            };
            const allCharts = [
              chartRef.current,
              ...Array.from(indicatorManagerRef.current.values()).map(
                (state) => state.paneChart
              ),
            ];
            allCharts.forEach((otherChart) => {
              if (otherChart && otherChart !== chart) {
                try {
                  otherChart.timeScale().setVisibleRange(newRange);
                } catch (e) {
                  /* 무시 */
                }
              }
            });
          }
        });

      chart.subscribeCrosshairMove((param) => {
        if (!param.point || param.time == null) {
          setLegendData({});
          return;
        }
        const timeSec = timeToSeconds(param.time);
        const newLegendData: LegendData = {};
        const candleData = ohlcvCacheRef.current.get(timeSec);
        if (candleData) {
          newLegendData[LEGEND_KEY_CANDLE] = {
            ...candleData,
            time: timeSec as UTCTimestamp,
          };
        }
        indicatorManagerRef.current.forEach((indicatorState) => {
          indicatorState.series.forEach((series, key) => {
            const indicatorPoint = indicatorCacheRef.current
              .get(key)
              ?.get(timeSec);
            if (indicatorPoint) {
              const seriesOptions = series.options();
              newLegendData[key] = {
                ...indicatorPoint,
                time: timeToSeconds(indicatorPoint.time) as UTCTimestamp,
                color:
                  "color" in seriesOptions
                    ? (seriesOptions.color as string)
                    : undefined,
              };
            }
          });
        });
        setLegendData(newLegendData);
      });
      return chart;
    },
    [setLegendData]
  );

  // Effect 1: 메인 차트 초기화
  useEffect(() => {
    const container = mainChartContainerRef.current;
    if (!container || chartRef.current) return;
    const finalOptions = {
      ...createBaseChartOptions(mainChartHeight),
      ...getThemeOptions(resolvedTheme),
    };
    const mainChart = setupChart(container, finalOptions);
    chartRef.current = mainChart;
    candlestickSeriesRef.current = mainChart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) mainChart.resize(width, mainChartHeight);
    });
    resizeObserver.observe(container);

    return () => {
      // 1. indicatorManager의 모든 차트와 시리즈를 먼저 제거
      indicatorManagerRef.current.forEach((state) => {
        state.series.forEach((series) => {
          try {
            (state.paneChart || chartRef.current)?.removeSeries(series);
          } catch (e) {
            /* 이미 제거된 경우 무시 */
          }
        });
        try {
          state.paneChart?.remove();
        } catch (e) {
          /* 이미 제거된 경우 무시 */
        }
      });

      // 2. 메인 차트를 마지막에 제거
      if (chartRef.current) {
        chartRef.current.remove();
      }

      // 3. 모든 ref를 명시적으로 초기화하여 '유령' 객체 방지
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      indicatorManagerRef.current.clear(); // Map을 비움
      markersPluginRef.current = null;
    };
    // ▲▲▲ [핵심 수정] ▲▲▲
  }, [mainChartContainerRef, mainChartHeight, setupChart, resolvedTheme]);

  // Effect 2: 테마 변경 적용
  useEffect(() => {
    const themeOptions = getThemeOptions(resolvedTheme);
    chartRef.current?.applyOptions(themeOptions);
    indicatorManagerRef.current.forEach((state) =>
      state.paneChart?.applyOptions(themeOptions)
    );
  }, [resolvedTheme]);

  // Effect 3: 데이터 업데이트 및 캐싱
  // Effect 3-1: OHLCV 데이터 동기화
  useEffect(() => {
    if (ohlcvData && candlestickSeriesRef.current) {
      const cache = new Map<number, CandlestickData<UTCTimestamp>>();
      ohlcvData.forEach((d) => cache.set(timeToSeconds(d.time), d));
      ohlcvCacheRef.current = cache;
      candlestickSeriesRef.current.setData(ohlcvData);
      // 데이터 로드 후 차트 뷰 자동 조정
      chartRef.current?.timeScale().fitContent();
    }
  }, [ohlcvData]);

  // Effect 3-2: 지표 데이터 및 시리즈 동기화
  useEffect(() => {
    const mainChart = chartRef.current;
    if (!mainChart) return;

    const manager = indicatorManagerRef.current;
    const newSeriesKeys = new Set(
      indicatorData ? Object.keys(indicatorData) : []
    );

    // 1. 캐시 업데이트
    const newIndicatorCache = new Map<
      string,
      Map<number, LineData<UTCTimestamp> | HistogramData<UTCTimestamp>>
    >();
    if (indicatorData) {
      Object.entries(indicatorData).forEach(([key, dataPoints]) => {
        const innerMap = new Map<
          number,
          LineData<UTCTimestamp> | HistogramData<UTCTimestamp>
        >();
        dataPoints.forEach((p) =>
          innerMap.set(timeToSeconds(p.time), {
            ...p,
            time: timeToSeconds(p.time) as UTCTimestamp,
          })
        );
        newIndicatorCache.set(key, innerMap);
      });
    }
    indicatorCacheRef.current = newIndicatorCache;

    // 2. 기존 시리즈 순회: 더 이상 필요없는 시리즈는 제거, 있는 시리즈는 데이터 업데이트
    manager.forEach((state, baseKey) => {
      let hasActiveSeries = false;
      state.series.forEach((series, fullKey) => {
        if (newSeriesKeys.has(fullKey)) {
          hasActiveSeries = true;
          series.setData(indicatorData?.[fullKey] || []); // 데이터 업데이트
        } else {
          (state.paneChart || mainChart).removeSeries(series);
          state.series.delete(fullKey);
        }
      });
      if (!hasActiveSeries) {
        state.paneChart?.remove();
        manager.delete(baseKey);
      }
    });

    // 3. 새로운 지표 시리즈 생성
    if (indicatorData) {
      Object.entries(indicatorData).forEach(([fullSeriesKey, data], index) => {
        const metadata = INDICATOR_METADATA.find((ind) =>
          fullSeriesKey.toUpperCase().startsWith(ind.key.toUpperCase())
        );
        if (!metadata || !data || data.length === 0) return;
        const baseKey = metadata.key;

        // baseKey 자체가 없으면 새로 pane과 상태를 만듬
        if (!manager.has(baseKey)) {
          let paneChart: IChartApi | null = null;
          if (paneIndicators.includes(baseKey)) {
            const container = getPaneContainer(baseKey);
            if (container) {
              const finalOptions = {
                ...createBaseChartOptions(paneChartHeight, true),
                ...getThemeOptions(resolvedTheme),
              };
              paneChart = setupChart(container, finalOptions);
              const resizeObserver = new ResizeObserver((entries) => {
                const { width } = entries[0].contentRect;
                if (width > 0) paneChart?.resize(width, paneChartHeight);
              });
              resizeObserver.observe(container);
            }
          }
          manager.set(baseKey, { paneChart, series: new Map() });
        }

        const indicatorState = manager.get(baseKey)!;
        if (!indicatorState.series.has(fullSeriesKey)) {
          const targetChart = indicatorState.paneChart || mainChart;
          const isHistogram = fullSeriesKey.toLowerCase().includes("histogram");
          let newSeries: ISeriesApi<SeriesType>;
          if (isHistogram) {
            const options: DeepPartial<HistogramSeriesOptions> = {
              color: "#26a69a",
              priceFormat: { type: "volume" },
            };
            newSeries = targetChart.addSeries(HistogramSeries, options);
          } else {
            const options: DeepPartial<LineSeriesOptions> = {
              color:
                INDICATOR_COLOR_PALETTE[index % INDICATOR_COLOR_PALETTE.length],
              lineWidth: 2,
            };
            newSeries = targetChart.addSeries(LineSeries, options);
          }
          newSeries.setData(data as any);
          indicatorState.series.set(fullSeriesKey, newSeries);
        }
      });
    }
  }, [
    indicatorData,
    paneIndicators,
    getPaneContainer,
    paneChartHeight,
    resolvedTheme,
    setupChart,
  ]);

  // Effect 5: 신호 데이터를 받아 마커를 렌더링
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series) return;

    const signals = signalData?.signals || [];

    const markers: SeriesMarker<Time>[] = signals.map((signal) => {
      let position: "aboveBar" | "belowBar" = "aboveBar";
      let color = "#ef5350";
      let shape: "arrowUp" | "arrowDown" = "arrowDown";
      let text = "Signal";

      switch (signal.signalType) {
        case "long_entry":
          position = "belowBar";
          color = "#26a69a";
          shape = "arrowUp";
          text = "L-Entry";
          break;
        case "long_exit":
          position = "aboveBar";
          color = "#f57c00";
          shape = "arrowDown";
          text = "L-Exit";
          break;
        case "short_entry":
          position = "aboveBar";
          color = "#ef5350";
          shape = "arrowDown";
          text = "S-Entry";
          break;
        case "short_exit":
          position = "belowBar";
          color = "#2962ff";
          shape = "arrowUp";
          text = "S-Exit";
          break;
      }
      return { time: signal.time, position, color, shape, text };
    });

    if (!markersPluginRef.current) {
      markersPluginRef.current = createSeriesMarkers(series, markers);
    } else {
      markersPluginRef.current.setMarkers(markers);
    }
  }, [signalData, ohlcvData]);
}
