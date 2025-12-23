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
  LineSeriesOptions,
  HistogramSeriesOptions,
  Time,
  SeriesMarker,
  createSeriesMarkers,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  TickMarkType,
  IRange,
  BusinessDay,
  AreaSeries,
  LineStyle,
} from "lightweight-charts";
import { LegendData } from "@/types/chart";
import { SignalData } from "@/types/market";
import { useIndicatorStore } from "@/store/indicatorStore";
import {
  CloudSeries,
  CloudData,
} from "@/components/domain/strategy/chart/CloudSeries";

// =================================================================================
// #region 유틸리티 및 상수 (기존과 동일)
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
  if (typeof time === "string")
    return Math.floor(new Date(time).getTime() / 1000);
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
        color: "transparent",
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
  const markersPluginRef = useRef<ReturnType<
    typeof createSeriesMarkers
  > | null>(null);
  const allMarkersRef = useRef<SeriesMarker<Time>[]>([]);

  const indicatorMetadata = useIndicatorStore((state) => state.metadata);

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
          if (markersPluginRef.current) {
            (markersPluginRef.current as any).setMarkers(allMarkersRef.current);
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
    const resizeObserver = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) mainChart.resize(width, mainChartHeight);
    });
    resizeObserver.observe(container);
    return () => {
      indicatorManagerRef.current.forEach((state) => {
        state.series.forEach((series) => {
          try {
            (state.paneChart || chartRef.current)?.removeSeries(series);
          } catch (e) {
            /* 무시 */
          }
        });
        try {
          state.paneChart?.remove();
        } catch (e) {
          /* 무시 */
        }
      });
      if (chartRef.current) {
        chartRef.current.remove();
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      indicatorManagerRef.current.clear();
      markersPluginRef.current = null;
    };
  }, [mainChartContainerRef, mainChartHeight, setupChart, resolvedTheme]);

  // Effect 2: 테마 변경 적용
  useEffect(() => {
    const themeOptions = getThemeOptions(resolvedTheme);
    chartRef.current?.applyOptions(themeOptions);
    indicatorManagerRef.current.forEach((state) =>
      state.paneChart?.applyOptions(themeOptions)
    );
  }, [resolvedTheme]);

  // Effect 3: 데이터 처리 통합 Effect (기존 Effect 3 + Effect 4)
  useEffect(() => {
    const mainChart = chartRef.current;
    if (!mainChart) return;

    // 1. 데이터 캐싱
    if (ohlcvData) {
      const cache = new Map<number, CandlestickData<UTCTimestamp>>();
      ohlcvData.forEach((d) => cache.set(timeToSeconds(d.time), d));
      ohlcvCacheRef.current = cache;
    }
    if (indicatorData) {
      const newIndicatorCache = new Map<
        string,
        Map<number, LineData<UTCTimestamp> | HistogramData<UTCTimestamp>>
      >();
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
      indicatorCacheRef.current = newIndicatorCache;
    }

    // 2. 지표 시리즈 관리
    const manager = indicatorManagerRef.current;
    const newSeriesKeys = new Set(
      indicatorData ? Object.keys(indicatorData) : []
    );

    manager.forEach((state, baseKey) => {
      let hasActiveSeries = false;
      state.series.forEach((series, fullKey) => {
        if (newSeriesKeys.has(fullKey)) {
          hasActiveSeries = true;
          const seriesData = indicatorData?.[fullKey] || [];
          const filteredData = seriesData.filter(
            (d) => d.value !== null && d.value !== undefined
          );
          series.setData(filteredData as any);
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

    if (indicatorData) {
      const dataToProcess = { ...indicatorData };

      // 볼린저 밴드 사전 처리
      const bbuKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("bbu_")
      );
      const bbmKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("bbm_")
      );
      const bblKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("bbl_")
      );

      if (bbuKey && bbmKey && bblKey) {
        const metadata = indicatorMetadata.find(
          (meta) => meta.kind === "bbands"
        );
        if (metadata) {
          const baseKey = metadata.key;
          let indicatorState = manager.get(baseKey);
          if (!indicatorState) {
            indicatorState = { paneChart: null, series: new Map() };
            manager.set(baseKey, indicatorState);
          }

          const lineColor = "rgba(33, 150, 243, 0.8)";
          const bbmLineColor = "rgba(255, 82, 82, 0.8)";
          const cloudColor = "rgba(33, 150, 243, 0.15)";

          const bbuData = (dataToProcess[bbuKey] || []).filter(
            (d) => d.value != null
          );
          const bbmData = (dataToProcess[bbmKey] || []).filter(
            (d) => d.value != null
          );
          const bblData = (dataToProcess[bblKey] || []).filter(
            (d) => d.value != null
          );

          // Create cloud data from upper and lower bands
          const cloudKey = `${baseKey}_cloud`;
          const cloudData: CloudData[] = [];
          const timeMap = new Map<number, { upper?: number; lower?: number }>();

          bbuData.forEach((d) => {
            const time = timeToSeconds(d.time);
            if (!timeMap.has(time)) timeMap.set(time, {});
            timeMap.get(time)!.upper = d.value;
          });

          bblData.forEach((d) => {
            const time = timeToSeconds(d.time);
            if (!timeMap.has(time)) timeMap.set(time, {});
            timeMap.get(time)!.lower = d.value;
          });

          timeMap.forEach((values, time) => {
            if (values.upper !== undefined && values.lower !== undefined) {
              cloudData.push({
                time: time as UTCTimestamp,
                upperValue: values.upper,
                lowerValue: values.lower,
                color: cloudColor,
              });
            }
          });

          // Add cloud series
          let cloudSeries = indicatorState.series.get(cloudKey);
          if (!cloudSeries) {
            cloudSeries = mainChart.addCustomSeries(new CloudSeries(), {
              cloudColor,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(cloudKey, cloudSeries);
          }
          cloudSeries.setData(cloudData as any);

          // Add upper band line
          let bbuSeries = indicatorState.series.get(bbuKey) as
            | ISeriesApi<"Line">
            | undefined;
          if (!bbuSeries) {
            bbuSeries = mainChart.addSeries(LineSeries, {
              color: lineColor,
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(bbuKey, bbuSeries);
          }
          bbuSeries.setData(bbuData as any);

          // Add lower band line
          let bblSeries = indicatorState.series.get(bblKey) as
            | ISeriesApi<"Line">
            | undefined;
          if (!bblSeries) {
            bblSeries = mainChart.addSeries(LineSeries, {
              color: lineColor,
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(bblKey, bblSeries);
          }
          bblSeries.setData(bblData as any);

          // Add middle line
          let bbmSeries = indicatorState.series.get(bbmKey) as
            | ISeriesApi<"Line">
            | undefined;
          if (!bbmSeries) {
            bbmSeries = mainChart.addSeries(LineSeries, {
              color: bbmLineColor,
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(bbmKey, bbmSeries);
          }
          bbmSeries.setData(bbmData as any);

          delete dataToProcess[bbuKey];
          delete dataToProcess[bbmKey];
          delete dataToProcess[bblKey];
        }
      }
      // --- 볼린저 밴드 처리 완료 ---

      // --- 켈트너 채널 사전 처리 ---
      const kcueKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("kcue_")
      ); // Upper
      const kcbeKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("kcbe_")
      ); // Middle (Basis)
      const kcleKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("kcle_")
      ); // Lower

      if (kcueKey && kcbeKey && kcleKey) {
        const metadata = indicatorMetadata.find((meta) => meta.kind === "kc");
        if (metadata) {
          const baseKey = metadata.key;
          let indicatorState = manager.get(baseKey);
          if (!indicatorState) {
            indicatorState = { paneChart: null, series: new Map() };
            manager.set(baseKey, indicatorState);
          }

          const cloudColor = "rgba(126, 87, 194, 0.15)";
          const kcbeLineColor = "rgba(126, 87, 194, 0.8)";

          const kcueData = (dataToProcess[kcueKey] || []).filter(
            (d) => d.value != null
          );
          const kcbeData = (dataToProcess[kcbeKey] || []).filter(
            (d) => d.value != null
          );
          const kcleData = (dataToProcess[kcleKey] || []).filter(
            (d) => d.value != null
          );

          // Create cloud data from upper and lower channels
          const cloudKey = `${baseKey}_cloud`;
          const cloudData: CloudData[] = [];
          const timeMap = new Map<number, { upper?: number; lower?: number }>();

          kcueData.forEach((d) => {
            const time = timeToSeconds(d.time);
            if (!timeMap.has(time)) timeMap.set(time, {});
            timeMap.get(time)!.upper = d.value;
          });

          kcleData.forEach((d) => {
            const time = timeToSeconds(d.time);
            if (!timeMap.has(time)) timeMap.set(time, {});
            timeMap.get(time)!.lower = d.value;
          });

          timeMap.forEach((values, time) => {
            if (values.upper !== undefined && values.lower !== undefined) {
              cloudData.push({
                time: time as UTCTimestamp,
                upperValue: values.upper,
                lowerValue: values.lower,
                color: cloudColor,
              });
            }
          });

          // Add cloud series
          let cloudSeries = indicatorState.series.get(cloudKey);
          if (!cloudSeries) {
            cloudSeries = mainChart.addCustomSeries(new CloudSeries(), {
              cloudColor,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(cloudKey, cloudSeries);
          }
          cloudSeries.setData(cloudData as any);

          // Add upper channel line
          let kcueSeries = indicatorState.series.get(kcueKey) as
            | ISeriesApi<"Line">
            | undefined;
          if (!kcueSeries) {
            kcueSeries = mainChart.addSeries(LineSeries, {
              color: kcbeLineColor,
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(kcueKey, kcueSeries);
          }
          kcueSeries.setData(kcueData as any);

          // Add lower channel line
          let kcleSeries = indicatorState.series.get(kcleKey) as
            | ISeriesApi<"Line">
            | undefined;
          if (!kcleSeries) {
            kcleSeries = mainChart.addSeries(LineSeries, {
              color: kcbeLineColor,
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(kcleKey, kcleSeries);
          }
          kcleSeries.setData(kcleData as any);

          // Add middle line
          let kcbeSeries = indicatorState.series.get(kcbeKey) as
            | ISeriesApi<"Line">
            | undefined;
          if (!kcbeSeries) {
            kcbeSeries = mainChart.addSeries(LineSeries, {
              color: kcbeLineColor,
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(kcbeKey, kcbeSeries);
          }
          kcbeSeries.setData(kcbeData as any);

          delete dataToProcess[kcueKey];
          delete dataToProcess[kcbeKey];
          delete dataToProcess[kcleKey];
        }
      }
      // --- 켈트너 채널 처리 완료 ---

      // --- 일목균형표 사전 처리 (구름대 채우기) ---
      const isaKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("isa_")
      ); // 선행스팬 A
      const isbKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("isb_")
      ); // 선행스팬 B
      const itsKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("its_")
      ); // 전환선
      const iksKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("iks_")
      ); // 기준선
      const icsKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("ics_")
      ); // 후행스팬

      if (isaKey && isbKey && itsKey && iksKey && icsKey) {
        const metadata = indicatorMetadata.find((meta) => meta.kind === "i");
        if (metadata) {
          const baseKey = metadata.key;
          let indicatorState = manager.get(baseKey);
          if (!indicatorState) {
            indicatorState = { paneChart: null, series: new Map() };
            manager.set(baseKey, indicatorState);
          }

          const bullishCloudColor = "rgba(76, 175, 80, 0.2)"; // Green
          const bearishCloudColor = "rgba(239, 83, 80, 0.2)"; // Red

          const isaData = (dataToProcess[isaKey] || []).filter(
            (d) => d.value != null
          );
          const isbData = (dataToProcess[isbKey] || []).filter(
            (d) => d.value != null
          );

          // Create separate cloud data for bullish and bearish clouds
          const bullishCloudData: CloudData[] = [];
          const bearishCloudData: CloudData[] = [];

          const isaMap = new Map(
            isaData.map((d) => [timeToSeconds(d.time), d.value])
          );
          const isbMap = new Map(
            isbData.map((d) => [timeToSeconds(d.time), d.value])
          );
          const allTimes = new Set([...isaMap.keys(), ...isbMap.keys()]);

          allTimes.forEach((time) => {
            const a = isaMap.get(time);
            const b = isbMap.get(time);
            if (a !== undefined && b !== undefined) {
              const cloudPoint = {
                time: time as UTCTimestamp,
                upperValue: Math.max(a, b),
                lowerValue: Math.min(a, b),
              };

              if (a > b) {
                bullishCloudData.push({
                  ...cloudPoint,
                  color: bullishCloudColor,
                });
              } else {
                bearishCloudData.push({
                  ...cloudPoint,
                  color: bearishCloudColor,
                });
              }
            }
          });

          console.log(
            "[Ichimoku] Bullish cloud points:",
            bullishCloudData.length,
            "Bearish cloud points:",
            bearishCloudData.length
          );

          // Add bullish cloud series (green)
          const bullishCloudKey = `${baseKey}_cloud_bullish`;
          let bullishCloudSeries = indicatorState.series.get(bullishCloudKey);
          if (!bullishCloudSeries) {
            bullishCloudSeries = mainChart.addCustomSeries(new CloudSeries(), {
              cloudColor: bullishCloudColor,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(bullishCloudKey, bullishCloudSeries);
          }
          bullishCloudSeries.setData(bullishCloudData as any);

          // Add bearish cloud series (red)
          const bearishCloudKey = `${baseKey}_cloud_bearish`;
          let bearishCloudSeries = indicatorState.series.get(bearishCloudKey);
          if (!bearishCloudSeries) {
            bearishCloudSeries = mainChart.addCustomSeries(new CloudSeries(), {
              cloudColor: bearishCloudColor,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(bearishCloudKey, bearishCloudSeries);
          }
          bearishCloudSeries.setData(bearishCloudData as any);

          // Add 5 lines
          const allLines = [
            {
              key: itsKey,
              data: (dataToProcess[itsKey] || []).filter(
                (d) => d.value != null
              ),
              color: "#FF6A8A",
            }, // 전환선
            {
              key: iksKey,
              data: (dataToProcess[iksKey] || []).filter(
                (d) => d.value != null
              ),
              color: "#3399FF",
            }, // 기준선
            {
              key: icsKey,
              data: (dataToProcess[icsKey] || []).filter(
                (d) => d.value != null
              ),
              color: "#D2B48C",
            }, // 후행스팬
            { key: isaKey, data: isaData, color: "rgba(76, 175, 80, 0.5)" }, // 선행스팬 A
            { key: isbKey, data: isbData, color: "rgba(239, 83, 80, 0.5)" }, // 선행스팬 B
          ];

          for (const line of allLines) {
            let series = indicatorState.series.get(line.key) as
              | ISeriesApi<"Line">
              | undefined;
            if (!series) {
              series = mainChart.addSeries(LineSeries, {
                color: line.color,
                lineWidth: 1,
                priceLineVisible: false,
                lastValueVisible: false,
              });
              indicatorState.series.set(line.key, series);
            }
            series.setData(line.data as any);
          }

          // 처리된 키들을 복사본에서 삭제
          [isaKey, isbKey, itsKey, iksKey, icsKey].forEach((key) => {
            if (key) delete dataToProcess[key];
          });
        }
      }
      // --- 일목균형표 처리 완료 ---

      // 슈퍼트렌드 데이터를 사전 처리하는 로직
      const supertKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("supert_")
      );
      const supertdKey = Object.keys(dataToProcess).find((k) =>
        k.startsWith("supertd_")
      );

      if (supertKey && supertdKey) {
        const metadata = indicatorMetadata.find(
          (meta) => meta.kind === "supert"
        );
        if (metadata) {
          const baseKey = metadata.key;
          const supertData = dataToProcess[supertKey];
          const supertdData = dataToProcess[supertdKey];

          const directionMap = new Map(
            supertdData.map((d) => [d.time, d.value])
          );

          const coloredSupertData = supertData
            .filter((d) => d.value !== null && d.value !== undefined)
            .map((d) => ({
              ...d,
              color: directionMap.get(d.time) === 1 ? "#26a69a" : "#ef5350",
            }));

          let indicatorState = manager.get(baseKey);
          if (!indicatorState) {
            indicatorState = { paneChart: null, series: new Map() };
            manager.set(baseKey, indicatorState);
          }

          let series = indicatorState.series.get(supertKey) as
            | ISeriesApi<"Line">
            | undefined;
          if (!series) {
            series = mainChart.addSeries(LineSeries, { lineWidth: 2 });
            indicatorState.series.set(supertKey, series);
          }

          series.setData(coloredSupertData);
        }

        delete dataToProcess[supertKey];
        delete dataToProcess[supertdKey];
        const supertlKey = Object.keys(dataToProcess).find((k) =>
          k.startsWith("supertl_")
        );
        const supertsKey = Object.keys(dataToProcess).find((k) =>
          k.startsWith("superts_")
        );
        if (supertlKey) delete dataToProcess[supertlKey];
        if (supertsKey) delete dataToProcess[supertsKey];
      }

      // 나머지 지표들은 '복사본'을 사용하여 처리합니다.
      Object.entries(dataToProcess).forEach(([fullSeriesKey, data], index) => {
        const ignoredPrefixes = ["supertd", "bbb", "bbp"];
        if (
          ignoredPrefixes.some((prefix) =>
            fullSeriesKey.toLowerCase().startsWith(prefix)
          )
        ) {
          return;
        }
        const metadata = indicatorMetadata.find((meta) =>
          fullSeriesKey.toLowerCase().startsWith(meta.kind.toLowerCase())
        );
        if (!metadata || !data || data.length === 0) return;

        const baseKey = metadata.key;
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
          const isHistogram =
            fullSeriesKey.toLowerCase().includes("histogram") ||
            fullSeriesKey.toLowerCase().includes("macdh");
          let newSeries: ISeriesApi<SeriesType>;
          if (isHistogram) {
            newSeries = targetChart.addSeries(HistogramSeries, {
              color: "#26a69a",
              priceFormat: { type: "volume" },
            });
          } else {
            newSeries = targetChart.addSeries(LineSeries, {
              color:
                INDICATOR_COLOR_PALETTE[index % INDICATOR_COLOR_PALETTE.length],
              lineWidth: 2,
            });
          }
          const filteredData = data.filter(
            (d) => d.value !== null && d.value !== undefined
          );
          newSeries.setData(filteredData as any);
          indicatorState.series.set(fullSeriesKey, newSeries);
        }
      });
    }

    // 3. 캔들 시리즈 재생성
    const ohlcvDataToSet = ohlcvData || [];
    if (candlestickSeriesRef.current) {
      mainChart.removeSeries(candlestickSeriesRef.current);
    }
    const newCandleSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });
    newCandleSeries.setData(ohlcvDataToSet as any);
    candlestickSeriesRef.current = newCandleSeries;

    // 4. 마커 생성
    const series = candlestickSeriesRef.current;
    if (!series || !ohlcvData || ohlcvCacheRef.current.size === 0) {
      if (markersPluginRef.current) {
        (markersPluginRef.current as any).setMarkers([]);
      }
    } else {
      const ohlcvTimes = new Set(Array.from(ohlcvCacheRef.current.keys()));
      const signalMarkers: SeriesMarker<Time>[] = (signalData?.signals || [])
        .filter((signal) => ohlcvTimes.has(timeToSeconds(signal.time)))
        .map((signal) => {
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
            default:
              return null;
          }
          return { time: signal.time, position, color, shape, text };
        })
        .filter((marker) => marker !== null);

      let psarMarkers: SeriesMarker<Time>[] = [];
      if (indicatorData) {
        const psarlKey = Object.keys(indicatorData).find((k) =>
          k.startsWith("psarl_")
        );
        const psarsKey = Object.keys(indicatorData).find((k) =>
          k.startsWith("psars_")
        );
        if (psarlKey && indicatorData[psarlKey]) {
          psarMarkers = psarMarkers.concat(
            indicatorData[psarlKey]
              .filter(
                (d) => d.value != null && ohlcvTimes.has(timeToSeconds(d.time))
              )
              .map((d) => ({
                time: d.time,
                position: "belowBar",
                color: "#26a69a",
                shape: "circle",
                size: 1,
                text: "",
              }))
          );
        }
        if (psarsKey && indicatorData[psarsKey]) {
          psarMarkers = psarMarkers.concat(
            indicatorData[psarsKey]
              .filter(
                (d) => d.value != null && ohlcvTimes.has(timeToSeconds(d.time))
              )
              .map((d) => ({
                time: d.time,
                position: "aboveBar",
                color: "#ef5350",
                shape: "circle",
                size: 1,
                text: "",
              }))
          );
        }
      }

      const allMarkers = [...signalMarkers, ...psarMarkers];

      allMarkersRef.current = allMarkers;

      if (
        !markersPluginRef.current ||
        (markersPluginRef.current as any).series !== series
      ) {
        markersPluginRef.current = createSeriesMarkers(
          series,
          allMarkers
        ) as ReturnType<typeof createSeriesMarkers>;
      } else {
        (markersPluginRef.current as any).setMarkers(allMarkers);
      }
    }

    // 5. 차트 뷰 조정 (항상 마지막에)
    mainChart.timeScale().fitContent();
  }, [
    indicatorData,
    ohlcvData,
    signalData,
    paneIndicators,
    getPaneContainer,
    paneChartHeight,
    resolvedTheme,
    setupChart,
    indicatorMetadata,
  ]);
}
