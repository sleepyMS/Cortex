"use client";

import React, { useMemo, useState } from "react";
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
import { Info } from "lucide-react";

import { TrialData } from "@/types/optimization";
import { Strategy } from "@/types/strategy";
import { getReadableParamLabel } from "@/lib/strategy-utils";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

interface ParameterDistributionChartProps {
  trials?: TrialData[];
  strategy?: Strategy;
}

interface HistogramBin {
  rangeStart: number;
  rangeEnd: number;
  label: string;
  count: number;
  totalScore: number;
  avgScore: number;
}

export const ParameterDistributionChart = ({
  trials,
  strategy,
}: ParameterDistributionChartProps) => {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("OptimizationDetailPage.DetailedAnalysis");
  const isDark = resolvedTheme === "dark";

  // 1. 사용 가능한 파라미터 목록 추출 (숫자형만)
  const paramKeys = useMemo(() => {
    if (!trials || trials.length === 0) return [];
    const firstParams = trials[0].params;
    return Object.keys(firstParams)
      .filter((key) => typeof firstParams[key] === "number")
      .sort();
  }, [trials]);

  // 2. 선택된 파라미터 상태
  const [selectedParam, setSelectedParam] = useState<string>(
    paramKeys.length > 0 ? paramKeys[0] : ""
  );

  // 파라미터 목록이 변경되면 선택된 파라미터도 업데이트
  React.useEffect(() => {
    if (paramKeys.length > 0 && !paramKeys.includes(selectedParam)) {
      setSelectedParam(paramKeys[0]);
    }
  }, [paramKeys, selectedParam]);

  // 3. 히스토그램 데이터 계산
  const histogramData = useMemo(() => {
    if (!trials || trials.length === 0 || !selectedParam) return [];

    // 해당 파라미터의 값들만 추출
    const values = trials.map((t) => ({
      val: Number(t.params[selectedParam]),
      score: t.metrics?.backtestScore ?? 0,
    }));

    if (values.length === 0) return [];

    const minVal = Math.min(...values.map((v) => v.val));
    const maxVal = Math.max(...values.map((v) => v.val));

    // 값이 모두 같으면 단일 빈 처리
    if (minVal === maxVal) {
      return [
        {
          rangeStart: minVal,
          rangeEnd: maxVal,
          label: String(minVal),
          count: values.length,
          totalScore: values.reduce((sum, v) => sum + v.score, 0),
          avgScore: values.reduce((sum, v) => sum + v.score, 0) / values.length,
        },
      ];
    }

    const binCount = 20; // 구간 개수
    const step = (maxVal - minVal) / binCount;

    // 빈 초기화
    const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
      const start = minVal + i * step;
      const end = minVal + (i + 1) * step;
      return {
        rangeStart: start,
        rangeEnd: end,
        label: `${start.toFixed(2)} - ${end.toFixed(2)}`,
        count: 0,
        totalScore: 0,
        avgScore: 0,
      };
    });

    // 값들을 빈에 할당
    values.forEach((v) => {
      // 마지막 값(maxVal)은 마지막 빈에 포함
      let binIndex = Math.floor((v.val - minVal) / step);
      if (binIndex >= binCount) binIndex = binCount - 1;

      bins[binIndex].count += 1;
      bins[binIndex].totalScore += v.score;
    });

    // 평균 점수 계산
    bins.forEach((bin) => {
      if (bin.count > 0) {
        bin.avgScore = bin.totalScore / bin.count;
      }
    });

    return bins;
  }, [trials, selectedParam]);

  // 점수에 따른 색상 계산 (초록색 계열)
  const getBarColor = (avgScore: number) => {
    // 점수 범위가 0~100이라고 가정 (필요시 정규화 로직 추가)
    // 여기서는 간단하게 점수가 높을수록 진한 초록색
    if (avgScore >= 80) return "#10b981"; // Emerald 500
    if (avgScore >= 60) return "#34d399"; // Emerald 400
    if (avgScore >= 40) return "#6ee7b7"; // Emerald 300
    if (avgScore >= 20) return "#a7f3d0"; // Emerald 200
    return "#d1fae5"; // Emerald 100
  };

  if (!trials || trials.length === 0) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">
            {t("distributionTitle")}
          </CardTitle>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground opacity-70" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>{t("distributionTooltip")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
        <div className="w-[200px]">
          <Select value={selectedParam} onValueChange={setSelectedParam}>
            <SelectTrigger>
              <SelectValue placeholder="Select parameter" />
            </SelectTrigger>
            <SelectContent>
              {paramKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {getReadableParamLabel(key, strategy)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-grow min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={histogramData}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={isDark ? "#374151" : "#e5e7eb"}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: isDark ? "#9ca3af" : "#6b7280" }}
              interval={Math.floor(histogramData.length / 5)} // 레이블이 겹치지 않게 간격 조절
            />
            <YAxis
              tick={{ fontSize: 12, fill: isDark ? "#9ca3af" : "#6b7280" }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as HistogramBin;
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
                      <p className="font-semibold mb-1">
                        {t("range")}: {data.label}
                      </p>
                      <p>
                        {t("count")}: {data.count}
                      </p>
                      <p>
                        {t("avgScore")}: {data.avgScore.toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {histogramData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.avgScore)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
