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
import { getYear, getMonth, fromUnixTime } from "date-fns";
import { cn } from "@/lib/utils";

interface MonthlyPerformanceProps {
  pnlData: ChartDataPoint[];
}

// 월별 수익률 계산 로직
const calculateMonthlyReturns = (pnlData: ChartDataPoint[]) => {
  if (!pnlData || pnlData.length < 2) return {};

  const monthlyValues: {
    [key: string]: { start: number; end: number; firstTime: number };
  } = {};

  pnlData.forEach((d) => {
    // UNIX 타임스탬프(초 단위)를 Date 객체로 올바르게 변환합니다.
    const date = fromUnixTime(d.time);
    // ▲▲▲ [수정 완료] ▲▲▲
    const year = getYear(date);
    const month = getMonth(date);
    const key = `${year}-${month}`;

    if (!monthlyValues[key]) {
      // 월의 첫 번째 데이터 포인트를 시작 값으로 기록
      monthlyValues[key] = { start: d.value, end: d.value, firstTime: d.time };
    } else {
      // 월의 마지막 데이터 포인트를 종료 값으로 기록 (시간순으로 정렬되어 있다고 가정)
      monthlyValues[key].end = d.value;
    }
  });

  // 월별 수익률 계산 시, 이전 달의 종가를 사용하여 더 정확하게 계산
  const sortedMonths = Object.keys(monthlyValues).sort(
    (a, b) => monthlyValues[a].firstTime - monthlyValues[b].firstTime
  );
  let lastMonthEndValue: number | null = null;

  const returns: { [year: number]: (number | null)[] } = {};
  sortedMonths.forEach((key, index) => {
    const [year, month] = key.split("-").map(Number);
    const { start, end } = monthlyValues[key];

    // 첫 달은 (월말 값 / 월초 값) - 1 로 계산
    const startValue =
      index === 0 || lastMonthEndValue === null ? start : lastMonthEndValue;

    if (startValue === 0) return; // 분모가 0이 되는 경우 방지

    const monthlyReturn = ((end - startValue) / startValue) * 100;

    if (!returns[year]) {
      returns[year] = Array(12).fill(null);
    }
    returns[year][month] = monthlyReturn;

    lastMonthEndValue = end;
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
