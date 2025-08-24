"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { ChartDataPoint } from "./EquityChart";
import { getYear, getMonth, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface MonthlyPerformanceProps {
  pnlData: ChartDataPoint[];
}

// 월별 수익률 계산 로직
const calculateMonthlyReturns = (pnlData: ChartDataPoint[]) => {
  if (!pnlData || pnlData.length < 2) return {};

  const monthlyValues: { [key: string]: { start: number; end: number } } = {};

  pnlData.forEach((d) => {
    const date = parseISO(d.time);
    const year = getYear(date);
    const month = getMonth(date);
    const key = `${year}-${month}`;

    if (!monthlyValues[key]) {
      monthlyValues[key] = { start: d.value, end: d.value };
    } else {
      monthlyValues[key].end = d.value;
    }
  });

  const returns: { [year: number]: (number | null)[] } = {};
  Object.keys(monthlyValues).forEach((key) => {
    const [year, month] = key.split("-").map(Number);
    const { start, end } = monthlyValues[key];
    const monthlyReturn = ((end - start) / start) * 100;

    if (!returns[year]) {
      returns[year] = Array(12).fill(null);
    }
    returns[year][month] = monthlyReturn;
  });

  return returns;
};

// 수익률에 따라 색상 클래스를 반환하는 함수
const getCellColor = (value: number | null) => {
  if (value === null) return "bg-muted/30";
  if (value > 5) return "bg-emerald-700/80 text-white";
  if (value > 0) return "bg-emerald-500/80 text-white";
  if (value < -5) return "bg-rose-700/80 text-white";
  if (value < 0) return "bg-rose-500/80 text-white";
  return "bg-muted/50";
};

export const MonthlyPerformance = ({ pnlData }: MonthlyPerformanceProps) => {
  const t = useTranslations("BacktestDetailPage.MonthlyPerformance");
  const monthlyReturns = calculateMonthlyReturns(pnlData);
  const years = Object.keys(monthlyReturns)
    .map(Number)
    .sort((a, b) => b - a);
  const months = t.raw("months") as string[]; // ko.json: { "months": ["1월", "2월", ...] }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("year")}</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="text-center">
                  {month}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {years.map((year) => (
              <TableRow key={year}>
                <TableCell className="font-medium">{year}</TableCell>
                {monthlyReturns[year].map((ret, i) => (
                  <TableCell
                    key={i}
                    className={cn("text-center font-mono", getCellColor(ret))}
                  >
                    {ret !== null ? `${ret.toFixed(2)}%` : "-"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
