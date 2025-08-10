"use client";

import { useMemo } from "react";
import { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { clsx } from "clsx";

import { INDICATOR_METADATA } from "@/lib/indicators";
import { LegendData } from "@/types/chart";

// --- 타입 정의 ---
interface ChartLegendProps {
  legendData: LegendData;
}

// --- 헬퍼 함수 ---

// 👇 [수정] UTC 타임스탬프를 'YYYY-MM-DD HH:mm' 형식의 KST 문자열로 변환하는 함수
const formatTimestampToKST = (timestamp?: UTCTimestamp): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    // 'ko-KR' 대신 'en-CA'를 사용하면 YYYY-MM-DD 형식을 쉽게 얻을 수 있습니다.
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  });

  // "2025-08-11, 10:32" 같은 형식을 "2025-08-11 10:32"로 정리
  return formatter.format(date).replace(/,/, "");
};

/**
 * 숫자 값을 소수점 n자리 문자열로 포맷합니다.
 */
const formatValue = (value?: number) => {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
};

/**
 * 지표 키를 파싱하여 사용자에게 보여줄 이름으로 변환합니다.
 */
const parseIndicatorKey = (fullKey: string) => {
  const parts = fullKey.split("_");
  const indicatorKey =
    INDICATOR_METADATA.find(
      (m) => m.key.toUpperCase() === parts[0].toUpperCase()
    )?.key || parts[0];

  const metadata = INDICATOR_METADATA.find((m) => m.key === indicatorKey);
  if (!metadata) {
    return { label: fullKey, params: "", output: "" };
  }

  const outputKeys = new Set(metadata.outputs.map((o) => o.key));
  const paramValues: string[] = [];
  const outputValues: string[] = [];

  parts.slice(1).forEach((part) => {
    if (!isNaN(Number(part))) {
      paramValues.push(part);
    } else {
      if (outputKeys.has(part.toLowerCase())) {
        outputValues.push(part);
      }
    }
  });

  const selectedOutput = metadata.outputs.find(
    (o) => o.key === (outputValues[0] || "")
  );

  return {
    label: metadata.label,
    params: paramValues.length > 0 ? `(${paramValues.join(", ")})` : "",
    output:
      metadata.outputs.length > 1 && selectedOutput ? selectedOutput.label : "",
  };
};

// --- 메인 컴포넌트 ---
export function ChartLegend({ legendData }: ChartLegendProps) {
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
      {/* 👇 [수정] 시간 표시 UI의 스타일을 회색(muted)으로 변경 */}
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
            const { label, params, output } = parseIndicatorKey(key);
            const displayOutput = output ? ` (${output})` : "";

            return (
              <div key={key} className="flex items-center gap-x-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: data.color || "gray" }}
                />
                <span className="text-muted-foreground">
                  {label} {params}
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
