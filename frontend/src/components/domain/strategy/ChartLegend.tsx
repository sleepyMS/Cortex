"use client";

import { useMemo } from "react";
import { CandlestickData, UTCTimestamp } from "lightweight-charts";
import { clsx } from "clsx";

import { INDICATOR_METADATA } from "@/lib/indicators";
import { LegendData } from "@/hooks/useChartIndicatorManager";

// --- 타입 정의 ---
interface ChartLegendProps {
  legendData: LegendData;
}

// --- 헬퍼 함수 ---

/**
 * 숫자 값을 소수점 2자리 문자열로 포맷합니다.
 * 값이 없으면 '-'를 반환합니다.
 */
const formatValue = (value?: number) => {
  if (value === undefined || value === null) return "-";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4, // 암호화폐처럼 소수점 이하 단위가 많을 경우를 대비
  });
};

/**
 * 지표의 전체 키 문자열(예: 'MACD_12_26_9_histogram')을
 * 사용자가 보기 좋은 형태로 파싱합니다.
 * @returns { label: 'MACD', params: '(12, 26, 9)', output: '히스토그램' }
 */
const parseIndicatorKey = (fullKey: string) => {
  const parts = fullKey.split("_");
  // 첫 부분을 기반으로 기본 지표 키를 찾습니다 (대소문자 무시).
  const indicatorKey =
    INDICATOR_METADATA.find(
      (m) => m.key.toUpperCase() === parts[0].toUpperCase()
    )?.key || parts[0];

  const metadata = INDICATOR_METADATA.find((m) => m.key === indicatorKey);

  // 메타데이터를 찾을 수 없으면 키를 그대로 반환합니다.
  if (!metadata) {
    return { label: fullKey, params: "", output: "" };
  }

  // 파라미터와 출력값을 키에서 분리합니다.
  const paramKeys = new Set(metadata.parameters.map((p) => p.key));
  const outputKeys = new Set(metadata.outputs.map((o) => o.key));

  const paramValues: string[] = [];
  const outputValues: string[] = [];

  // 키의 각 부분을 순회하며 파라미터와 출력값을 식별합니다.
  // 예: 'MACD_12_26_9_histogram' -> '12', '26', '9'는 파라미터, 'histogram'은 출력값
  parts.slice(1).forEach((part) => {
    // 숫자인 경우 파라미터로 간주
    if (!isNaN(Number(part))) {
      paramValues.push(part);
    } else {
      // 메타데이터의 출력값 키에 포함되는 경우 출력값으로 간주
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
    // 출력값이 여러 개일 때만 레이블을 표시하여 명료성을 높입니다.
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

  // 캔들 등락률 계산
  const change = useMemo(() => {
    if (!candle || candle.open === undefined || candle.close === undefined)
      return { value: 0, pct: 0 };
    const value = candle.close - candle.open;
    const pct = candle.open === 0 ? 0 : (value / candle.open) * 100;
    return { value, pct };
  }, [candle]);

  // 범례 데이터가 없으면 아무것도 렌더링하지 않습니다.
  if (Object.keys(legendData).length === 0 || !candle) {
    return null;
  }

  return (
    <div className="absolute top-3 left-3 z-20 p-2 rounded-md bg-background/80 backdrop-blur-sm text-xs pointer-events-none select-none shadow-lg border border-border">
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
          {/* 캔들 변동률(%) 표시 */}
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
