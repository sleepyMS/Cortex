// file: frontend/src/components/domain/optimization/ParallelCoordinatesChart.tsx

"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { GitCommit, Info } from "lucide-react";

import { TrialData } from "@/types/optimization";
import { Strategy } from "@/types/strategy";
import { getReadableParamLabel } from "@/lib/strategy-utils";
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
  /**
   * 원본 전략 정보 (파라미터 경로 해석용)
   */
  strategy?: Strategy;
}

// --- 내부 상수 및 헬퍼 ---
// 레이블 공간 확보를 위해 top 여백을 증가시켰습니다.
const MARGIN = { top: 60, right: 40, bottom: 40, left: 40 };
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
  strategy,
}: ParallelCoordinatesChartProps) => {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("OptimizationDetailPage.DetailedAnalysis");

  const isDark = resolvedTheme === "dark";

  // 1. 데이터 전처리 (메모이제이션)
  const { processedTrials, dimensions, maxScore } = useMemo(() => {
    if (!trials || trials.length === 0) {
      return { processedTrials: [], dimensions: [], maxScore: 0 };
    }

    // 1.1. 렌더링할 데이터 샘플링
    const sortedTrials = [...trials].sort(
      (a, b) =>
        (b.metrics?.[colorMetric] ?? 0) - (a.metrics?.[colorMetric] ?? 0)
    );
    const sampledTrials = sortedTrials.slice(0, MAX_DISPLAY_TRIALS);

    // 1.2. 차원(파라미터 축) 추출 및 Min/Max 계산
    const firstParams = trials[0].params;
    const paramKeys = Object.keys(firstParams).filter(
      (key) => typeof firstParams[key] === "number"
    );

    paramKeys.sort();

    // 최대 8개 축만 표시
    const displayKeys = paramKeys.slice(0, 8);

    const dims = displayKeys.map((key) => {
      const values = trials.map((t) => Number(t.params[key]));
      return {
        key,
        min: Math.min(...values),
        max: Math.max(...values),
        // [핵심] 공통 유틸리티를 사용하여 읽기 쉬운 라벨 생성
        readableLabel: getReadableParamLabel(key, strategy),
      };
    });

    // 1.3. 최고 점수 계산
    const maxS = Math.max(
      ...trials.map((t) => t.metrics?.[colorMetric] ?? 0),
      1
    );

    return {
      processedTrials: sampledTrials,
      dimensions: dims,
      maxScore: maxS,
    };
  }, [trials, colorMetric, strategy]);

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
  const WIDTH = 1000;
  const HEIGHT = 500;
  const innerWidth = WIDTH - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  const getX = (dimIndex: number) => {
    return (dimIndex / (dimensions.length - 1)) * innerWidth + MARGIN.left;
  };

  const getY = (value: number, dimIndex: number) => {
    const dim = dimensions[dimIndex];
    const normalizedValue = normalize(value, dim.min, dim.max);
    return (1 - normalizedValue) * innerHeight + MARGIN.top;
  };

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
              {[...processedTrials].reverse().map((trial) => {
                const score = trial.metrics?.[colorMetric] ?? 0;
                const isHovered = hoveredTrialId === trial.trialId;
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
                      stroke={isDark ? "#374151" : "#e5e7eb"}
                      strokeWidth="2"
                    />
                    {/* 축 레이블 (위쪽) - 읽기 쉬운 라벨 적용 */}
                    <text
                      x="0"
                      y={MARGIN.top - 25}
                      textAnchor="middle"
                      className="text-[10px] font-medium fill-foreground"
                      style={{ whiteSpace: "pre" }}
                    >
                      {dim.readableLabel.length > 20
                        ? dim.readableLabel.substring(0, 18) + "..."
                        : dim.readableLabel}
                    </text>
                    {/* 마우스 오버 시 전체 이름 표시용 */}
                    <title>{dim.readableLabel}</title>

                    {/* 최대값 (위쪽) */}
                    <text
                      x="0"
                      y={MARGIN.top - 8}
                      textAnchor="middle"
                      className="text-[10px] fill-muted-foreground opacity-70"
                    >
                      {dim.max.toFixed(dim.max > 100 ? 0 : 2)}
                    </text>
                    {/* 최소값 (아래쪽) */}
                    <text
                      x="0"
                      y={HEIGHT - MARGIN.bottom + 15}
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
