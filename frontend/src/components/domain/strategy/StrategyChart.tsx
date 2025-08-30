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
import { ChartLegend } from "./ChartLegend";
import { Spinner } from "@/components/ui/Spinner";

// ▼▼▼ [핵심 수정 1] Zustand 스토어와 중앙화된 타입을 import 합니다. ▼▼▼
import { useIndicatorStore } from "@/store/indicatorStore";
import { IndicatorMetadata } from "@/types/indicator";
import { LegendData } from "@/types/chart";
import { PositionRules, IndicatorValue, LogicBlock } from "@/types/strategy";
import { SignalData } from "@/types/market";
// ▲▲▲ [수정 완료] ▲▲▲

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
  signalData?: SignalData;
  isLoadingSignals?: boolean;
}

// --- 메인 컴포넌트 ---
export default function StrategyChart({
  rules,
  ohlcvData,
  indicatorData,
  isLoadingIndicators,
  signalData,
  isLoadingSignals,
}: StrategyChartProps) {
  // --- Refs ---
  const mainChartContainerRef = useRef<HTMLDivElement>(null);
  const paneContainersRef = useRef<Map<string, HTMLDivElement | null>>(
    new Map()
  );

  // --- State ---
  const { resolvedTheme } = useTheme();
  const [legendData, setLegendData] = useState<LegendData>({});

  // ▼▼▼ [핵심 수정 2] 전역 스토어에서 최신 지표 메타데이터를 가져옵니다. ▼▼▼
  const indicatorMetadata = useIndicatorStore((state) => state.metadata);
  // ▲▲▲ [수정 완료] ▲▲▲

  // ▼▼▼ [핵심 수정 3] useMemo 훅을 사용하여, 규칙(rules)이 바뀔 때마다
  // 필요한 지표 설정과 보조 패널 목록을 한 번에 계산합니다. ▼▼▼
  const { indicatorConfigs, paneIndicators } = useMemo(() => {
    const indicators = new Map<string, IndicatorValue>();
    const requiredPanes = new Set<string>();

    // 재귀적으로 모든 규칙을 탐색하여 IndicatorValue를 추출하는 헬퍼 함수
    const findIndicatorsRecursively = (blocks: LogicBlock[]) => {
      blocks.forEach((block) => {
        Object.values(block).forEach((value) => {
          if (value && typeof value === "object" && "indicatorKey" in value) {
            const indicator = value as IndicatorValue;
            // 고유 식별자를 만들어 중복 계산 방지
            const uniqueId = `${indicator.indicatorKey}-${JSON.stringify(
              indicator.values
            )}`;
            if (!indicators.has(uniqueId)) {
              indicators.set(uniqueId, indicator);
            }
          }
        });
        if (block.children) {
          findIndicatorsRecursively(block.children);
        }
      });
    };

    Object.values(rules).forEach((rule) => {
      if (rule?.blocks) findIndicatorsRecursively(rule.blocks);
    });

    const configs = Array.from(indicators.values());

    // 추출된 지표 설정을 기반으로 보조 패널이 필요한지 결정
    configs.forEach((config) => {
      const metadata = indicatorMetadata.find(
        (ind) => ind.key === config.indicatorKey
      );
      if (metadata && metadata.paneType === "pane") {
        requiredPanes.add(config.indicatorKey);
      }
    });

    return {
      indicatorConfigs: configs,
      paneIndicators: Array.from(requiredPanes),
    };
  }, [rules, indicatorMetadata]); // 규칙이나 메타데이터가 변경될 때만 재계산
  // ▲▲▲ [수정 완료] ▲▲▲

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
      <ChartLegend legendData={legendData} />

      {(isLoadingIndicators || isLoadingSignals) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
          <Spinner size="lg" />
        </div>
      )}

      <div
        ref={mainChartContainerRef}
        className="w-full h-[400px] rounded-t-lg border-x border-t border-border"
      />

      {paneIndicators.map((paneKey) => (
        <div
          key={paneKey}
          className="w-full h-[150px] border-x border-b border-t border-border"
          ref={(el) => {
            if (el) paneContainersRef.current.set(paneKey, el);
            else paneContainersRef.current.delete(paneKey);
          }}
        />
      ))}
    </div>
  );
}
