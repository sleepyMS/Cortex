// file: frontend/src/components/domain/optimization/ParameterStabilityChart.tsx

"use client";

import React, { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Info, Percent, Hash } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import { Badge } from "@/components/ui/Badge";
import { WFOFoldResult } from "@/types/optimization";

interface ParameterStabilityChartProps {
  folds: WFOFoldResult[];
}

// 색상 팔레트 (파라미터 구분을 위해)
const COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

export const ParameterStabilityChart = ({
  folds,
}: ParameterStabilityChartProps) => {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("OptimizationDetailPage.WfoAnalysis");
  const [mode, setMode] = useState<"raw" | "normalized">("normalized"); // 기본값: 정규화 모드

  // 1. 데이터 전처리: folds 데이터를 차트용 데이터로 변환
  const chartData = useMemo(() => {
    if (!folds || folds.length === 0) return [];

    // 모든 파라미터 키 추출
    const paramKeys = Object.keys(folds[0].bestParams);

    // 각 파라미터별 최소/최대값 계산 (정규화를 위해)
    const minMax: Record<string, { min: number; max: number }> = {};
    paramKeys.forEach((key) => {
      const values = folds.map((f) => Number(f.bestParams[key]));
      minMax[key] = {
        min: Math.min(...values),
        max: Math.max(...values),
      };
    });

    return folds.map((fold) => {
      const dataPoint: any = {
        foldIndex: `Fold ${fold.foldIndex + 1}`, // X축 레이블
      };

      paramKeys.forEach((key) => {
        const rawValue = Number(fold.bestParams[key]);
        if (mode === "raw") {
          dataPoint[key] = rawValue;
        } else {
          // 정규화: (값 - 최소) / (최대 - 최소) * 100
          const { min, max } = minMax[key];
          const range = max - min;
          dataPoint[key] = range === 0 ? 50 : ((rawValue - min) / range) * 100; // 범위가 0이면 중간값(50)으로 표시
        }
      });

      return dataPoint;
    });
  }, [folds, mode]);

  // 파라미터 키 목록 (차트 라인 생성용)
  const paramKeys = useMemo(() => {
    return folds && folds.length > 0 ? Object.keys(folds[0].bestParams) : [];
  }, [folds]);

  if (!folds || folds.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center bg-muted/20 border-dashed">
        <p className="text-sm text-muted-foreground">{t("noChartData")}</p>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">
            {t("parameterStabilityTitle")}
          </CardTitle>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground opacity-70" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{t("parameterStabilityTooltip")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>

        {/* 보기 모드 토글 (Raw vs Normalized) */}
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(val) => val && setMode(val as "raw" | "normalized")}
          size="sm"
        >
          <ToggleGroupItem value="raw" aria-label="Raw Values">
            <Hash className="h-4 w-4 mr-1" />
            Raw
          </ToggleGroupItem>
          <ToggleGroupItem value="normalized" aria-label="Normalized Values">
            <Percent className="h-4 w-4 mr-1" />
            Normalized
          </ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>

      <CardContent className="flex-grow pt-4 min-h-0">
        <div className="h-full w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={resolvedTheme === "dark" ? "#374151" : "#e5e7eb"}
              />
              <XAxis
                dataKey="foldIndex"
                stroke={resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke={resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"}
                tick={{ fontSize: 12 }}
                domain={mode === "normalized" ? [0, 100] : ["auto", "auto"]}
                tickFormatter={(val) =>
                  mode === "normalized" ? `${val}%` : val
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor:
                    resolvedTheme === "dark" ? "hsl(var(--card))" : "#fff",
                  borderColor:
                    resolvedTheme === "dark" ? "hsl(var(--border))" : "#e5e7eb",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  mode === "normalized"
                    ? `${value.toFixed(1)}% (Normalized)`
                    : value,
                  name.split(".").pop(), // 긴 경로 대신 마지막 키만 표시
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                formatter={(value) => value.split(".").pop()} // 범례도 짧게 표시
              />

              {paramKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
