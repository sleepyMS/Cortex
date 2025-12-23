"use client";

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
import { GlassPane } from "@/components/ui/GlassPane";
import { useTranslations } from "next-intl";

interface Props {
  featureImportance?: Record<string, number>;
}

export function AIModelFeatureImportance({ featureImportance }: Props) {
  const t = useTranslations("AILabPage");

  if (!featureImportance || Object.keys(featureImportance).length === 0) {
    return (
      <GlassPane className="p-6 h-full flex flex-col items-center justify-center text-center space-y-2 min-h-[300px]">
        <div className="p-3 rounded-full bg-muted">
          <svg
            className="w-6 h-6 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="font-semibold">
          {t("detail.featureImportance.emptyTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("detail.featureImportance.emptyDesc")}
        </p>
      </GlassPane>
    );
  }

  // Transform data for Recharts
  const data = Object.entries(featureImportance)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value) // 내림차순 정렬
    .slice(0, 20); // Top 20만 표시

  return (
    <GlassPane className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">
            {t("detail.featureImportance.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("detail.featureImportance.subtitle")}
          </p>
        </div>
      </div>

      <div className="h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={false}
              stroke="hsl(var(--muted-foreground) / 0.2)"
            />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              stroke="hsl(var(--foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                value.length > 18 ? `${value.slice(0, 18)}...` : value
              }
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              labelStyle={{
                color: "hsl(var(--foreground))",
                fontWeight: "bold",
                marginBottom: "0.25rem",
              }}
              itemStyle={{ color: "hsl(var(--primary))" }}
              formatter={(value: any) => [
                value.toFixed(4),
                t("detail.featureImportance.importance"),
              ]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    index < 3
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground))"
                  }
                  opacity={index < 3 ? 1 : 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassPane>
  );
}
