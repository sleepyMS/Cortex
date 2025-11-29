// file: frontend/src/components/domain/optimization/ParallelCoordinatesChart.tsx

"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { GitCommit, Info } from "lucide-react";

import { TrialData } from "@/types/optimization";
import { Strategy } from "@/types/strategy";
import { cn } from "@/lib/utils";
import { getReadableParamLabel } from "@/lib/strategy-utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator"; // 툴팁용 Separator 임포트

// --- Props ---
interface ParallelCoordinatesChartProps {
  trials?: TrialData[];
  colorMetric?: keyof TrialData["metrics"];
  hoveredTrialId?: number | null;
  onHoverTrial?: (id: number | null) => void;
  onTrialClick?: (id: number) => void;
  strategy?: Strategy;
}

// --- 툴팁 데이터/위치 타입 ---
interface TooltipState {
  data: TrialData;
  position: { x: number; y: number };
}

// --- 내부 상수 및 헬퍼 ---
const MARGIN = { top: 70, right: 50, bottom: 50, left: 50 };
const MAX_DISPLAY_TRIALS = 300;

// 값 정규화 함수 (0~1 범위로 변환)
const normalize = (val: number, min: number, max: number) => {
  if (max === min) return 0.5;
  return (val - min) / (max - min);
};

// 점수에 따른 선 색상 반환
const getLineColor = (score: number, maxScore: number, isDark: boolean) => {
  const normalizedScore = score / Math.max(maxScore, 1);
  if (normalizedScore >= 0.8) return isDark ? "#10b981" : "#059669";
  if (normalizedScore >= 0.5) return isDark ? "#3b82f6" : "#2563eb";
  if (normalizedScore >= 0.3) return isDark ? "#f59e0b" : "#d97706";
  return isDark ? "#ef4444" : "#dc2626";
};

// 점수에 따른 투명도 반환
const getLineOpacity = (score: number, maxScore: number) => {
  const normalizedScore = score / Math.max(maxScore, 1);
  return 0.1 + normalizedScore * 0.7;
};

