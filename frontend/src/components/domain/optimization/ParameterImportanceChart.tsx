// file: frontend/src/components/domain/optimization/ParameterImportanceChart.tsx

"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Info, BarChartHorizontalBig } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

interface ParameterImportanceChartProps {
  /**
   * 파라미터 중요도 데이터 배열
   * 예: [{ param: "longEntry.rsi.period", importance: 0.45 }, ...]
   */
  data?: Array<{ param: string; importance: number }>;
}

export const ParameterImportanceChart = ({
  data,
}: ParameterImportanceChartProps) => {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("OptimizationDetailPage.DetailedAnalysis");

  // 데이터 전처리: 중요도 내림차순 정렬 및 상위 15개 추출
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return [...data]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 15) // 상위 15개만 표시 (너무 많으면 보기 힘듦)
      .map((item) => ({
        ...item,
        // 긴 파라미터 경로를 단축 (예: longEntryRules.0.rsi.period -> ...rsi.period)
        shortName:
          item.param.split(".").length > 2
            ? `...${item.param.split(".").slice(-2).join(".")}`
            : item.param,
        // 퍼센트 값 미리 계산
        importancePct: (item.importance * 100).toFixed(1),
      }));
  }, [data]);

  if (!processedData || processedData.length === 0) {
    return (
      <Card className="h-full flex flex-col items-center justify-center bg-muted/20 border-dashed p-6">
        <BarChartHorizontalBig className="h-10 w-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">{t("noChartData")}</p>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">
            {t("importanceTitle")}
          </CardTitle>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground opacity-70" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{t("importanceTooltip")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex-grow pt-4 min-h-0">
        <div className="h-full w-full min-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            {/* layout="vertical"로 설정하여 가로 막대 차트로 변경 */}
            <BarChart
              data={processedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }} // Y축 라벨 공간(left) 확보
            >
              <CartesianGrid
                horizontal={false} // 가로선 숨김
                strokeDasharray="3 3"
                stroke={resolvedTheme === "dark" ? "#374151" : "#e5e7eb"}
              />
              <XAxis
                type="number"
                domain={[0, 1]} // 중요도는 0~1 사이 값
                tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                stroke={resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="shortName"
                width={120} // Y축 라벨 너비 제한
                stroke={resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"}
                tick={{ fontSize: 11 }}
                interval={0} // 모든 라벨 표시
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md text-sm">
                        <p className="font-semibold mb-1">{data.param}</p>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {t("importanceLabel")}:
                          </span>
                          <span className="font-mono font-bold text-primary">
                            {data.importancePct}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="importance"
                radius={[0, 4, 4, 0]} // 오른쪽 끝만 둥글게
                maxBarSize={40} // 막대 최대 두께 제한
              >
                {processedData.map((entry, index) => (
                  // 상위 3개 항목은 강조 색상 사용, 나머지는 기본 색상
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      index < 3
                        ? "hsl(var(--primary))"
                        : "hsl(var(--primary) / 0.5)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
