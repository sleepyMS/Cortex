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
import { Strategy } from "@/types/strategy";
import { getReadableParamLabel } from "@/lib/strategy-utils"; // 공통 유틸리티 임포트

interface ParameterStabilityChartProps {
  folds: WFOFoldResult[];
  strategy?: Strategy; // [추가] 전략 정보 prop
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
  strategy, // [추가]
}: ParameterStabilityChartProps) => {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("OptimizationDetailPage.WfoAnalysis");
  const [mode, setMode] = useState<"raw" | "normalized">("normalized");

  // 1. 데이터 전처리: folds 데이터를 차트용 데이터로 변환
  const chartData = useMemo(() => {
    if (!folds || folds.length === 0 || !folds[0]?.bestParams) return [];

    const paramKeys = Object.keys(folds[0].bestParams);

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
        foldIndex: `Fold ${fold.foldIndex + 1}`,
      };

      paramKeys.forEach((key) => {
        const rawValue = Number(fold.bestParams[key]);
        if (mode === "raw") {
          dataPoint[key] = rawValue;
        } else {
          const { min, max } = minMax[key];
          const range = max - min;
          dataPoint[key] = range === 0 ? 50 : ((rawValue - min) / range) * 100;
        }
      });

      return dataPoint;
    });
  }, [folds, mode]);

  // 파라미터 키 목록 (차트 라인 생성용)
  const paramKeys = useMemo(() => {
    return folds && folds.length > 0 && folds[0]?.bestParams
      ? Object.keys(folds[0].bestParams)
      : [];
  }, [folds]);

  if (!folds || folds.length === 0 || !folds[0]?.bestParams) {
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
              <TooltipContent className="max-w-sm whitespace-pre-wrap">
                {t("parameterStabilityTooltip")}
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>

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
              margin={{ top: 5, right: 30, left: 20, bottom: 20 }} // bottom 여백 추가
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
              {/* [핵심 수정] 툴팁 포매터 변경 */}
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
                  // 값 포맷팅 (Raw/Normalized)
                  mode === "normalized" ? `${value.toFixed(1)}%` : value,
                  // [수정] 라벨을 공통 유틸리티로 생성
                  getReadableParamLabel(name, strategy),
                ]}
              />
              {/* [핵심 수정] 범례 포매터 변경 */}
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "25px" }} // 상단 여백 추가
                formatter={(value) => getReadableParamLabel(value, strategy)} // [수정]
              />

              {paramKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key} // key는 고유한 전체 경로
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
