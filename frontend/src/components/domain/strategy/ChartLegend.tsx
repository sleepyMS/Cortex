"use client";

import React, { useMemo, useCallback } from "react";
import { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { clsx } from "clsx";

import { useIndicatorStore } from "@/store/indicatorStore";
import { LegendData } from "@/types/chart";
import { IndicatorMetadata } from "@/types/indicator";

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
  const indicatorMetadata = useIndicatorStore((state) => state.metadata);

  const parseIndicatorKey = useCallback(
    (fullKey: string) => {
      // 1. 'kind'를 기준으로 포괄적인 메타데이터를 먼저 찾습니다. (가장 안정적인 방법)
      const metadata = indicatorMetadata.find((m) =>
        fullKey.toLowerCase().startsWith(m.kind.toLowerCase())
      );

      // 메타데이터를 찾지 못하면 원본 키를 그대로 반환합니다.
      if (!metadata) {
        return {
          label: fullKey,
          params: "",
          outputLabel: "",
        };
      }

      // 2. 메타데이터를 찾았다면, 세부 정보를 분석합니다.
      let paramsString = fullKey.substring(metadata.kind.length);
      let outputLabel = "";

      // 3. 어떤 출력(output)에 해당하는지 찾아서 라벨과 파라미터 부분을 분리합니다.
      if (metadata.outputs && metadata.outputs.length > 0) {
        // 가장 긴 키부터 확인하여 정확한 output을 찾습니다 (예: 'macdh'가 'macd'보다 먼저 확인됨).
        const sortedOutputs = [...metadata.outputs].sort(
          (a, b) => b.key.length - a.key.length
        );

        for (const out of sortedOutputs) {
          const outKey = out.key.toLowerCase();
          if (paramsString.toLowerCase().startsWith(outKey)) {
            outputLabel = out.label;
            paramsString = paramsString.substring(outKey.length);
            break;
          }
        }
      }

      // 4. 남은 부분에서 파라미터를 추출하고 포맷팅합니다.
      const finalParams = paramsString
        .split("_")
        .filter((p) => p !== "") // 빈 문자열 제거
        .join(", ");

      return {
        label: metadata.label,
        params: finalParams ? `(${finalParams})` : "",
        outputLabel: outputLabel,
      };
    },
    [indicatorMetadata]
  );

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
            const { label, params, outputLabel } = parseIndicatorKey(key);
            // 여러 출력 라인이 있는 경우 (예: MACD 라인) 라벨을 괄호로 묶어줍니다.
            const displayOutput = outputLabel ? ` (${outputLabel})` : "";

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