// --- 커스텀 툴팁 컴포넌트 ---
const ParallelChartTooltip = ({
  state,
  strategy,
}: {
  state: TooltipState | null;
  strategy?: Strategy;
}) => {
  const t = useTranslations("OptimizationDetailPage.TrialsTable.headers");

  if (!state) return null;

  const { data, position } = state;
  const score = data.metrics?.backtestScore;

  return (
    <div
      className="rounded-lg border bg-background p-3 shadow-md text-sm max-w-xs
                 fixed pointer-events-none z-50 transition-opacity"
      style={{
        top: position.y + 10,
        left: position.x + 10,
      }}
    >
      <div className="flex justify-between items-center mb-1">
        <p className="font-bold text-primary">Trial #{data.trialId}</p>
        <Badge variant={data.state === "PRUNED" ? "outline" : "secondary"}>
          {data.state}
        </Badge>
      </div>
      <p className="font-semibold mb-2">
        {t("score")}:{" "}
        <span className="font-mono">{score?.toFixed(1) ?? "N/A"}</span>
      </p>
      <Separator className="my-2" />
      <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
        {Object.entries(data.params).map(([key, value]) => (
          <div key={key} className="flex justify-between text-xs gap-2">
            <span
              className="text-muted-foreground truncate"
              title={getReadableParamLabel(key, strategy)}
            >
              {getReadableParamLabel(key, strategy)}
            </span>
            <span className="font-mono font-medium">{String(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 메인 컴포넌트 ---
export const ParallelCoordinatesChart = ({
  trials,
  colorMetric = "backtestScore",
  hoveredTrialId,
  onHoverTrial,
  onTrialClick,
  strategy,
}: ParallelCoordinatesChartProps) => {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("OptimizationDetailPage.DetailedAnalysis");
  const isDark = resolvedTheme === "dark";

  // [추가] 커스텀 툴팁을 위한 상태
  const [tooltipState, setTooltipState] = useState<TooltipState | null>(null);

  // 1. 데이터 전처리 (메모이제이션)
  const { processedTrials, dimensions, maxScore } = useMemo(() => {
    if (!trials || trials.length === 0) {
      return { processedTrials: [], dimensions: [], maxScore: 0 };
    }

    const sortedTrials = [...trials].sort(
      (a, b) =>
        (b.metrics?.[colorMetric] ?? 0) - (a.metrics?.[colorMetric] ?? 0)
    );
    const sampledTrials = sortedTrials.slice(0, MAX_DISPLAY_TRIALS);

    const firstParams = trials[0].params;
    const paramKeys = Object.keys(firstParams).filter(
      (key) => typeof firstParams[key] === "number"
    );
    paramKeys.sort();
    const displayKeys = paramKeys.slice(0, 8);

    const dims = displayKeys.map((key) => {
      const values = trials.map((t) => Number(t.params[key]));
      return {
        key,
        min: Math.min(...values),
        max: Math.max(...values),
        readableLabel: getReadableParamLabel(key, strategy),
      };
    });

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

  // --- [추가] 이벤트 핸들러 ---
  const handleMouseEnter = useCallback(
    (event: React.MouseEvent, trial: TrialData) => {
      onHoverTrial?.(trial.trialId);
      setTooltipState({
        data: trial,
        position: { x: event.clientX, y: event.clientY },
      });
    },
    [onHoverTrial]
  );

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltipState((prev) =>
      prev
        ? { ...prev, position: { x: event.clientX, y: event.clientY } }
        : null
    );
  }, []);

  const handleMouseLeave = useCallback(() => {
    onHoverTrial?.(null);
    setTooltipState(null);
  }, [onHoverTrial]);

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
    <>
      <Card className="h-full flex flex-col overflow-hidden">
        <CardHeader className="pb-2 bg-transparent">
          <div className="flex flex-row items-center justify-between space-y-0">
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
              <Badge
                variant="outline"
                className="text-xs text-muted-foreground"
              >
                Top {MAX_DISPLAY_TRIALS} shown
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("parallelCoordinatesDescription")}
          </p>
        </CardHeader>

        <CardContent className="flex-grow min-h-0 p-0">
          <div className="w-full h-full min-h-[400px]">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full block"
              onMouseLeave={handleMouseLeave} // [수정] SVG 전체에 Leave 이벤트
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
                      // [수정] 이벤트 핸들러 변경
                      onMouseEnter={(e) => handleMouseEnter(e, trial)}
                      onMouseMove={handleMouseMove}
                      onClick={() => onTrialClick?.(trial.trialId)}
                    >
                      {/* [삭제] 기본 <title> 태그 삭제 */}
                    </path>
                  );
                })}
              </g>

              {/* --- 2. 축(Axis) 렌더링 (SVG 폰트 속성 적용) --- */}
              <g className="axes pointer-events-none">
                {dimensions.map((dim, i) => {
                  const x = getX(i);
                  return (
                    <g key={dim.key} transform={`translate(${x},0)`}>
                      <line
                        x1="0"
                        y1={MARGIN.top}
                        x2="0"
                        y2={HEIGHT - MARGIN.bottom}
                        stroke={isDark ? "#4b5563" : "#d1d5db"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <text
                        x="0"
                        y={MARGIN.top - 25}
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="600"
                        fill={isDark ? "#9ca3af" : "#374151"}
                      >
                        {dim.readableLabel.length > 20
                          ? dim.readableLabel.substring(0, 18) + "..."
                          : dim.readableLabel}
                      </text>
                      <title>{dim.readableLabel}</title>
                      <text
                        x="0"
                        y={MARGIN.top - 8}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="500"
                        fill={isDark ? "#9ca3af" : "#4b5563"}
                        opacity="0.8"
                      >
                        {dim.max.toFixed(dim.max > 100 ? 0 : 2)}
                      </text>
                      <text
                        x="0"
                        y={HEIGHT - MARGIN.bottom + 15}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="500"
                        fill={isDark ? "#9ca3af" : "#4b5563"}
                        opacity="0.8"
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

      {/* [추가] 커스텀 툴팁 렌더링 */}
      <ParallelChartTooltip state={tooltipState} strategy={strategy} />
    </>
  );
};
