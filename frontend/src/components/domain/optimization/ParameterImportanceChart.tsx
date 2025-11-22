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
import { Strategy } from "@/types/strategy";
import { getReadableParamLabel } from "@/lib/strategy-utils";

interface ParameterImportanceChartProps {
  data?: Array<{ param: string; importance: number }>;
  strategy?: Strategy;
}

export const ParameterImportanceChart = ({
  data,
  strategy,
}: ParameterImportanceChartProps) => {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("OptimizationDetailPage.DetailedAnalysis");

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return [...data]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 15)
      .map((item) => ({
        ...item,
        readableName: getReadableParamLabel(item.param, strategy),
        importancePct: (item.importance * 100).toFixed(1),
      }));
  }, [data, strategy]);

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
            <BarChart
              data={processedData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke={resolvedTheme === "dark" ? "#374151" : "#e5e7eb"}
              />
              <XAxis
                type="number"
                domain={[0, 1]}
                tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                stroke={resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="readableName"
                width={180}
                stroke={resolvedTheme === "dark" ? "#9ca3af" : "#6b7280"}
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md text-sm max-w-[300px]">
                        <p className="font-semibold mb-2 break-words">
                          {data.readableName}
                        </p>
                        {/* [수정] 원본 경로(data.param) 표시 부분 삭제됨 */}
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
              <Bar dataKey="importance" radius={[0, 4, 4, 0]} maxBarSize={40}>
                {processedData.map((entry, index) => (
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
