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
import { cn } from "@/lib/utils";

interface MonthlyPerformanceProps {
  monthlyReturns: { [year: number]: (number | null)[] };
}

// 수익률에 따라 색상 클래스를 반환하는 함수
const getCellColor = (value: number | null) => {
  if (value === null) return "bg-muted/30";
  if (value > 5) return "bg-emerald-700/80 text-white";
  if (value > 0) return "bg-emerald-500/80 text-white";
  if (value < -5) return "bg-rose-700/80 text-white";
  if (value < 0) return "bg-rose-500/80 text-white";
  return "bg-muted/50";
};

export const MonthlyPerformance = ({
  monthlyReturns,
}: MonthlyPerformanceProps) => {
  const t = useTranslations("BacktestDetailPage.MonthlyPerformance");

  // 데이터가 없거나 비어있는 경우 처리
  const years = monthlyReturns
    ? Object.keys(monthlyReturns)
        .map(Number)
        .sort((a, b) => b - a)
    : [];

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
