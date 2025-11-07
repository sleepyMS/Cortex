// file: frontend/src/components/domain/optimization/ParallelCoordinatesChart.tsx

"use client";

import React, { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { MoreHorizontal, GitCommit, Info } from "lucide-react";

import { TrialData } from "@/types/optimization";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { Badge } from "@/components/ui/Badge";

interface ParallelCoordinatesChartProps {
  /**
   * 시각화할 시도(Trial) 데이터 배열
   */
  trials?: TrialData[];
  /**
   * 색상 기준이 될 메트릭 키 (기본값: backtestScore)
   */
  colorMetric?: keyof TrialData["metrics"];
  hoveredTrialId?: number | null;
  onHoverTrial?: (id: number | null) => void;
}

// --- 내부 상수 및 헬퍼 ---
const MARGIN = { top: 40, right: 40, bottom: 40, left: 40 };
const MAX_DISPLAY_TRIALS = 300; // 성능을 위해 렌더링할 최대 라인 수 (샘플링)

// 값 정규화 함수 (0~1 범위로 변환)
const normalize = (val: number, min: number, max: number) => {
  if (max === min) return 0.5;
  return (val - min) / (max - min);
};

// 점수에 따른 선 색상 반환
const getLineColor = (score: number, maxScore: number, isDark: boolean) => {
  const normalizedScore = score / Math.max(maxScore, 1); // 0 ~ 1

  if (normalizedScore >= 0.8) return isDark ? "#10b981" : "#059669"; // 상위 20%: Emerald
  if (normalizedScore >= 0.5) return isDark ? "#3b82f6" : "#2563eb"; // 중상위: Blue
  if (normalizedScore >= 0.3) return isDark ? "#f59e0b" : "#d97706"; // 중하위: Amber
  return isDark ? "#ef4444" : "#dc2626"; // 하위: Red
};

// 점수에 따른 투명도 반환 (좋은 결과일수록 진하게)
const getLineOpacity = (score: number, maxScore: number) => {
  const normalizedScore = score / Math.max(maxScore, 1);
  // 최소 0.1, 최대 0.8 투명도
  return 0.1 + normalizedScore * 0.7;
};

export const ParallelCoordinatesChart = ({
  trials,
  colorMetric = "backtestScore",
  hoveredTrialId,
  onHoverTrial,
}: ParallelCoordinatesChartProps) => {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("OptimizationDetailPage.DetailedAnalysis");

  const isDark = resolvedTheme === "dark";

  // 1. 데이터 전처리 (메모이제이션)
  const { processedTrials, dimensions, maxScore } = useMemo(() => {
    if (!trials || trials.length === 0) {
      return { processedTrials: [], dimensions: [], maxScore: 0 };
    }

    // 1.1. 렌더링할 데이터 샘플링 (너무 많으면 브라우저가 느려짐)
    // 상위 150개 + 하위 50개 + 랜덤 100개 등으로 구성하면 좋으나, 여기선 단순화하여 상위 N개만 사용
    const sortedTrials = [...trials].sort(
      (a, b) => (b.metrics[colorMetric] ?? 0) - (a.metrics[colorMetric] ?? 0)
    );
    const sampledTrials = sortedTrials.slice(0, MAX_DISPLAY_TRIALS);

    // 1.2. 차원(파라미터 축) 추출 및 Min/Max 계산
    const firstParams = trials[0].params;
    // 파라미터 키 중 숫자형인 것만 추출 (boolean 등은 제외하거나 별도 처리 필요)
    const paramKeys = Object.keys(firstParams).filter(
      (key) => typeof firstParams[key] === "number"
    );

    // 중요도가 높은 순서로 정렬하거나, 알파벳순 정렬 (여기선 단순 알파벳순)
    paramKeys.sort();

    // 최대 6~8개 축만 표시 (너무 많으면 가독성 저하)
    const displayKeys = paramKeys.slice(0, 8);

    const dims = displayKeys.map((key) => {
      const values = trials.map((t) => Number(t.params[key]));
      return {
        key,
        min: Math.min(...values),
        max: Math.max(...values),
        // 축 이름 단축 (e.g., longEntry.rsi.period -> ...rsi.period)
        shortLabel:
          key.split(".").length > 2
            ? `...${key.split(".").slice(-2).join(".")}`
            : key,
      };
    });

    // 1.3. 최고 점수 계산 (색상 정규화용)
    const maxS = Math.max(
      ...trials.map((t) => t.metrics[colorMetric] ?? 0),
      1 // 0으로 나누기 방지
    );

    return {
      processedTrials: sampledTrials,
      dimensions: dims,
      maxScore: maxS,
    };
  }, [trials, colorMetric]);

  // 데이터가 없거나 축이 없을 때 빈 상태 표시
  if (!trials || trials.length === 0 || dimensions.length === 0) {
    return (
      <Card className="h-full flex flex-col items-center justify-center bg-muted/20 border-dashed p-6">
        <GitCommit className="h-10 w-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">{t("noChartData")}</p>
      </Card>
    );
  }

  // --- SVG 렌더링 헬퍼 ---
  // 100% * 100% 반응형을 위해 viewBox 좌표계 사용 (가상 크기: 1000 x 500)
  const WIDTH = 1000;
  const HEIGHT = 500;
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  // X 좌표 계산 (축의 위치)
  const getX = (dimIndex: number) => {
    return (dimIndex / (dimensions.length - 1)) * innerWidth + MARGIN.left;
  };

  // Y 좌표 계산 (값의 위치)
  const getY = (value: number, dimIndex: number) => {
    const dim = dimensions[dimIndex];
    const normalizedValue = normalize(value, dim.min, dim.max);
    // SVG는 Y좌표가 아래로 갈수록 커지므로, (1 - normalized)를 사용해 뒤집음
    return (1 - normalizedValue) * innerHeight + MARGIN.top;
  };

  // 폴리라인(선) 경로 생성
  const getPathD = (trial: TrialData) => {
    return dimensions
      .map((dim, i) => {
        const x = getX(i);
        const y = getY(Number(trial.params[dim.key]), i);
        return `${i === 0 ? "M" : "L"} ${x},${y}`;
      })
      .join(" ");
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">
            {t("parallelCoordinatesTitle")}
          </CardTitle>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground opacity-70" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{t("parallelCoordinatesTooltip")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        {trials.length > MAX_DISPLAY_TRIALS && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Top {MAX_DISPLAY_TRIALS} shown
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex-grow min-h-0 p-0">
        <div className="w-full h-full min-h-[400px]">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="w-full h-full block"
          >
            {/* --- 1. 트라이얼 라인 렌더링 --- */}
            <g className="trials">
              {/* 성능을 위해 점수가 낮은 순서대로 먼저 그림 (높은 점수가 위에 오도록) */}
              {[...processedTrials].reverse().map((trial) => {
                const score = trial.metrics[colorMetric] ?? 0;
                const isHovered = hoveredTrialId === trial.trialId;
                // 호버 시 다른 라인은 흐리게 처리
                const opacity = hoveredTrialId
                  ? isHovered
                    ? 1
                    : 0.1
                  : getLineOpacity(score, maxScore);

                return (
                  <path
                    key={trial.trialId}
                    d={getPathD(trial)}
                    fill="none"
                    stroke={getLineColor(score, maxScore, isDark)}
                    strokeWidth={isHovered ? 3 : 1.5}
                    strokeOpacity={opacity}
                    className="transition-all duration-200 ease-in-out cursor-pointer"
                    onMouseEnter={() => onHoverTrial?.(trial.trialId)}
                    onMouseLeave={() => onHoverTrial?.(null)}
                  >
                    <title>
                      {`Trial #${trial.trialId}: Score ${score.toFixed(1)}`}
                    </title>
                  </path>
                );
              })}
            </g>

            {/* --- 2. 축(Axis) 렌더링 --- */}
            <g className="axes pointer-events-none">
              {dimensions.map((dim, i) => {
                const x = getX(i);
                return (
                  <g key={dim.key} transform={`translate(${x},0)`}>
                    {/* 수직 축 선 */}
                    <line
                      x1="0"
                      y1={MARGIN.top}
                      x2="0"
                      y2={HEIGHT - MARGIN.bottom}
                      stroke={isDark ? "#374151" : "#e5e7eb"} // gray-700 / gray-200
                      strokeWidth="2"
                    />
                    {/* 축 레이블 (위쪽) */}
                    <text
                      x="0"
                      y={MARGIN.top - 15}
                      textAnchor="middle"
                      className="text-[11px] font-medium fill-muted-foreground"
                    >
                      {dim.shortLabel}
                    </text>
                    {/* 최대값 (위쪽) */}
                    <text
                      x="0"
                      y={MARGIN.top - 4}
                      textAnchor="middle"
                      className="text-[10px] fill-muted-foreground opacity-70"
                    >
                      {dim.max.toFixed(dim.max > 100 ? 0 : 2)}
                    </text>
                    {/* 최소값 (아래쪽) */}
                    <text
                      x="0"
                      y={HEIGHT - MARGIN.bottom + 12}
                      textAnchor="middle"
                      className="text-[10px] fill-muted-foreground opacity-70"
                    >
                      {dim.min.toFixed(dim.min > 100 ? 0 : 2)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};
