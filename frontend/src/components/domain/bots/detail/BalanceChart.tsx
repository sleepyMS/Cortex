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

  let chartData = performance.map((snapshot) => ({
    date: new Date(snapshot.snapshotDate).toLocaleString(undefined, {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    balance: snapshot.balance,
    pnl: snapshot.realizedPnl,
  }));

  if (currentBalance != null && initialCapital != null) {
    const now = new Date();
    const lastSnapshot = chartData[chartData.length - 1];

    if (!lastSnapshot) {
      chartData = [
        {
          date: now.toLocaleString(undefined, {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          balance: currentBalance,
          pnl: currentBalance - initialCapital,
        },
      ];
    } else {
      chartData.push({
        date: "Now",
        balance: currentBalance,
        pnl: currentBalance - initialCapital,
      });
    }
  }

  return (
    <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 group">
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <CardHeader className="pb-4 relative">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t("totalAssetChart")}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={330}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
                opacity={0.5}
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
                domain={["auto", "auto"]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border bg-background/95 backdrop-blur-sm p-4 shadow-lg text-sm">
                        <p className="font-semibold mb-2 text-foreground">
                          {data.date}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-muted-foreground">
                              Balance:
                            </span>
                            <span className="font-mono font-bold text-primary">
                              ${data.balance.toLocaleString()}
                            </span>
                          </div>
                          {data.pnl != null && (
                            <div className="flex items-center justify-between gap-6">
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
                name={t("totalEquity")}
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
          <div className="relative h-[350px] flex flex-col items-center justify-center text-muted-foreground rounded-xl border-2 border-dashed overflow-hidden">
            {/* Empty state gradient */}
            <div className="absolute inset-0 gradient-mesh opacity-20" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium">{t("noPerformanceData")}</p>
              <p className="text-sm mt-2 text-center max-w-sm">
                Chart will display once the bot starts running and balance data
                is collected
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
