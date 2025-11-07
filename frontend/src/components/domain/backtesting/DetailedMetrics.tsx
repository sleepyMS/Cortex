// file: frontend/src/components/domain/backtesting/DetailedMetrics.tsx

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { BacktestResultSummary } from "@/types/backtest";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { HelpCircle } from "lucide-react";

interface DetailedMetricsProps {
  result: BacktestResultSummary;
}

const getScoreColor = (score?: number) => {
  if (score === undefined || score === null) return "text-muted-foreground";
  if (score >= 100) return "text-emerald-500";
  if (score >= 80) return "text-sky-500";
  if (score >= 60) return "text-amber-500";
  return "text-rose-500";
};

export const DetailedMetrics = ({ result }: DetailedMetricsProps) => {
  const t = useTranslations("BacktestDetailPage.DetailedMetrics");

  const metricCategories = [
    {
      category: t("categoryProfit"),
      tooltipKey: "tooltips.categoryProfit",
      metrics: [
        {
          key: "cagr",
          value: result.cagrPct?.toFixed(2),
          unit: "%",
          tooltipKey: "tooltips.cagr",
        },
        {
          key: "avgProfitLossRatio",
          value: result.avgProfitLossRatio?.toFixed(2),
          tooltipKey: "tooltips.avgProfitLossRatio",
        },
        {
          key: "kRatio",
          value: result.kRatio?.toFixed(2),
          tooltipKey: "tooltips.kRatio",
        },
      ],
    },
    {
      category: t("categoryRiskAdjusted"),
      tooltipKey: "tooltips.categoryRiskAdjusted",
      metrics: [
        {
          key: "sharpeRatio",
          value: result.sharpeRatio?.toFixed(2),
          tooltipKey: "tooltips.sharpeRatio",
        },
        {
          key: "sortinoRatio",
          value: result.sortinoRatio?.toFixed(2),
          tooltipKey: "tooltips.sortinoRatio",
        },
        {
          key: "calmarRatio",
          value: result.calmarRatio?.toFixed(2),
          tooltipKey: "tooltips.calmarRatio",
        },
      ],
    },
    {
      category: t("categoryRiskAndPain"),
      tooltipKey: "tooltips.categoryRiskAndPain",
      metrics: [
        {
          key: "ulcerIndex",
          value: result.ulcerIndex?.toFixed(2),
          tooltipKey: "tooltips.ulcerIndex",
        },
        {
          key: "longestFlatDays",
          value: result.longestFlatDays,
          unit: t("daysUnit"),
          tooltipKey: "tooltips.longestFlatDays",
        },
      ],
    },
    {
      category: t("categoryTradeChars"),
      tooltipKey: "tooltips.categoryTradeChars",
      metrics: [
        {
          key: "avgHoldingPeriodDays",
          value: result.avgHoldingPeriodDays?.toFixed(1),
          unit: t("daysUnit"),
          tooltipKey: "tooltips.avgHoldingPeriodDays",
        },
      ],
    },
  ];

  return (
    <TooltipProvider delayDuration={100}>
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-8 gap-y-6">
            <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 bg-muted rounded-lg text-center h-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="flex items-center justify-center gap-1 text-base font-semibold text-muted-foreground cursor-help">
                    {t("overallScore")}
                    <HelpCircle className="h-4 w-4" />
                  </h3>
                </TooltipTrigger>
                <TooltipContent sideOffset={4}>
                  <p className="max-w-xs whitespace-pre-wrap break-words">
                    {t("tooltips.overallScore")}
                  </p>
                </TooltipContent>
              </Tooltip>
              <p
                className={`text-6xl font-bold mt-2 ${getScoreColor(
                  result.backtestScore
                )}`}
              >
                {result.backtestScore?.toFixed(1) ?? "N/A"}
              </p>
              <p className="text-lg text-muted-foreground">/ 100</p>
            </div>
            <div className="lg:col-span-3">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">
                      {t("categoryHeader")}
                    </TableHead>
                    <TableHead>{t("metricHeader")}</TableHead>
                    <TableHead className="w-[25%] text-right">
                      {t("valueHeader")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metricCategories.map(({ category, tooltipKey, metrics }) =>
                    metrics.map((metric, metricIndex) => (
                      <TableRow key={metric.key}>
                        {metricIndex === 0 && (
                          <TableCell
                            rowSpan={metrics.length}
                            className="font-semibold align-middle border-r"
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="w-full h-full cursor-help">
                                  {category}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent sideOffset={4}>
                                <p className="max-w-xs whitespace-pre-wrap break-words">
                                  {t(tooltipKey)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        )}
                        <TableCell className="text-muted-foreground truncate">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full h-full cursor-help">
                                {t(metric.key)}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent sideOffset={4}>
                              <p className="max-w-xs whitespace-pre-wrap break-words">
                                {t(metric.tooltipKey)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="font-mono text-right">
                          {metric.value ?? "N/A"} {metric.unit}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
