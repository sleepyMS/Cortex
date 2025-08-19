"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useTheme } from "next-themes";
import {
  CandlestickData,
  UTCTimestamp,
  LineData,
  HistogramData,
} from "lightweight-charts";

import { useChartIndicatorManager } from "@/hooks/useChartIndicatorManager";
import { LegendData } from "@/types/chart";
import { PositionRules } from "@/types/strategy";
import { SignalData } from "@/types/market";
import { INDICATOR_METADATA } from "@/lib/indicators";
import { parseRulesForIndicators } from "@/lib/strategyUtils";

import { ChartLegend } from "./ChartLegend";
import { Spinner } from "@/components/ui/Spinner";

// --- 타입 정의 ---
interface StrategyChartProps {
  rules: {
    longEntry: PositionRules | null;
    longExit: PositionRules | null;
    shortEntry: PositionRules | null;
    shortExit: PositionRules | null;
  };
  ohlcvData?: CandlestickData<UTCTimestamp>[];
  indicatorData?: Record<
    string,
    LineData<UTCTimestamp>[] | HistogramData<UTCTimestamp>[]
  >;
  isLoadingIndicators: boolean;
  signalData?: SignalData; // 👈 [추가] 신호 데이터 prop
  isLoadingSignals?: boolean; // 👈 [추가] 신호 데이터 로딩 상태 prop
}

// --- 메인 컴포넌트 ---
export default function StrategyChart({
  rules,
  ohlcvData,
  indicatorData,
  isLoadingIndicators,
  signalData, // 👈 [추가]
  isLoadingSignals, // 👈 [추가]
}: StrategyChartProps) {
  // --- Refs ---
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const paneContainersRef = useRef<Map<string, HTMLDivElement | null>>(
    new Map()
  );

  // --- State ---
  const { resolvedTheme } = useTheme();
  const [paneIndicators, setPaneIndicators] = useState<string[]>([]);
  const [legendData, setLegendData] = useState<LegendData>({});

  // --- 파생 상태 계산 ---
  const indicatorConfigs = useMemo(
    () => parseRulesForIndicators(rules),
    [rules]
  );

  // 필요한 보조 차트 패널 목록을 계산하고 상태를 업데이트합니다.
  useEffect(() => {
    const requiredPanes = new Set<string>();
    indicatorConfigs.forEach((config) => {
      const metadata = INDICATOR_METADATA.find(
        (ind) => ind.key === config.indicatorKey
      );
      // 'pane' 타입이거나 'Volume' 지표일 경우 보조 차트로 분리합니다.
      if (
        metadata &&
        (metadata.paneType === "pane" || metadata.key === "Volume")
      ) {
        requiredPanes.add(config.indicatorKey);
      }
    });

    const newPanes = Array.from(requiredPanes);

    // 실제 패널 목록에 변화가 있을 때만 상태를 업데이트하여 불필요한 리렌더링을 방지합니다.
    setPaneIndicators((prevPanes) =>
      JSON.stringify(prevPanes) !== JSON.stringify(newPanes)
        ? newPanes
        : prevPanes
    );
  }, [indicatorConfigs]);

  // ref map에서 DOM 엘리먼트를 가져오는 콜백 함수
  const getPaneContainer = useCallback((key: string) => {
    return paneContainersRef.current.get(key);
  }, []);

  // --- 모든 차트 로직을 커스텀 훅에 위임 ---
  useChartIndicatorManager({
    mainChartContainerRef,
    paneIndicators,
    getPaneContainer,
    ohlcvData,
    indicatorData,
    signalData,
    resolvedTheme,
    setLegendData,
  });

  return (
    <div className="w-full flex flex-col relative bg-background">
      {/* 범례(Legend) UI */}
      <ChartLegend legendData={legendData} />

      {/* 지표 로딩 시 스피너 오버레이 */}
      {(isLoadingIndicators || isLoadingSignals) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
          <Spinner size="lg" />
        </div>
      )}

      {/* 메인 차트 컨테이너 */}
      <div
        ref={mainChartContainerRef}
        className="w-full h-[400px] rounded-t-lg border-x border-t border-border"
      />

      {/* 보조 지표 패널 컨테이너 (동적 렌더링) */}
      {paneIndicators.map((paneKey) => (
        <div
          key={paneKey}
          className="w-full h-[150px] border-x border-b border-t border-border"
          // ref 콜백을 사용하여 Map에 DOM 엘리먼트를 동적으로 할당/제거합니다.
          ref={(el) => {
            if (el) {
              paneContainersRef.current.set(paneKey, el);
            } else {
              paneContainersRef.current.delete(paneKey);
            }
          }}
        />
      ))}
    </div>
  );
}
