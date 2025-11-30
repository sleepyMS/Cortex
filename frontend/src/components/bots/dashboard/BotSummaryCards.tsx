"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Activity, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

export function BotSummaryCards() {
  const t = useTranslations("LiveTrading.Dashboard.summary");

  // Mock Data
  const stats = [
    {
      title: t("totalEquity"),
      value: "$12,345.67",
      change: "+2.5%",
      icon: Wallet,
      trend: "up",
    },
    {
      title: t("activeBots"),
      value: "3",
      subtext: t("runningOfTotal", { total: 5 }),
      icon: Activity,
      trend: "neutral",
    },
    {
      title: t("todaysPnl"),
      value: "+$123.45",
      change: "+1.2%",
      icon: DollarSign,
      trend: "up",
    },
    {
      title: t("totalPnl"),
      value: "+$2,345.67",
      change: "+15.4%",
      icon: TrendingUp,
      trend: "up",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.change && (
                <span
                  className={
                    stat.trend === "up" ? "text-green-500" : "text-red-500"
                  }
                >
                  {stat.change}
                </span>
              )}
              {stat.subtext && <span>{stat.subtext}</span>}
              {stat.change && ` ${t("fromLastMonth")}`}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
