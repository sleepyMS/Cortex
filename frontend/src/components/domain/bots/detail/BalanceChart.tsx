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

  // Append current balance as the latest point if:
  // 1. We have current balance data
  // 2. Either no snapshots exist OR last snapshot is older than 1 hour
  if (currentBalance != null && initialCapital != null) {
    const now = new Date();
    const lastSnapshot = chartData[chartData.length - 1];

    if (!lastSnapshot) {
      // No snapshots at all - show current state
      chartData = [
        {
          date: now.toLocaleDateString(),
          balance: currentBalance,
          pnl: currentBalance - initialCapital,
        },
      ];
    } else {
      // Check if last snapshot is older than 1 hour
      const lastSnapshotDate = new Date(
        performance[performance.length - 1].snapshotDate
      );
      const hoursSinceLastSnapshot =
        (now.getTime() - lastSnapshotDate.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSnapshot >= 0.5) {
        // Add current balance as the latest point
        chartData.push({
          date: now.toLocaleDateString() + " (Now)",
          balance: currentBalance,
          pnl: currentBalance - initialCapital,
        });
      }
    }
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
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md text-sm max-w-[280px]">
                        <p className="font-semibold mb-2 text-foreground">
                          {data.date}
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              Balance:
                            </span>
                            <span className="font-mono font-bold text-primary">
                              ${data.balance.toLocaleString()}
                            </span>
                          </div>
                          {data.pnl != null && (
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">
                                PnL:
                              </span>
                              <span
                                className={`font-mono font-semibold ${
                                  data.pnl >= 0
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                              >
                                {data.pnl >= 0 ? "+" : ""}$
                                {data.pnl.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
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
