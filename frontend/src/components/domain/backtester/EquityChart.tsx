// frontend/src/components/domain/backtester/EquityChart.tsx

"use client";

import * as React from "react";
import { useRef, useEffect, useState } from "react";
// createChart, IChartApi, ISeriesApi, LineSeriesPartialOptions, Time 임포트
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineSeriesPartialOptions,
  Time,
} from "lightweight-charts";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { XCircle } from "lucide-react";

// PnL 곡선 데이터 타입 (backend/app/schemas.py의 pnl_curve_json과 일치)
interface PnlCurveDataPoint {
  time: string; // ISO 8601 문자열 (예: "2023-01-01T00:00:00Z")
  value: number;
}

interface EquityChartProps {
  pnlCurveJson?: PnlCurveDataPoint[] | null; // 백엔드로부터 받은 PnL 곡선 데이터
}

export function EquityChart({ pnlCurveJson }: EquityChartProps) {
  const t = useTranslations("EquityChart");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
        background: { color: "transparent" },
        textColor: "hsl(var(--foreground))",
      },
      grid: {
        vertLines: { color: "hsl(var(--border))" },
        horzLines: { color: "hsl(var(--border))" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      crosshair: {
        mode: 0,
      },
    });

    // 👈 이 부분: IChartApi에 addLineSeries가 없다는 타입 오류를 해결하기 위해 'as any' 캐스팅 사용
    // 실제 런타임에서는 addLineSeries 메서드가 존재할 것이므로, 컴파일러 오류를 우회하는 목적입니다.
    const series = (chart as any).addLineSeries({
      // 👈 as any 캐스팅 추가
      color: "hsl(var(--primary))",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: 300,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !pnlCurveJson) {
      seriesRef.current?.setData([]);
      setChartError(null);
      return;
    }

    try {
      const chartData = pnlCurveJson.map((d) => ({
        time: d.time as Time,
        value: d.value,
      }));

      if (chartData.length < 2) {
        setChartError(t("notEnoughData"));
        seriesRef.current.setData([]);
        return;
      }

      seriesRef.current.setData(chartData);
      chartRef.current?.timeScale().fitContent();
      setChartError(null);
    } catch (e: any) {
      setChartError(t("chartDataError", { errorDetail: e.message }));
      console.error("Error setting chart data:", e);
      seriesRef.current?.setData([]);
    }
  }, [pnlCurveJson, t]);

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-2xl font-bold text-foreground">{t("title")}</h2>
      {chartError ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-destructive-foreground">
          <XCircle className="h-8 w-8 mb-3 text-destructive" />
          <p className="text-center">{chartError}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {t("checkBacktestResults")}
          </p>
        </div>
      ) : (
        <div
          ref={chartContainerRef}
          className="w-full"
          style={{ minHeight: "300px" }}
        />
      )}
    </Card>
  );
}
