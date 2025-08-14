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
} from "lightweight-charts";
import { INDICATOR_METADATA } from "@/lib/indicators";
import { LegendData } from "@/types/chart";

// =================================================================================
// #region 유틸리티 및 상수 (Utility & Constants)
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
    rightOffset: 50,
    fixRightEdge: true,
    tickMarkFormatter: dynamicTickMarkFormatter,
  },
  localization: {
    locale: "ko-KR",
    timeFormatter: crosshairTimeFormatter,
  },
  handleScroll: {
    pressedMouseMove: !isPane,
    mouseWheel: true,
  },
  handleScale: {
    axisPressedMouseMove: false,
    mouseWheel: true,
    pinch: true,
  },
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
// =================================================================================

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
  mainChartHeight?: number;
  paneChartHeight?: number;
}

export function useChartIndicatorManager({
  mainChartContainerRef,
  paneIndicators,
  getPaneContainer,
  ohlcvData,
  indicatorData,
  resolvedTheme,
  setLegendData,
  mainChartHeight = 400,
  paneChartHeight = 150,
}: ChartManagerProps) {
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const paneChartRefs = useRef<Map<string, IChartApi>>(new Map());
  const indicatorSeriesRef = useRef<Map<string, SeriesMapValue>>(new Map());

  const ohlcvCacheRef = useRef<Map<number, CandlestickData<UTCTimestamp>>>(
    new Map()
  );
  const indicatorCacheRef = useRef<
    Map<
      string,
      Map<number, LineData<UTCTimestamp> | HistogramData<UTCTimestamp>>
    >
  >(new Map());

  const setupChart = useCallback(
    (container: HTMLElement, options: DeepPartial<ChartOptions>): IChartApi => {
      const chart = createChart(container, options);

      // [수정] 콜백의 `range` 파라미터 타입을 라이브러리가 제공하는 `IRange<Time> | null`로 변경
      chart
        .timeScale()
        .subscribeVisibleTimeRangeChange((range: IRange<Time> | null) => {
          if (range) {
            // [수정] setVisibleRange가 요구하는 `IRange<UTCTimestamp>` 타입에 맞게 새로운 객체 생성
            const newRange: IRange<UTCTimestamp> = {
              from: timeToSeconds(range.from) as UTCTimestamp,
              to: timeToSeconds(range.to) as UTCTimestamp,
            };
            [chartRef.current, ...paneChartRefs.current.values()].forEach(
              (otherChart) => {
                if (otherChart && otherChart !== chart) {
                  try {
                    otherChart.timeScale().setVisibleRange(newRange);
                  } catch (e) {
                    /* 무시 */
                  }
                }
              }
            );
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

        indicatorSeriesRef.current.forEach(({ series }, key) => {
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

    const baseOptions = createBaseChartOptions(mainChartHeight);
    const themeOptions = getThemeOptions(resolvedTheme);
    const finalOptions = { ...baseOptions, ...themeOptions };

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
      resizeObserver.disconnect();
      paneChartRefs.current.forEach((chart) => chart.remove());
      mainChart.remove();
      chartRef.current = null;
    };
  }, [mainChartContainerRef, mainChartHeight, setupChart, resolvedTheme]);

  // Effect 2: 보조지표 차트(Pane) 동적 관리
  useEffect(() => {
    const chartsMap = paneChartRefs.current;
    const existingKeys = new Set(chartsMap.keys());
    const requiredKeys = new Set(paneIndicators);

    existingKeys.forEach((key) => {
      if (!requiredKeys.has(key)) {
        chartsMap.get(key)?.remove();
        chartsMap.delete(key);
      }
    });

    requiredKeys.forEach((key) => {
      const container = getPaneContainer(key);
      if (container && !existingKeys.has(key)) {
        const baseOptions = createBaseChartOptions(paneChartHeight, true);
        const themeOptions = getThemeOptions(resolvedTheme);
        const finalOptions = { ...baseOptions, ...themeOptions };

        const paneChart = setupChart(container, finalOptions);
        chartsMap.set(key, paneChart);

        const resizeObserver = new ResizeObserver((entries) => {
          const { width } = entries[0].contentRect;
          if (width > 0) paneChart.resize(width, paneChartHeight);
        });
        resizeObserver.observe(container);
      }
    });
  }, [
    paneIndicators,
    getPaneContainer,
    paneChartHeight,
    setupChart,
    resolvedTheme,
  ]);

  // Effect 3: 테마 변경 적용
  useEffect(() => {
    const themeOptions = getThemeOptions(resolvedTheme);
    chartRef.current?.applyOptions(themeOptions);
    paneChartRefs.current.forEach((chart) => chart.applyOptions(themeOptions));
  }, [resolvedTheme]);

  // Effect 4: 데이터 업데이트 및 캐싱
  useEffect(() => {
    if (ohlcvData) {
      const cache = new Map<number, CandlestickData<UTCTimestamp>>();
      ohlcvData.forEach((d) => cache.set(timeToSeconds(d.time), d));
      ohlcvCacheRef.current = cache;
      candlestickSeriesRef.current?.setData(ohlcvData);
    }
    if (indicatorData) {
      const cache = new Map<
        string,
        Map<number, LineData<UTCTimestamp> | HistogramData<UTCTimestamp>>
      >();
      Object.entries(indicatorData).forEach(([key, dataPoints]) => {
        const innerMap = new Map<
          number,
          LineData<UTCTimestamp> | HistogramData<UTCTimestamp>
        >();
        dataPoints.forEach((p) => {
          const timeAsSeconds = timeToSeconds(p.time);
          const newPoint = { ...p, time: timeAsSeconds as UTCTimestamp };
          innerMap.set(timeAsSeconds, newPoint);
        });
        cache.set(key, innerMap);
      });
      indicatorCacheRef.current = cache;
    }
  }, [ohlcvData, indicatorData]);

  // Effect 5: 지표 시리즈 동적 관리
  useEffect(() => {
    if (!chartRef.current) return;

    const currentSeriesMap = indicatorSeriesRef.current;
    const newSeriesKeys = new Set(
      indicatorData ? Object.keys(indicatorData) : []
    );

    currentSeriesMap.forEach(({ chart, series }, key) => {
      if (!newSeriesKeys.has(key)) {
        chart.removeSeries(series);
        currentSeriesMap.delete(key);
      }
    });

    if (indicatorData) {
      Object.entries(indicatorData).forEach(([key, data], index) => {
        if (!data || data.length === 0) return;

        const metadata = INDICATOR_METADATA.find((ind) =>
          key.toUpperCase().startsWith(ind.key.toUpperCase())
        );
        if (!metadata) return;

        const isPaneIndicator =
          metadata.paneType === "pane" || metadata.key === "Volume";
        let targetChart: IChartApi | null = chartRef.current;
        if (isPaneIndicator) {
          targetChart =
            paneChartRefs.current.get(metadata.key) || chartRef.current;
        }

        if (targetChart) {
          if (currentSeriesMap.has(key)) {
            // `setData`는 타입 추론이 어려우므로 `any`를 사용하여 타입 검사를 우회합니다.
            // 데이터 포맷이 일치함을 보장하는 상황에서 사용합니다.
            currentSeriesMap.get(key)!.series.setData(data as any);
          } else {
            const isHistogram = metadata.key === "Volume";

            if (isHistogram) {
              const options: DeepPartial<HistogramSeriesOptions> = {
                color: "#26a69a",
                priceFormat: { type: "volume" },
              };
              const newSeries = targetChart.addSeries(HistogramSeries, options);
              newSeries.setData(data as HistogramData<UTCTimestamp>[]);
              currentSeriesMap.set(key, {
                series: newSeries,
                chart: targetChart,
              });
            } else {
              const options: DeepPartial<LineSeriesOptions> = {
                color:
                  INDICATOR_COLOR_PALETTE[
                    index % INDICATOR_COLOR_PALETTE.length
                  ],
                lineWidth: 2,
              };
              const newSeries = targetChart.addSeries(LineSeries, options);
              newSeries.setData(data as LineData<UTCTimestamp>[]);
              currentSeriesMap.set(key, {
                series: newSeries,
                chart: targetChart,
              });
            }
          }
        }
      });
    }
  }, [indicatorData, paneIndicators]);
}
