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
  const markersPluginRef = useRef<ReturnType<
    typeof createSeriesMarkers
  > | null>(null);

  // [핵심] 전역 스토어에서 최신 지표 메타데이터를 가져옵니다.
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
    // candlestickSeriesRef.current = mainChart.addSeries(CandlestickSeries, {
    //   upColor: "#26a69a",
    //   downColor: "#ef5350",
    //   borderVisible: false,
    //   wickUpColor: "#26a69a",
    //   wickDownColor: "#ef5350",
    // });
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
    if (ohlcvData && chartRef.current) {
      // chartRef.current만 확인
      const mainChart = chartRef.current; // 추가

      // ▼▼▼ [수정 2] candlestickSeriesRef.current가 null이면 생성합니다. ▼▼▼
      if (!candlestickSeriesRef.current) {
        candlestickSeriesRef.current = mainChart.addSeries(CandlestickSeries, {
          upColor: "#26a69a",
          downColor: "#ef5350",
          borderVisible: false,
          wickUpColor: "#26a69a",
          wickDownColor: "#ef5350",
        });
      }
      const cache = new Map<number, CandlestickData<UTCTimestamp>>();
      ohlcvData.forEach((d) => cache.set(timeToSeconds(d.time), d));
      ohlcvCacheRef.current = cache;
      // candlestickSeriesRef.current.setData(ohlcvData);
      // // 데이터 로드 후 차트 뷰 자동 조정
      // chartRef.current?.timeScale().fitContent();
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

          // ▼▼▼ [수정 1] 시리즈 '업데이트' 시 null 값 필터링 ▼▼▼
          const seriesData = indicatorData?.[fullKey] || [];
          const filteredData = seriesData.filter(
            (d) => d.value !== null && d.value !== undefined
          );
          series.setData(filteredData as any);
          // ▲▲▲ [수정 완료] ▲▲▲
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
      const dataToProcess = { ...indicatorData };

      // --- 볼린저 밴드 사전 처리 ---
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
        const metadata = indicatorMetadata.find((meta) => meta.kind === "bb");
        if (metadata) {
          const baseKey = metadata.key;
          let indicatorState = manager.get(baseKey);
          if (!indicatorState) {
            indicatorState = { paneChart: null, series: new Map() };
            manager.set(baseKey, indicatorState);
          }

          const theme = getThemeOptions(resolvedTheme);
          let backgroundColor =
            resolvedTheme === "dark" ? "#171819" : "#FFFFFF";
          if (
            theme.layout?.background?.type === ColorType.Solid &&
            theme.layout.background.color
          ) {
            backgroundColor = theme.layout.background.color;
          }
          const fillColor = "rgba(33, 150, 243, 0.2)";
          const lineColor = "rgba(33, 150, 243, 0.8)";
          const bbmLineColor = "rgba(255, 82, 82, 0.8)";

          const bbuData = (dataToProcess[bbuKey] || []).filter(
            (d) => d.value != null
          );
          const bbmData = (dataToProcess[bbmKey] || []).filter(
            (d) => d.value != null
          );
          const bblData = (dataToProcess[bblKey] || []).filter(
            (d) => d.value != null
          );

          // 1. 상단 밴드 (AreaSeries, 반투명 색으로 채우기)
          let bbuSeries = indicatorState.series.get(bbuKey) as
            | ISeriesApi<"Area">
            | undefined;
          if (!bbuSeries) {
            bbuSeries = mainChart.addSeries(AreaSeries, {
              lineColor: lineColor,
              topColor: "transparent",
              bottomColor: "transparent",
              lineWidth: 1,
              priceLineVisible: false, // 범례에만 가격이 표시되도록 설정
              lastValueVisible: false,
            });
            indicatorState.series.set(bbuKey, bbuSeries);
          }
          bbuSeries.setData(bbuData as any);

          // 2. 하단 밴드 (AreaSeries, 배경색으로 채워서 '지우개' 역할)
          let bblSeries = indicatorState.series.get(bblKey) as
            | ISeriesApi<"Area">
            | undefined;
          if (!bblSeries) {
            bblSeries = mainChart.addSeries(AreaSeries, {
              lineColor: lineColor,
              topColor: "transparent",
              bottomColor: "transparent",
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(bblKey, bblSeries);
          }
          bblSeries.setData(bblData as any);

          // 3. 중간 밴드 (LineSeries, 점선으로 표시)
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

          // 처리된 키들을 복사본에서 삭제
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

          const theme = getThemeOptions(resolvedTheme);
          let backgroundColor =
            resolvedTheme === "dark" ? "#171819" : "#FFFFFF";
          if (
            theme.layout?.background?.type === ColorType.Solid &&
            theme.layout.background.color
          ) {
            backgroundColor = theme.layout.background.color;
          }

          // 볼린저 밴드와 다른 색상으로 구분 (예: 보라색 계열)
          const fillColor = "rgba(126, 87, 194, 0.2)";
          const lineColor = "rgba(126, 87, 194, 0.8)";
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

          // 1. 상단 채널 (AreaSeries, 색 채우기)
          let kcueSeries = indicatorState.series.get(kcueKey) as
            | ISeriesApi<"Area">
            | undefined;
          if (!kcueSeries) {
            kcueSeries = mainChart.addSeries(AreaSeries, {
              lineColor: lineColor,
              topColor: "transparent",
              bottomColor: "transparent",
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(kcueKey, kcueSeries);
          }
          kcueSeries.setData(kcueData as any);

          // 2. 하단 채널 (AreaSeries, 지우개 역할)
          let kcleSeries = indicatorState.series.get(kcleKey) as
            | ISeriesApi<"Area">
            | undefined;
          if (!kcleSeries) {
            kcleSeries = mainChart.addSeries(AreaSeries, {
              lineColor: lineColor,
              topColor: "transparent",
              bottomColor: "transparent",
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(kcleKey, kcleSeries);
          }
          kcleSeries.setData(kcleData as any);

          // 3. 중간선 (LineSeries, 점선)
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

          const theme = getThemeOptions(resolvedTheme);
          let backgroundColor =
            resolvedTheme === "dark" ? "#171819" : "#FFFFFF";
          if (
            theme.layout?.background?.type === ColorType.Solid &&
            theme.layout.background.color
          ) {
            backgroundColor = theme.layout.background.color;
          }

          const cloudFillColor = "rgba(76, 175, 80, 0.2)"; // 반투명 초록색 (구름대)

          const isaData = (dataToProcess[isaKey] || []).filter(
            (d) => d.value != null
          );
          const isbData = (dataToProcess[isbKey] || []).filter(
            (d) => d.value != null
          );

          const isaMap = new Map(isaData.map((d) => [d.time, d.value]));
          const isbMap = new Map(isbData.map((d) => [d.time, d.value]));
          const allTimes = new Set([...isaMap.keys(), ...isbMap.keys()]);

          const cloudTopData: LineData[] = [];
          const cloudBottomData: LineData[] = [];

          allTimes.forEach((time) => {
            const a = isaMap.get(time);
            const b = isbMap.get(time);
            if (a !== undefined && b !== undefined) {
              cloudTopData.push({ time, value: Math.max(a, b) });
              cloudBottomData.push({ time, value: Math.min(a, b) });
            }
          });

          // 1. 구름대 상단 (먼저 색칠)
          const topKey = `${baseKey}_cloud_top`;
          let topSeries = indicatorState.series.get(topKey) as
            | ISeriesApi<"Area">
            | undefined;
          if (!topSeries) {
            topSeries = mainChart.addSeries(AreaSeries, {
              lineColor: "transparent",
              topColor: "transparent",
              bottomColor: "transparent",
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(topKey, topSeries);
          }
          topSeries.setData(cloudTopData as any);

          // 2. 구름대 하단 (나중에 덧그려서 지우기)
          const bottomKey = `${baseKey}_cloud_bottom`;
          let bottomSeries = indicatorState.series.get(bottomKey) as
            | ISeriesApi<"Area">
            | undefined;
          if (!bottomSeries) {
            bottomSeries = mainChart.addSeries(AreaSeries, {
              lineColor: "transparent",
              topColor: "transparent",
              bottomColor: "transparent",
              priceLineVisible: false,
              lastValueVisible: false,
            });
            indicatorState.series.set(bottomKey, bottomSeries);
          }
          bottomSeries.setData(cloudBottomData as any);

          // ▲▲▲ [수정 완료] ▲▲▲

          // 3. 실제 5개 라인을 얇은 LineSeries로 위에 다시 그립니다.
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
            { key: isaKey, data: isaData, color: "rgba(76, 175, 80, 0.5)" }, // 선행스팬 A (구름대 경계선)
            { key: isbKey, data: isbData, color: "rgba(239, 83, 80, 0.5)" }, // 선행스팬 B (구름대 경계선)
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

      // 슈퍼트렌드 데이터를 사전 처리하는 로직 추가
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
        // 무시할 지표 키 접두사 목록을 만들어 한번에 필터링합니다.
        const ignoredPrefixes = ["supertd", "bbb", "bbp"];
        if (
          ignoredPrefixes.some((prefix) =>
            fullSeriesKey.toLowerCase().startsWith(prefix)
          )
        ) {
          return;
        }

        // 'kind' 속성을 사용하여 메타데이터를 안정적으로 찾습니다.
        const metadata = indicatorMetadata.find((meta) =>
          fullSeriesKey.toLowerCase().startsWith(meta.kind.toLowerCase())
        );

        if (!metadata || !data || data.length === 0) return;

        // 'baseKey'는 표준 속성인 'indicatorKey'를 사용합니다.
        const baseKey = metadata.key;

        if (!manager.has(baseKey)) {
          let paneChart: IChartApi | null = null;

          if (paneIndicators.includes(baseKey)) {
            // Step 1 수정으로 인해 paneIndicators가 올바른 값을 가지므로,
            // 이 블록이 이제 정상적으로 실행됩니다.
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
          const filteredData = data.filter(
            (d) => d.value !== null && d.value !== undefined
          );
          newSeries.setData(filteredData as any);
          indicatorState.series.set(fullSeriesKey, newSeries);
        }
      });
    }
    // const mainChart = chartRef.current;
    const ohlcvDataToSet = ohlcvData || [];

    if (mainChart) {
      if (candlestickSeriesRef.current) {
        // 기존 캔들 시리즈를 제거하여 Z-Order를 리셋할 준비를 합니다.
        const oldSeries = candlestickSeriesRef.current;
        mainChart.removeSeries(oldSeries);
      }

      // 새 시리즈를 추가하여 모든 지표 시리즈보다 가장 높은 Z-Order를 부여합니다.
      const newCandleSeries = mainChart.addSeries(CandlestickSeries, {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      });

      // 데이터 및 ref 업데이트
      newCandleSeries.setData(ohlcvDataToSet as any);
      candlestickSeriesRef.current = newCandleSeries;

      // 마커 플러그인을 리셋하여 Effect 4가 새 시리즈로 다시 만들게 합니다. (마커 사라짐 문제 해결)
      markersPluginRef.current = null;

      // 모든 데이터 로드 후 차트 뷰 자동 조정
      mainChart.timeScale().fitContent();
    }
    // ▲▲▲ [수정 3] Z-Order 및 마커 리셋 로직 완료 ▲▲▲
  }, [
    indicatorData,
    paneIndicators,
    getPaneContainer,
    paneChartHeight,
    resolvedTheme,
    setupChart,
    indicatorMetadata,
    ohlcvData, // 의존성 추가
  ]);

  // Effect 4: 신호 및 파라볼릭 SAR 마커 렌더링
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series || !ohlcvData || ohlcvCacheRef.current.size === 0) {
      if (markersPluginRef.current) {
        (markersPluginRef.current as any).setMarkers([]);
      }
      return;
    }

    // --- 1. 매수/매도 신호 마커 생성 (기존 로직) ---
    const ohlcvTimes = new Set(Array.from(ohlcvCacheRef.current.keys()));

    // 기존 markers 변수명을 signalMarkers로 변경하여 역할 명확화
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
        }
        return { time: signal.time, position, color, shape, text };
      });

    // --- 2. 파라볼릭 SAR 마커 생성 (새로운 로직) ---
    let psarMarkers: SeriesMarker<Time>[] = [];
    if (indicatorData) {
      const psarlKey = Object.keys(indicatorData).find((k) =>
        k.startsWith("psarl_")
      );
      const psarsKey = Object.keys(indicatorData).find((k) =>
        k.startsWith("psars_")
      );

      if (psarlKey && indicatorData[psarlKey]) {
        const psarlData = indicatorData[psarlKey].filter(
          (d) => d.value != null && ohlcvTimes.has(timeToSeconds(d.time))
        );
        psarMarkers = psarMarkers.concat(
          psarlData.map((d) => ({
            time: d.time,
            position: "belowBar",
            color: "#26a69a", // 반투명 제거
            shape: "circle",
            size: 1, // 가장 작은 크기로 변경
            text: "",
          }))
        );
      }
      if (psarsKey && indicatorData[psarsKey]) {
        const psarsData = indicatorData[psarsKey].filter(
          (d) => d.value != null && ohlcvTimes.has(timeToSeconds(d.time))
        );
        psarMarkers = psarMarkers.concat(
          psarsData.map((d) => ({
            time: d.time,
            position: "aboveBar",
            color: "#ef5350", // 반투명 제거
            shape: "circle",
            size: 1, // 가장 작은 크기로 변경
            text: "",
          }))
        );
      }
    }

    // --- 3. 모든 마커를 하나로 합치기 ---
    const allMarkers = [...signalMarkers, ...psarMarkers];

    // --- 4. 마커 플러그인에 최종 마커 데이터 설정 ---
    if (!markersPluginRef.current) {
      markersPluginRef.current = createSeriesMarkers(
        series,
        allMarkers
      ) as ReturnType<typeof createSeriesMarkers>;
    } else {
      (markersPluginRef.current as any).setMarkers(allMarkers);
    }
  }, [signalData, ohlcvData, indicatorData]); // 의존성 배열에 indicatorData 추가
}
