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
  DeepPartial,
  ChartOptions,
  SeriesType,
  TimeRange,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import { INDICATOR_METADATA } from "@/lib/indicators";
import { LegendData } from "@/types/chart";

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

const timeToSeconds = (time: UTCTimestamp | string): number => {
  if (typeof time === "string") {
    return Math.floor(new Date(time).getTime() / 1000);
  }
  return time;
};

export function useChartIndicatorManager({
  mainChartContainerRef,
  paneIndicators,
  getPaneContainer,
  ohlcvData,
  indicatorData,
  resolvedTheme,
  setLegendData,
}: ChartManagerProps) {
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const paneChartRefs = useRef<Map<string, IChartApi>>(new Map());
  const indicatorSeriesRef = useRef<Map<string, SeriesMapValue>>(new Map());
  const ohlcvCacheRef = useRef<Map<number, CandlestickData>>(new Map());
  const indicatorCacheRef = useRef<
    Map<string, Map<number, LineData | HistogramData>>
  >(new Map());

  const syncTimeScale = (
    sourceChart: IChartApi,
    timeRange: TimeRange | null
  ) => {
    if (!timeRange || timeRange.from === null || timeRange.to === null) {
      return;
    }
    [chartRef.current, ...paneChartRefs.current.values()].forEach((chart) => {
      if (chart && chart !== sourceChart) {
        try {
          chart.timeScale().setVisibleRange(timeRange);
        } catch (error) {
          // console.error("Time scale sync failed for a chart:", error);
        }
      }
    });
  };

  const syncCrosshair = (sourceChart: IChartApi, param: any) => {
    if (!param.point || param.time == null) {
      setLegendData({});
      return;
    }

    const newLegendData: LegendData = {};
    const timeSec = timeToSeconds(param.time);
    const candleData = ohlcvCacheRef.current.get(timeSec);
    if (candleData) {
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
          time: timeToSeconds(indicatorPoint.time),
          color:
            "color" in seriesOptions
              ? (seriesOptions.color as string)
              : undefined,
        };
      }
    });
    setLegendData(newLegendData);
  };

  useEffect(() => {
    if (mainChartContainerRef.current && !chartRef.current) {
      const chartOptions: DeepPartial<ChartOptions> = {
        width: mainChartContainerRef.current.clientWidth,
        height: 400,
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderVisible: false },
        timeScale: {
          borderVisible: false,
          rightOffset: 50,
          fixRightEdge: true,
          // 👇 [수정] 시간 축 포맷터를 하이픈(-) 기준으로 변경합니다.
          tickMarkFormatter: (time: UTCTimestamp) => {
            const date = new Date(time * 1000);
            return new Intl.DateTimeFormat("en-CA", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              timeZone: "Asia/Seoul",
            }).format(date);
          },
        },
        // 👇 [수정] 차트 현지화(시간 포맷) 옵션을 하이픈(-) 기준으로 변경합니다.
        localization: {
          locale: "ko-KR",
          timeFormatter: (time: UTCTimestamp) => {
            const date = new Date(time * 1000);
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
          },
        },
        handleScroll: {
          pressedMouseMove: true,
          mouseWheel: true,
        },
        handleScale: {
          axisPressedMouseMove: false,
          mouseWheel: true,
          pinch: true,
        },
      };

      const mainChart = createChart(
        mainChartContainerRef.current,
        chartOptions
      );
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
        .subscribeVisibleTimeRangeChange((range) =>
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
    }
  }, []);

  useEffect(() => {
    const chartsMap = paneChartRefs.current;
    paneIndicators.forEach((paneKey) => {
      const container = getPaneContainer(paneKey);
      if (container && !chartsMap.has(paneKey)) {
        const paneChartOptions: DeepPartial<ChartOptions> = {
          width: container.clientWidth,
          height: 150,
          crosshair: { mode: CrosshairMode.Normal },
          rightPriceScale: { borderVisible: false },
          timeScale: {
            borderVisible: false,
            rightOffset: 50,
            fixRightEdge: true,
            // 👇 [수정] 보조 차트에도 동일한 하이픈(-) 시간 축 포맷터를 적용합니다.
            tickMarkFormatter: (time: UTCTimestamp) => {
              const date = new Date(time * 1000);
              return new Intl.DateTimeFormat("en-CA", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                timeZone: "Asia/Seoul",
              }).format(date);
            },
          },
          // 👇 [수정] 보조 차트에도 동일한 하이픈(-) 현지화 옵션을 적용합니다.
          localization: {
            locale: "ko-KR",
            timeFormatter: (time: UTCTimestamp) => {
              const date = new Date(time * 1000);
              return new Intl.DateTimeFormat("en-CA", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                timeZone: "Asia/Seoul",
              })
                .format(date)
                .replace(/,/, "");
            },
          },
          handleScroll: {
            pressedMouseMove: false,
            mouseWheel: true,
          },
          handleScale: {
            axisPressedMouseMove: false,
            mouseWheel: true,
            pinch: true,
          },
        };
        const paneChart = createChart(container, paneChartOptions);
        chartsMap.set(paneKey, paneChart);

        paneChart
          .timeScale()
          .subscribeVisibleTimeRangeChange((range) =>
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

  useEffect(() => {
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
    };
    allCharts.forEach((chart) => chart?.applyOptions(options));

    if (ohlcvData) {
      const cache = new Map<number, CandlestickData>();
      ohlcvData.forEach((d) => cache.set(timeToSeconds(d.time), d));
      ohlcvCacheRef.current = cache;
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(ohlcvData);
      }
    }
    if (indicatorData) {
      const cache = new Map<string, Map<number, LineData | HistogramData>>();
      Object.entries(indicatorData).forEach(([key, dataPoints]) => {
        const innerMap = new Map<number, LineData | HistogramData>();
        dataPoints.forEach((p) => innerMap.set(timeToSeconds(p.time), p));
        cache.set(key, innerMap);
      });
      indicatorCacheRef.current = cache;
    }
  }, [resolvedTheme, ohlcvData, indicatorData]);

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
      Object.entries(indicatorData).forEach(([key, data]) => {
        const metadata = INDICATOR_METADATA.find((ind) =>
          key.toUpperCase().startsWith(ind.key.toUpperCase())
        );
        if (!metadata) {
          console.error(
            `[오류] 키 '${key}'에 대한 메타데이터를 찾을 수 없습니다!`
          );
          return;
        }
        const isPaneIndicator =
          metadata.paneType === "pane" || metadata.key === "Volume";
        let targetChart = chartRef.current;
        if (isPaneIndicator) {
          const foundPane = paneChartRefs.current.get(metadata.key);
          if (foundPane) {
            targetChart = foundPane;
          }
        }
        if (!targetChart || !data) return;
        const isHistogram =
          key.toLowerCase().includes("histogram") || metadata.key === "Volume";
        const seriesType = isHistogram ? HistogramSeries : LineSeries;
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
  }, [indicatorData, paneIndicators]);
}
