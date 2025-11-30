"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Activity, Bot, DollarSign, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { getBots } from "@/lib/api/bots";
import { Skeleton } from "@/components/ui/Skeleton";

export function BotSummaryCards() {
  const t = useTranslations("LiveTrading.Dashboard.summary");

  // 봇 목록 조회
  const { data: bots, isLoading } = useQuery({
    queryKey: ["bots"],
    queryFn: () => getBots(),
    refetchInterval: 10000, // 10초마다 자동 갱신
  });

  // 통계 계산
  const stats = {
    totalEquity:
      bots?.reduce(
        (sum, bot) => sum + (bot.currentBalance || bot.initialCapital),
        0
      ) || 0,
    activeBots: bots?.filter((bot) => bot.status === "active").length || 0,
    dailyPnl: bots?.reduce((sum, bot) => sum + bot.dailyPnl, 0) || 0,
    totalPnl: bots?.reduce((sum, bot) => sum + bot.totalPnl, 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: t("totalEquity"),
      value: `$${stats.totalEquity.toFixed(2)}`,
      description: t("totalEquityDesc"),
      icon: DollarSign,
      trend: null,
    },
    {
      title: t("activeBots"),
      value: stats.activeBots.toString(),
      description: t("activeBotsDesc", { total: bots?.length || 0 }),
      icon: Bot,
      trend: null,
    },
    {
      title: t("dailyPnL"),
      value: `$${Math.abs(stats.dailyPnl).toFixed(2)}`,
      description:
        stats.dailyPnl >= 0
          ? t("dailyPnLDescPositive")
          : t("dailyPnLDescNegative"),
      icon: Activity,
      trend: stats.dailyPnl >= 0 ? "up" : "down",
      trendValue:
        stats.dailyPnl >= 0
          ? `+${stats.dailyPnl.toFixed(2)}`
          : stats.dailyPnl.toFixed(2),
    },
    {
      title: t("totalPnL"),
      value: `$${Math.abs(stats.totalPnl).toFixed(2)}`,
      description:
        stats.totalPnl >= 0
          ? t("totalPnLDescPositive")
          : t("totalPnLDescNegative"),
      icon: TrendingUp,
      trend: stats.totalPnl >= 0 ? "up" : "down",
      trendValue:
        stats.totalPnl >= 0
          ? `+${stats.totalPnl.toFixed(2)}`
          : stats.totalPnl.toFixed(2),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                card.trend === "up"
                  ? "text-green-500"
                  : card.trend === "down"
                  ? "text-red-500"
                  : ""
              }`}
            >
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
