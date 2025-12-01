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

interface BotChartProps {
  performance: BotPerformanceSnapshot[];
  entryPrice?: number | null;
}

export function BotChart({ performance, entryPrice }: BotChartProps) {
  const t = useTranslations("LiveTrading.Detail");

  const chartData = performance.map((snapshot) => ({
    date: new Date(snapshot.snapshotDate).toLocaleDateString(),
    balance: snapshot.balance,
    pnl: snapshot.realizedPnl,
  }));

  return (
    <Card className="h-full border-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{t("chartTitle")}</CardTitle>
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
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
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
            <p className="text-lg font-medium">{t("noPerformanceData")}</p>
            <p className="text-sm mt-2">
              Performance data will appear once the bot starts trading
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
