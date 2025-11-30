"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useTranslations } from "next-intl";
import { BotPerformanceSnapshot } from "@/lib/api/bots";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BotChartProps {
  performance: BotPerformanceSnapshot[];
}

export function BotChart({ performance }: BotChartProps) {
  const t = useTranslations("LiveTrading.Detail");

  // 차트 데이터 변환
  const chartData = performance.map((snapshot) => ({
    date: new Date(snapshot.snapshotDate).toLocaleDateString(),
    balance: snapshot.balance,
    pnl: snapshot.realizedPnl,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("chartTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#8884d8"
                strokeWidth={2}
                name="Balance"
              />
              <Line
                type="monotone"
                dataKey="pnl"
                stroke="#82ca9d"
                strokeWidth={2}
                name="PnL"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No performance data available yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
