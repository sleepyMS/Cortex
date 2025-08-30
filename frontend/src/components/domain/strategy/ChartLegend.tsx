"use client";

import React, { useMemo, useCallback } from "react";
import { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { clsx } from "clsx";

// ▼▼▼ [핵심 수정 1] Zustand 스토어를 import 합니다. ▼▼▼
import { useIndicatorStore } from "@/store/indicatorStore";
import { LegendData } from "@/types/chart";
import { IndicatorMetadata } from "@/types/indicator";
// ▲▲▲ [수정 완료] ▲▲▲

// --- 타입 정의 ---
interface ChartLegendProps {
  legendData: LegendData;
}

// --- 헬퍼 함수 ---
const formatTimestampToKST = (timestamp?: UTCTimestamp): string => {
  if (!timestamp) return "";
  const date = new Date((timestamp as number) * 1000);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
};

const formatValue = (value?: number) => {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
};

// --- 메인 컴포넌트 ---
export function ChartLegend({ legendData }: ChartLegendProps) {
  // ▼▼▼ [핵심 수정 2] 전역 스토어에서 최신 지표 메타데이터를 가져옵니다. ▼▼▼
  const indicatorMetadata = useIndicatorStore((state) => state.metadata);
  // ▲▲▲ [수정 완료] ▲▲▲

  // ▼▼▼ [핵심 수정 3] 지표 키 파싱 로직을 개선하고, 전역 메타데이터를 사용하도록 변경합니다. ▼▼▼
  const parseIndicatorKey = useCallback(
    (fullKey: string) => {
      const parts = fullKey.split("_");
      if (parts.length < 2) return { label: fullKey, params: "", output: "" };

      const kind = parts[0];
      const timeframe = parts[parts.length - 1];
      const paramsArray = parts.slice(1, -1);

      // `kind`를 기반으로 메타데이터를 찾습니다. (예: 'ema' -> EMA 메타데이터)
      const metadata = indicatorMetadata.find((m) => m.kind === kind);
      if (!metadata) {
        return { label: fullKey, params: "", output: "" };
      }

      // 출력(output) 이름 찾기 (예: MACD의 histogram)
      // 이 부분은 더 정교한 로직으로 개선될 수 있습니다.
      const output = "";

      return {
        label: metadata.label,
        params: paramsArray.length > 0 ? `(${paramsArray.join(", ")})` : "",
        output: output,
        timeframe: timeframe,
      };
    },
    [indicatorMetadata]
  ); // 메타데이터가 변경될 때만 이 함수가 재생성됩니다.

  const candle = legendData.CANDLE as CandlestickData<UTCTimestamp> | undefined;
  const indicators = Object.entries(legendData).filter(
    ([key]) => key !== "CANDLE" && legendData[key] !== undefined
  );

  const change = useMemo(() => {
    if (!candle || candle.open === undefined || candle.close === undefined)
      return { value: 0, pct: 0 };
    const value = candle.close - candle.open;
    const pct = candle.open === 0 ? 0 : (value / candle.open) * 100;
    return { value, pct };
  }, [candle]);

  if (Object.keys(legendData).length === 0 || !candle) {
    return null;
  }

  return (
    <div className="absolute top-3 left-3 z-20 p-2 rounded-md bg-background/80 backdrop-blur-sm text-xs pointer-events-none select-none shadow-lg border border-border">
      <div className="font-mono text-muted-foreground mb-1">
        {formatTimestampToKST(candle.time)}
      </div>

      <div className="flex items-center gap-x-4">
        {/* OHLC 가격 정보 */}
        <div className="flex gap-x-2 font-mono">
          <div className="flex items-center gap-x-1">
            <span className="text-muted-foreground">O</span>
            <span className="font-semibold">{formatValue(candle.open)}</span>
          </div>
          <div className="flex items-center gap-x-1">
            <span className="text-muted-foreground">H</span>
            <span className="font-semibold">{formatValue(candle.high)}</span>
          </div>
          <div className="flex items-center gap-x-1">
            <span className="text-muted-foreground">L</span>
            <span className="font-semibold">{formatValue(candle.low)}</span>
          </div>
          <div className="flex items-center gap-x-1">
            <span className="text-muted-foreground">C</span>
            <span className="font-semibold">{formatValue(candle.close)}</span>
          </div>
          <div
            className={clsx(
              "font-semibold",
              change.value >= 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {change.value.toFixed(2)} ({change.pct.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* 지표 정보 */}
      {indicators.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
          {indicators.map(([key, data]) => {
            if (!data) return null;
            const { label, params, output, timeframe } = parseIndicatorKey(key);
            const displayOutput = output ? ` (${output})` : "";

            return (
              <div key={key} className="flex items-center gap-x-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: data.color || "gray" }}
                />
                <span className="text-muted-foreground">
                  {label} {params}
                  <span className="ml-1 text-primary/70 font-semibold">
                    {timeframe}
                  </span>
                  {displayOutput}
                </span>
                <span className="font-semibold font-mono ml-auto">
                  {formatValue(data.value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
