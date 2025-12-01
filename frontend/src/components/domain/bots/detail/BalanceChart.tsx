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
  ReferenceLine,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface BotChartProps {
  performance: BotPerformanceSnapshot[];
  entryPrice?: number | null;
  currentBalance?: number | null;
  initialCapital?: number | null;
}

export function BalanceChart({
  performance,
  entryPrice,
  currentBalance,
  initialCapital,
}: BotChartProps) {
  const t = useTranslations("LiveTrading.Detail");

  // If no performance data but we have current balance, create a single data point
  let chartData = performance.map((snapshot) => ({
    date: new Date(snapshot.snapshotDate).toLocaleDateString(),
    balance: snapshot.balance,
    pnl: snapshot.realizedPnl,
  }));

  // Fallback: if no performance data but bot has started, show current state
  if (chartData.length === 0 && currentBalance != null) {
    chartData = [
      {
        date: new Date().toLocaleDateString(),
        balance: currentBalance,
        pnl: currentBalance - (initialCapital ?? currentBalance),
      },
    ];
  }

  return (
    <Card className="h-full border-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Balance Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
              />
              <XAxis
                dataKey="date"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Balance",
                ]}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#2563eb"
                strokeWidth={3}
                dot={
                  chartData.length === 1
                    ? { r: 8, strokeWidth: 0, fill: "#2563eb" }
                    : false
                }
                activeDot={{ r: 6, strokeWidth: 0 }}
                name="Balance"
              />
              {entryPrice && (
                <ReferenceLine
                  y={entryPrice}
                  label={{
                    value: "Entry",
                    position: "right",
                    fill: "#f59e0b",
                    fontSize: 12,
                  }}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
            <div className="rounded-full bg-muted p-4 mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">{t("noPerformanceData")}</p>
            <p className="text-sm mt-2 text-center max-w-sm">
              Chart will display once the bot starts running and balance data is
              collected
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
